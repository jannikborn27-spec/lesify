import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../app.js';
import { getPrisma } from '../db.js';

// Leeres prisma-Fake: die Validierungspfade antworten mit 400, bevor irgendein
// prisma.*-Aufruf passiert. Käme es doch dazu, wirft der Zugriff und der Test
// schlägt fehl.
const keinPrisma = {} as unknown as PrismaClient;

describe('auth — Eingabevalidierung (ohne DB)', () => {
  const app = buildApp({ prisma: keinPrisma, logger: false });

  it('registrieren: leerer Body → 400', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/registrieren', payload: {} });
    expect(res.statusCode).toBe(400);
    expect(res.json().fehler).toBe('validierung');
  });

  it('registrieren: zu kurzes Passwort → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/registrieren',
      payload: {
        rolle: 'schueler',
        name: 'A',
        klassenstufe: '8',
        email: 'a@b.de',
        passwort: 'kurz',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('registrieren: ungültige Rolle → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/registrieren',
      payload: {
        rolle: 'lehrer',
        name: 'A',
        klassenstufe: '8',
        email: 'a@b.de',
        passwort: 'langgenug1',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('login: fehlende Felder → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'a@b.de' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('me: ohne Token → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(res.statusCode).toBe(401);
  });

  it('passwort-zuruecksetzen: leerer Body → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/passwort-zuruecksetzen',
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});

// -------- Voller Flow gegen die echte DB (nur lokal, wenn api/.env gesetzt) --------
const hatDb = !!process.env.DATABASE_URL;

describe.runIf(hatDb)('auth — kompletter Flow (Supabase)', () => {
  const app = buildApp({ logger: false });
  const prisma = getPrisma();
  const email = `test+${crypto.randomUUID()}@auth.lesify.test`;
  const passwort = 'startpasswort-123';

  beforeAll(async () => {
    await app.ready();
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@auth.lesify.test' } } });
    await app.close();
    await prisma.$disconnect();
  });

  const reg = { rolle: 'schueler', name: 'Test Kind', klassenstufe: '8. Klasse', email, passwort };

  it('registrieren legt User + Trial an, gibt Bestätigungs-Token zurück', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/registrieren', payload: reg });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.email).toBe(email);
    expect(body.user.rolle).toBe('schueler');
    expect(new Date(body.user.trialEndetAm).getTime()).toBeGreaterThan(Date.now());
    expect(body.user.emailVerifiedAt).toBeNull();
    expect(typeof body.emailBestaetigungToken).toBe('string');
  });

  it('zweite Registrierung mit gleicher E-Mail → 409', async () => {
    const res = await app.inject({ method: 'POST', url: '/auth/registrieren', payload: reg });
    expect(res.statusCode).toBe(409);
    expect(res.json().fehler).toBe('email_vergeben');
  });

  it('login mit falschem Passwort → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, passwort: 'falsch' },
    });
    expect(res.statusCode).toBe(401);
  });

  let token = '';
  it('login mit korrektem Passwort → Token + /auth/me funktioniert', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, passwort },
    });
    expect(res.statusCode).toBe(200);
    token = res.json().token;
    expect(token).toBeTruthy();

    const me = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().user.email).toBe(email);
  });

  it('/auth/me mit Quatsch-Token → 401', async () => {
    const me = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: 'Bearer nicht-echt' },
    });
    expect(me.statusCode).toBe(401);
  });

  it('E-Mail-Bestätigung: Token einmalig einlösbar', async () => {
    const r1 = await app.inject({
      method: 'POST',
      url: '/auth/registrieren',
      payload: { ...reg, email: `v+${crypto.randomUUID()}@auth.lesify.test` },
    });
    const vToken = r1.json().emailBestaetigungToken as string;

    const ok = await app.inject({
      method: 'POST',
      url: '/auth/email-bestaetigen',
      payload: { token: vToken },
    });
    expect(ok.statusCode).toBe(200);

    const wieder = await app.inject({
      method: 'POST',
      url: '/auth/email-bestaetigen',
      payload: { token: vToken },
    });
    expect(wieder.statusCode).toBe(400);
  });

  it('passwort-vergessen: 200 mit Token für bekannte, 200 ohne Token für unbekannte E-Mail', async () => {
    const bekannt = await app.inject({
      method: 'POST',
      url: '/auth/passwort-vergessen',
      payload: { email },
    });
    expect(bekannt.statusCode).toBe(200);
    expect(typeof bekannt.json().resetToken).toBe('string');

    const unbekannt = await app.inject({
      method: 'POST',
      url: '/auth/passwort-vergessen',
      payload: { email: `nope+${crypto.randomUUID()}@auth.lesify.test` },
    });
    expect(unbekannt.statusCode).toBe(200);
    expect(unbekannt.json().resetToken).toBeUndefined();
  });

  it('passwort-zuruecksetzen: setzt neues Passwort, entwertet alte Sessions', async () => {
    const vergessen = await app.inject({
      method: 'POST',
      url: '/auth/passwort-vergessen',
      payload: { email },
    });
    const resetToken = vergessen.json().resetToken as string;

    const neu = 'ganz-neues-passwort-9';
    const res = await app.inject({
      method: 'POST',
      url: '/auth/passwort-zuruecksetzen',
      payload: { token: resetToken, neuesPasswort: neu },
    });
    expect(res.statusCode).toBe(200);

    // alter Session-Token gilt nicht mehr
    const meAlt = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(meAlt.statusCode).toBe(401);

    // altes Passwort schlägt fehl, neues klappt
    expect(
      (await app.inject({ method: 'POST', url: '/auth/login', payload: { email, passwort } }))
        .statusCode,
    ).toBe(401);
    expect(
      (await app.inject({ method: 'POST', url: '/auth/login', payload: { email, passwort: neu } }))
        .statusCode,
    ).toBe(200);
  });

  it('logout entwertet die Session', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, passwort: 'ganz-neues-passwort-9' },
    });
    const t = login.json().token as string;

    const out = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      headers: { authorization: `Bearer ${t}` },
    });
    expect(out.statusCode).toBe(200);

    const me = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: { authorization: `Bearer ${t}` },
    });
    expect(me.statusCode).toBe(401);
  });
});
