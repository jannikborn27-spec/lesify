import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { aboArtFuerSitze, aboPreis, istGueltigeSitzzahl } from '@lesify/shared';
import { parse } from '../lib/validate.js';
import { oder404 } from '../lib/scope.js';
import { HttpError } from '../lib/http.js';
import { aboDTO } from '../lib/abo.js';

const paketEnum = z.enum(['starter', 'premium', 'infinite']);
const intervallEnum = z.enum(['monatlich', 'jaehrlich']);

const anlegenBody = z.object({
  paket: paketEnum,
  intervall: intervallEnum,
  sitze: z.number().int().min(1).max(4).optional(),
});

const aendernBody = z
  .object({
    paket: paketEnum.optional(),
    intervall: intervallEnum.optional(),
    sitze: z.number().int().min(1).max(4).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, 'nichts zu ändern');

const kindBody = z.object({
  name: z.string().trim().min(1).max(120),
  klassenstufe: z.string().trim().min(1).max(40),
});

export async function aboRoutes(app: FastifyInstance): Promise<void> {
  const { prisma, zahlung } = app;

  // ---- POST /abo/webhook — Callback vom Zahlungsanbieter, KEIN Login ----------
  app.post('/abo/webhook', async (req) => {
    // Phase 16: echten Roh-Body durchreichen (HMAC-Signaturprüfung). Der
    // Fake-Anbieter round-trippt über JSON.stringify.
    const roh = JSON.stringify(req.body ?? {});
    const sig = req.headers['stripe-signature'];
    const erg = zahlung.webhookVerarbeiten(roh, typeof sig === 'string' ? sig : undefined);

    const abo = await prisma.abo.findFirst({ where: { zahlungsanbieterRef: erg.aboRef } });
    if (!abo) return { ok: true, ignoriert: 'abo_unbekannt' };
    if (abo.status === erg.neuerStatus) return { ok: true, unveraendert: true };
    await prisma.abo.update({ where: { id: abo.id }, data: { status: erg.neuerStatus } });
    return { ok: true, status: erg.neuerStatus };
  });

  // ---- alles Weitere in eigenem Kontext mit Login-Zwang --------------------
  app.register(async (authed) => {
    authed.addHook('preHandler', app.requireAuth);

    const eigenesAbo = (userId: string) => prisma.abo.findFirst({ where: { ownerUserId: userId } });

    // GET /abo — aktuelles Abo des Vertragsinhabers
    authed.get('/abo', async (req) => {
      const abo = oder404(await eigenesAbo(req.userId));
      return aboDTO(abo);
    });

    // POST /abo — Checkout-Abschluss: Stripe-Subscription mit 14-Tage-Trial
    authed.post('/abo', async (req, reply) => {
      const body = parse(anlegenBody, req.body);
      const sitze = body.sitze ?? 1;
      const art = aboArtFuerSitze(sitze);
      if (!istGueltigeSitzzahl(art, sitze)) {
        throw new HttpError(400, 'validierung', { sitze: 'ungültige Sitzzahl' });
      }
      if (await eigenesAbo(req.userId)) throw new HttpError(409, 'abo_vorhanden');

      const preis = aboPreis({ paket: body.paket, art, sitze, intervall: body.intervall });
      const sub = await zahlung.subscriptionAnlegen({
        userId: req.userId,
        paket: body.paket,
        art,
        sitze,
        intervall: body.intervall,
        betragCent: preis.betragCent,
      });

      const abo = await prisma.abo.create({
        data: {
          ownerUserId: req.userId,
          paket: body.paket,
          art,
          sitze,
          intervall: body.intervall,
          angebot: preis.angebotKey,
          status: sub.status,
          trialEndetAm: sub.trialEndetAm,
          aktuellerZeitraumEnde: sub.aktuellerZeitraumEnde,
          zahlungsanbieterRef: sub.ref,
        },
      });
      await prisma.user.update({
        where: { id: req.userId },
        data: { aboId: abo.id, trialEndetAm: null },
      });

      return reply.code(201).send(aboDTO(abo));
    });

    // PATCH /abo — Tarif-/Intervall-/Sitzwechsel (Proration beim Anbieter)
    authed.patch('/abo', async (req) => {
      const body = parse(aendernBody, req.body);
      const abo = oder404(await eigenesAbo(req.userId));

      const paket = body.paket ?? (abo.paket as 'starter' | 'premium' | 'infinite');
      const intervall = body.intervall ?? (abo.intervall as 'monatlich' | 'jaehrlich');
      const sitze = body.sitze ?? abo.sitze;
      const art = aboArtFuerSitze(sitze);

      if (!istGueltigeSitzzahl(art, sitze)) {
        throw new HttpError(400, 'validierung', { sitze: 'ungültige Sitzzahl' });
      }
      // Sitzverringerung wird erst zum Zeitraumende wirksam — volle Mechanik
      // (Auswahl welcher Sitz, Inhalts-Löschung) folgt in Phase 12.
      if (sitze < abo.sitze) {
        throw new HttpError(409, 'sitzverringerung_zum_zeitraumende', {
          wirksamAm: abo.aktuellerZeitraumEnde,
        });
      }

      const preis = aboPreis({ paket, art, sitze, intervall });
      const { aktuellerZeitraumEnde } = await zahlung.subscriptionAendern(
        abo.zahlungsanbieterRef ?? abo.id,
        { intervall, betragCent: preis.betragCent },
      );

      const neu = await prisma.abo.update({
        where: { id: abo.id },
        data: { paket, intervall, sitze, art, angebot: preis.angebotKey, aktuellerZeitraumEnde },
      });
      return aboDTO(neu);
    });

    // POST /abo/kuendigen — zum Zeitraumende, kein sofortiger Zugriffsverlust
    authed.post('/abo/kuendigen', async (req) => {
      const abo = oder404(await eigenesAbo(req.userId));
      await zahlung.subscriptionKuendigen(abo.zahlungsanbieterRef ?? abo.id);
      const neu = await prisma.abo.update({
        where: { id: abo.id },
        data: { status: 'gekuendigt' },
      });
      return aboDTO(neu);
    });

    // POST /abo/pausieren — Sommerpause, Inhalte bleiben
    authed.post('/abo/pausieren', async (req) => {
      const abo = oder404(await eigenesAbo(req.userId));
      await zahlung.subscriptionPausieren(abo.zahlungsanbieterRef ?? abo.id);
      const neu = await prisma.abo.update({
        where: { id: abo.id },
        data: { status: 'pausiert' },
      });
      return aboDTO(neu);
    });

    // ---- Kind-Profile im Familien-Abo (max. Abo.sitze) --------------------
    authed.get('/abo/kinder', async (req) => {
      const kinder = await prisma.user.findMany({
        where: { parentUserId: req.userId },
        orderBy: { createdAt: 'asc' },
      });
      return kinder.map((k) => ({ id: k.id, name: k.name, klassenstufe: k.klassenstufe }));
    });

    authed.post('/abo/kinder', async (req, reply) => {
      const body = parse(kindBody, req.body);
      const abo = oder404(await eigenesAbo(req.userId));
      if (abo.art !== 'familie') throw new HttpError(409, 'kein_familienabo');

      const belegt = await prisma.user.count({ where: { parentUserId: req.userId } });
      if (belegt + 1 > abo.sitze) {
        throw new HttpError(409, 'sitze_ausgeschoepft', { sitze: abo.sitze, belegt });
      }

      const kind = await prisma.user.create({
        data: {
          name: body.name,
          klassenstufe: body.klassenstufe,
          rolle: 'schueler',
          parentUserId: req.userId,
          aboId: abo.id,
          passwordHash: 'kind:kein-login', // Phase 12: echte Einladung/Passwort-Setzung
          einstellungen: { create: {} },
        },
      });
      return reply
        .code(201)
        .send({ id: kind.id, name: kind.name, klassenstufe: kind.klassenstufe });
    });

    authed.delete<{ Params: { id: string } }>('/abo/kinder/:id', async (req) => {
      const kind = oder404(
        await prisma.user.findFirst({ where: { id: req.params.id, parentUserId: req.userId } }),
      );
      // Cascade löscht alle Inhalte des Sitzes (Phase-0-Entscheidung).
      await prisma.user.delete({ where: { id: kind.id } });
      return { ok: true };
    });
  });
}
