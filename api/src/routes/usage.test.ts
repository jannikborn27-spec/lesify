import { beforeAll, describe, expect, it } from 'vitest';
import { monatsSchluessel } from '@lesify/shared';
import { buildApp } from '../app.js';
import { getPrisma } from '../db.js';

const hatDb = !!process.env.DATABASE_URL;

describe.runIf(hatDb)('Usage-Limits — harte Durchsetzung (Supabase)', () => {
  const app = buildApp({ logger: false });
  const prisma = getPrisma();
  const email = `usage+${crypto.randomUUID()}@usage.lesify.test`;
  const passwort = 'usage-pass-1234';
  let token = '';
  let userId = '';
  let chatId = '';
  const auth = () => ({ authorization: `Bearer ${token}` });

  beforeAll(async () => {
    await app.ready();
    await app.inject({
      method: 'POST',
      url: '/auth/registrieren',
      payload: {
        rolle: 'schueler',
        name: 'Usage',
        klassenstufe: '8. Klasse',
        email,
        passwort,
        einwilligung: true,
      },
    });
    token = (
      await app.inject({ method: 'POST', url: '/auth/login', payload: { email, passwort } })
    ).json().token;
    userId = (await app.inject({ method: 'GET', url: '/auth/me', headers: auth() })).json().user.id;

    const fachId = (
      await app.inject({
        method: 'POST',
        url: '/faecher',
        headers: auth(),
        payload: { name: 'Mathe', icon: 'mathematik' },
      })
    ).json().id;
    const themaId = (
      await app.inject({
        method: 'POST',
        url: '/themen',
        headers: auth(),
        payload: { fachId, name: 'Bruchrechnung' },
      })
    ).json().id;
    chatId = (
      await app.inject({
        method: 'POST',
        url: '/chats',
        headers: auth(),
        payload: { fachId, themaId },
      })
    ).json().id;
  });

  it('erste Nachricht geht durch, Zähler steht auf 1', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/chats/${chatId}/nachrichten`,
      headers: auth(),
      payload: { text: 'Wie kürzt man 8/12?' },
    });
    expect(res.statusCode).toBe(200);
    const usage = await app.inject({ method: 'GET', url: '/usage', headers: auth() });
    expect(usage.json().nachrichten.used).toBe(1);
  });

  it('bei erreichtem Nachrichten-Limit → 403 limit_erreicht, andere Features frei', async () => {
    // Zähler künstlich auf das Premium-Limit (Trial) heben.
    await prisma.usage.upsert({
      where: { userId_monat: { userId, monat: monatsSchluessel() } },
      update: { nachrichtenUsed: 250 },
      create: {
        userId,
        monat: monatsSchluessel(),
        nachrichtenUsed: 250,
        nachrichtenLimit: 250,
        dateienLimit: 50,
        lernzettelLimit: 15,
        testklausurenLimit: 5,
      },
    });

    const blockiert = await app.inject({
      method: 'POST',
      url: `/chats/${chatId}/nachrichten`,
      headers: auth(),
      payload: { text: 'noch eine Frage' },
    });
    expect(blockiert.statusCode).toBe(403);
    expect(blockiert.json().fehler).toBe('limit_erreicht');
    expect(blockiert.json().details).toMatchObject({
      zaehler: 'nachrichten',
      used: 250,
      limit: 250,
    });

    // GET /usage zeigt den Ring auf Rot, aber der Endpunkt selbst bleibt erreichbar.
    const usage = await app.inject({ method: 'GET', url: '/usage', headers: auth() });
    expect(usage.statusCode).toBe(200);
    expect(usage.json().nachrichten.used).toBe(250);
    expect(usage.json().ring.stufe).toBe('rot');

    // Klausur anlegen (eigener Zähler) läuft weiter — Hard-Stop nur des Features.
    const faecher = await app.inject({ method: 'GET', url: '/faecher', headers: auth() });
    const fachId = faecher.json()[0].id;
    const themen = await app.inject({
      method: 'GET',
      url: `/faecher/${fachId}/themen`,
      headers: auth(),
    });
    const klausur = await app.inject({
      method: 'POST',
      url: '/klausuren',
      headers: auth(),
      payload: {
        fachId,
        themaIds: [themen.json()[0].id],
        titel: 'Mathe-Klausur',
        datum: '2026-12-01',
      },
    });
    expect(klausur.statusCode).toBe(201);
  });
});
