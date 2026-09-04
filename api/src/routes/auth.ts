import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { hashPasswort, pruefePasswort } from '../lib/password.js';
import { hashToken, inTagen, neuesToken } from '../lib/tokens.js';
import { env, istProd } from '../env.js';
import { userDTO } from '../lib/dto.js';

const TRIAL_TAGE = 14;
const EMAIL_TOKEN_TAGE = 7;
const RESET_TOKEN_TAGE = 1;

const email = z.string().trim().toLowerCase().email().max(320);
// Bei Registrierung/Reset gilt die Mindestlänge; beim Login wird nur geprüft.
const passwort = z.string().min(8).max(200);
const passwortLogin = z.string().min(1).max(200);

const registrierenBody = z.object({
  rolle: z.enum(['schueler', 'elternteil']),
  name: z.string().trim().min(1).max(120),
  klassenstufe: z.string().trim().min(1).max(40),
  email,
  passwort,
});
const emailBestaetigenBody = z.object({ token: z.string().min(1).max(500) });
const loginBody = z.object({
  email,
  passwort: passwortLogin,
  angemeldetBleiben: z.boolean().optional(),
});
const passwortVergessenBody = z.object({ email });
const passwortZuruecksetzenBody = z.object({
  token: z.string().min(1).max(500),
  neuesPasswort: passwort,
});

type ParseErgebnis = { success: true } | { success: false; error: z.ZodError };

function ungueltig(reply: FastifyReply, parsed: ParseErgebnis) {
  if (parsed.success) return null;
  return reply.code(400).send({ fehler: 'validierung', details: z.flattenError(parsed.error) });
}

// ein fester Hash, gegen den bei unbekannter E-Mail geprüft wird, damit die
// Antwortzeit von "User existiert" nicht unterscheidbar ist.
let dummyHashP: Promise<string> | undefined;
const dummyHash = () => (dummyHashP ??= hashPasswort('timing-abgleich-kein-echtes-passwort'));

export async function authRoutes(app: FastifyInstance): Promise<void> {
  const { prisma } = app;

  // ---- GET /auth/me -----------------------------------------------------
  // Aktuelle Sitzung prüfen (Frontend-Auth-Gate, Phase 11).
  app.get('/me', { preHandler: app.requireAuth }, async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return reply.code(401).send({ fehler: 'nicht_angemeldet' });
    return { user: userDTO(user) };
  });

  // ---- POST /auth/registrieren -------------------------------------------
  app.post('/registrieren', async (req, reply) => {
    const parsed = registrierenBody.safeParse(req.body);
    const bad = ungueltig(reply, parsed);
    if (bad) return bad;
    const body = parsed.data!;

    const existiert = await prisma.user.findUnique({ where: { email: body.email } });
    if (existiert) return reply.code(409).send({ fehler: 'email_vergeben' });

    const passwordHash = await hashPasswort(body.passwort);
    const token = neuesToken();

    const user = await prisma.user.create({
      data: {
        rolle: body.rolle,
        name: body.name,
        klassenstufe: body.klassenstufe,
        email: body.email,
        passwordHash,
        trialEndetAm: inTagen(TRIAL_TAGE),
        einstellungen: { create: {} },
        verificationTokens: {
          create: {
            typ: 'email_bestaetigung',
            tokenHash: token.hash,
            ablaeuftAm: inTagen(EMAIL_TOKEN_TAGE),
          },
        },
      },
    });

    // Kein Abo (Phase 0) — Tarifwahl läuft über POST /abo (Phase 9).
    // Mailversand ist zurückgestellt: außerhalb von production geben wir den
    // Bestätigungs-Token direkt zurück, damit der Flow testbar bleibt.
    return reply.code(201).send({
      user: userDTO(user),
      ...(istProd ? {} : { emailBestaetigungToken: token.roh }),
    });
  });

  // ---- POST /auth/email-bestaetigen -------------------------------------
  app.post('/email-bestaetigen', async (req, reply) => {
    const parsed = emailBestaetigenBody.safeParse(req.body);
    const bad = ungueltig(reply, parsed);
    if (bad) return bad;

    const vt = await prisma.verificationToken.findUnique({
      where: { tokenHash: hashToken(parsed.data!.token) },
    });
    if (
      !vt ||
      vt.typ !== 'email_bestaetigung' ||
      vt.eingeloestAm !== null ||
      vt.ablaeuftAm.getTime() < Date.now()
    ) {
      return reply.code(400).send({ fehler: 'token_ungueltig' });
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: vt.userId }, data: { emailVerifiedAt: new Date() } }),
      prisma.verificationToken.update({ where: { id: vt.id }, data: { eingeloestAm: new Date() } }),
    ]);
    return { ok: true };
  });

  // ---- POST /auth/login ------------------------------------------------
  app.post('/login', async (req, reply) => {
    const parsed = loginBody.safeParse(req.body);
    const bad = ungueltig(reply, parsed);
    if (bad) return bad;
    const body = parsed.data!;

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    let ok = false;
    if (user) {
      ok = await pruefePasswort(user.passwordHash, body.passwort);
    } else {
      // gegen einen Dummy-Hash prüfen, damit die Antwortzeit gleich bleibt
      await pruefePasswort(await dummyHash(), body.passwort);
    }

    if (!user || !ok) return reply.code(401).send({ fehler: 'anmeldedaten_falsch' });

    const tage = body.angemeldetBleiben ? env.SESSION_TAGE_ANGEMELDET_BLEIBEN : env.SESSION_TAGE;
    const token = neuesToken();
    const session = await prisma.session.create({
      data: { userId: user.id, tokenHash: token.hash, ablaeuftAm: inTagen(tage) },
    });

    return { token: token.roh, ablaeuftAm: session.ablaeuftAm, user: userDTO(user) };
  });

  // ---- POST /auth/logout --------------------------------------------------
  app.post('/logout', async (req, reply) => {
    const header = req.headers.authorization;
    const roh = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : undefined;
    if (roh) {
      await prisma.session.deleteMany({ where: { tokenHash: hashToken(roh) } });
    }
    return reply.send({ ok: true });
  });

  // ---- POST /auth/passwort-vergessen ------------------------------------
  app.post('/passwort-vergessen', async (req, reply) => {
    const parsed = passwortVergessenBody.safeParse(req.body);
    const bad = ungueltig(reply, parsed);
    if (bad) return bad;

    const user = await prisma.user.findUnique({ where: { email: parsed.data!.email } });
    let resetToken: string | undefined;
    if (user) {
      const token = neuesToken();
      await prisma.$transaction([
        // frühere, ungenutzte Reset-Token entwerten
        prisma.verificationToken.updateMany({
          where: { userId: user.id, typ: 'passwort_reset', eingeloestAm: null },
          data: { eingeloestAm: new Date() },
        }),
        prisma.verificationToken.create({
          data: {
            userId: user.id,
            typ: 'passwort_reset',
            tokenHash: token.hash,
            ablaeuftAm: inTagen(RESET_TOKEN_TAGE),
          },
        }),
      ]);
      resetToken = token.roh;
    }

    // immer 200 — keine Konto-Enumeration (§4)
    return reply.send({ ok: true, ...(istProd || !resetToken ? {} : { resetToken }) });
  });

  // ---- POST /auth/passwort-zuruecksetzen ------------------------------
  app.post('/passwort-zuruecksetzen', async (req, reply) => {
    const parsed = passwortZuruecksetzenBody.safeParse(req.body);
    const bad = ungueltig(reply, parsed);
    if (bad) return bad;
    const body = parsed.data!;

    const vt = await prisma.verificationToken.findUnique({
      where: { tokenHash: hashToken(body.token) },
    });
    if (
      !vt ||
      vt.typ !== 'passwort_reset' ||
      vt.eingeloestAm !== null ||
      vt.ablaeuftAm.getTime() < Date.now()
    ) {
      return reply.code(400).send({ fehler: 'token_ungueltig' });
    }

    const passwordHash = await hashPasswort(body.neuesPasswort);
    await prisma.$transaction([
      prisma.user.update({ where: { id: vt.userId }, data: { passwordHash } }),
      prisma.verificationToken.update({ where: { id: vt.id }, data: { eingeloestAm: new Date() } }),
      // alle Sessions beenden — erzwingt Neu-Anmeldung überall
      prisma.session.deleteMany({ where: { userId: vt.userId } }),
    ]);
    return { ok: true };
  });
}
