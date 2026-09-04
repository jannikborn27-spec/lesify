import { beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';

const hatDb = !!process.env.DATABASE_URL;

/**
 * Sicherheits-Kernprüfung (Phase 14): zwei echte Nutzer, jede Ressource von A
 * bleibt für B unsichtbar (`404`, kein `403`, keine Datenpreisgabe).
 */
describe.runIf(hatDb)('userId-Scoping über Nutzergrenzen (Supabase)', () => {
  const app = buildApp({ logger: false });

  async function neuerNutzer(tag: string) {
    const email = `scope-${tag}+${crypto.randomUUID()}@scope.lesify.test`;
    const passwort = 'scope-test-pass-1234';
    await app.inject({
      method: 'POST',
      url: '/auth/registrieren',
      payload: {
        rolle: 'schueler',
        name: tag,
        klassenstufe: '8. Klasse',
        email,
        passwort,
        einwilligung: true,
      },
    });
    const token = (
      await app.inject({ method: 'POST', url: '/auth/login', payload: { email, passwort } })
    ).json().token as string;
    return { headers: { authorization: `Bearer ${token}` } };
  }

  let a: { headers: Record<string, string> };
  let b: { headers: Record<string, string> };
  let fachId = '';
  let themaId = '';
  let chatId = '';
  let klausurId = '';
  let lernplanId = '';
  let testklausurId = '';

  beforeAll(async () => {
    await app.ready();
    a = await neuerNutzer('A');
    b = await neuerNutzer('B');

    fachId = (
      await app.inject({
        method: 'POST',
        url: '/faecher',
        headers: a.headers,
        payload: { name: 'A-Mathe', icon: 'mathematik' },
      })
    ).json().id;
    themaId = (
      await app.inject({
        method: 'POST',
        url: '/themen',
        headers: a.headers,
        payload: { fachId, name: 'A-Thema' },
      })
    ).json().id;
    chatId = (
      await app.inject({
        method: 'POST',
        url: '/chats',
        headers: a.headers,
        payload: { fachId, themaId },
      })
    ).json().id;
    const kl = (
      await app.inject({
        method: 'POST',
        url: '/klausuren',
        headers: a.headers,
        payload: { fachId, themaIds: [themaId], titel: 'A-Klausur', datum: '2026-12-01' },
      })
    ).json();
    klausurId = kl.klausur.id;
    lernplanId = kl.lernplan.id;
    testklausurId = kl.testklausur1.id;
  });

  const faelle = () => [
    ['GET', `/faecher/${fachId}/themen`],
    ['PATCH', `/faecher/${fachId}`, { farbe: 'rose' }],
    ['GET', `/themen/${themaId}`],
    ['GET', `/chats/${chatId}`],
    ['POST', `/chats/${chatId}/nachrichten`, { text: 'hallo' }],
    ['GET', `/klausuren/${klausurId}`],
    ['GET', `/klausuren/${klausurId}/lernplan`],
    ['GET', `/lernplaene/${lernplanId}`],
    ['PATCH', `/lernplaene/${lernplanId}/checklist`, { tag: 2, checked: true }],
    ['GET', `/testklausuren/${testklausurId}`],
  ];

  it('B sieht/ändert keine Ressource von A → 404', async () => {
    for (const [method, url, payload] of faelle()) {
      const res = await app.inject({
        method: method as 'GET' | 'POST' | 'PATCH',
        url: url as string,
        headers: b.headers,
        payload: payload as object | undefined,
      });
      expect(res.statusCode, `${method} ${url}`).toBe(404);
    }
  });

  it('A selbst kommt an dieselben Ressourcen ran', async () => {
    const themen = await app.inject({
      method: 'GET',
      url: `/faecher/${fachId}/themen`,
      headers: a.headers,
    });
    expect(themen.statusCode).toBe(200);
    const lp = await app.inject({
      method: 'GET',
      url: `/lernplaene/${lernplanId}`,
      headers: a.headers,
    });
    expect(lp.statusCode).toBe(200);
  });

  it('B sieht A nicht in der Suche', async () => {
    const res = await app.inject({ method: 'GET', url: '/suche?q=A-', headers: b.headers });
    expect(res.statusCode).toBe(200);
    expect(JSON.stringify(res.json())).not.toContain('A-Mathe');
    expect(JSON.stringify(res.json())).not.toContain('A-Klausur');
  });
});
