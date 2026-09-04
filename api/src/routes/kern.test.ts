import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../app.js';
import { getPrisma } from '../db.js';

const keinPrisma = {} as unknown as PrismaClient;

describe('kern-API — ohne Token → 401', () => {
  const app = buildApp({ prisma: keinPrisma, logger: false });
  for (const url of ['/faecher', '/themen', '/dateien', '/usage', '/user', '/suche?q=x']) {
    it(`GET ${url} → 401`, async () => {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode).toBe(401);
    });
  }
});

const hatDb = !!process.env.DATABASE_URL;

describe.runIf(hatDb)('kern-API — Flow (Supabase)', () => {
  const app = buildApp({ logger: false });
  const prisma = getPrisma();
  const email = `kern+${crypto.randomUUID()}@kern.lesify.test`;
  let token = '';
  const auth = () => ({ authorization: `Bearer ${token}` });

  beforeAll(async () => {
    await app.ready();
    await app.inject({
      method: 'POST',
      url: '/auth/registrieren',
      payload: {
        rolle: 'schueler',
        name: 'Kern Test',
        klassenstufe: '8. Klasse',
        email,
        passwort: 'kern-test-1234',
      },
    });
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, passwort: 'kern-test-1234' },
    });
    token = login.json().token;
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@kern.lesify.test' } } });
    await app.close();
    await prisma.$disconnect();
  });

  let fachId = '';
  let themaId = '';

  it('POST /faecher legt ein Fach an, GET /faecher listet es', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/faecher',
      headers: auth(),
      payload: { name: 'Mathematik', klasse: '8. Klasse', icon: 'mathematik' },
    });
    expect(res.statusCode).toBe(201);
    fachId = res.json().id;
    expect(res.json().initial).toBe('M');
    expect(res.json().farbe).toBeTruthy();

    const liste = await app.inject({ method: 'GET', url: '/faecher', headers: auth() });
    expect(liste.json().map((f: { id: string }) => f.id)).toContain(fachId);
  });

  it('POST /faecher: ungültige Farbe → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/faecher',
      headers: auth(),
      payload: { name: 'X', farbe: 'neongelb' },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().fehler).toBe('validierung');
  });

  it('PATCH /faecher/:id ändert nur die Farbe', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/faecher/${fachId}`,
      headers: auth(),
      payload: { farbe: 'violet' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().farbe).toBe('violet');
  });

  it('POST /themen + GET /themen/:id mit Stats', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/themen',
      headers: auth(),
      payload: { fachId, name: 'Bruchrechnung', beschreibung: 'Kürzen & Erweitern' },
    });
    expect(res.statusCode).toBe(201);
    themaId = res.json().id;
    expect(res.json().fachName).toBe('Mathematik');

    const detail = await app.inject({ method: 'GET', url: `/themen/${themaId}`, headers: auth() });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().stats).toEqual({
      chats: 0,
      lernzettel: 0,
      dateien: 0,
      klausuren: 0,
      testklausuren: 0,
    });

    const beiFach = await app.inject({
      method: 'GET',
      url: `/faecher/${fachId}/themen`,
      headers: auth(),
    });
    expect(beiFach.json().map((t: { id: string }) => t.id)).toContain(themaId);
  });

  it('POST /themen mit fremdem fachId → 404', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/themen',
      headers: auth(),
      payload: { fachId: crypto.randomUUID(), name: 'X' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('GET/PATCH /user', async () => {
    const g = await app.inject({ method: 'GET', url: '/user', headers: auth() });
    expect(g.json().name).toBe('Kern Test');
    const p = await app.inject({
      method: 'PATCH',
      url: '/user',
      headers: auth(),
      payload: { klassenstufe: '9. Klasse' },
    });
    expect(p.json().klassenstufe).toBe('9. Klasse');
  });

  it('GET/PATCH /user/einstellungen (einzeln)', async () => {
    const g = await app.inject({ method: 'GET', url: '/user/einstellungen', headers: auth() });
    expect(g.json().kiTonfall).toBe('freundlich');
    const p = await app.inject({
      method: 'PATCH',
      url: '/user/einstellungen',
      headers: auth(),
      payload: { kiTonfall: 'direkt' },
    });
    expect(p.json().kiTonfall).toBe('direkt');
    expect(p.json().woechentlicheZusammenfassung).toBe(false);
  });

  it('GET /usage — Premium-Kontingente während der Testphase', async () => {
    const res = await app.inject({ method: 'GET', url: '/usage', headers: auth() });
    expect(res.statusCode).toBe(200);
    const b = res.json();
    expect(b.planName).toBe('Premium');
    expect(b.nachrichten.used).toBe(0);
    expect(b.nachrichten.limit).toBe(250);
    expect(b.dateien.limit).toBe(50);
    expect(typeof b.resetDatum).toBe('string');
    expect(b.ring).toEqual({ ratio: 0, stufe: 'gruen' });
  });

  it('GET /suche findet das Fach nach Name', async () => {
    const res = await app.inject({ method: 'GET', url: '/suche?q=mathe', headers: auth() });
    expect(res.statusCode).toBe(200);
    const fachGruppe = res.json().find((g: { type: string }) => g.type === 'fach');
    expect(fachGruppe.items[0].fachId).toBe(fachId);
    expect(fachGruppe.items[0].fachName).toBe('Mathematik');
  });

  it('GET /themen/:id fremd/unbekannt → 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/themen/${crypto.randomUUID()}`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(404);
  });

  it('POST /kontakt: ok, Honeypot wird still geschluckt', async () => {
    const ok = await app.inject({
      method: 'POST',
      url: '/kontakt',
      payload: { name: 'A', email: 'a@b.de', thema: 'Frage', nachricht: 'Hallo' },
    });
    expect(ok.statusCode).toBe(200);
    const bot = await app.inject({
      method: 'POST',
      url: '/kontakt',
      payload: {
        name: 'A',
        email: 'a@b.de',
        thema: 'Frage',
        nachricht: 'Hallo',
        website: 'http://spam',
      },
    });
    expect(bot.statusCode).toBe(200); // Honeypot: still geschluckt, sieht aus wie Erfolg
  });
});
