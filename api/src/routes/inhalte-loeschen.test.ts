import { beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';

const hatDb = !!process.env.DATABASE_URL;

/**
 * Inhalte löschen (Einstellungen → „Meine Inhalte", 2026-09-30): DELETE auf
 * Fach/Thema/Klausur/Chat/Lernzettel, Themen-Bereinigung in Klausuren,
 * fremde Inhalte → 404, Usage bleibt.
 */
describe.runIf(hatDb)('Inhalte löschen (Supabase)', () => {
  const app = buildApp({ logger: false });

  async function neuerNutzer(tag: string) {
    const email = `del-${tag}+${crypto.randomUUID()}@del.lesify.test`;
    const passwort = 'del-test-pass-1234';
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
    return { authorization: `Bearer ${token}` };
  }

  let a: Record<string, string>;
  let b: Record<string, string>;
  let fachId = '';

  const post = (url: string, payload: Record<string, unknown>, headers = a) =>
    app.inject({ method: 'POST', url, headers, payload });
  const del = (url: string, headers = a) => app.inject({ method: 'DELETE', url, headers });

  beforeAll(async () => {
    await app.ready();
    a = await neuerNutzer('A');
    b = await neuerNutzer('B');
    fachId = (await post('/faecher', { name: 'Löschtest' })).json().id;
  });

  it('Chat löschen: 204, danach 404; fremder Nutzer bekommt 404', async () => {
    const themaId = (await post('/themen', { fachId, name: 'Chat-Thema' })).json().id;
    const chatId = (await post('/chats', { fachId, themaId })).json().id;
    expect((await del(`/chats/${chatId}`, b)).statusCode).toBe(404);
    expect((await del(`/chats/${chatId}`)).statusCode).toBe(204);
    expect(
      (await app.inject({ method: 'GET', url: `/chats/${chatId}`, headers: a })).statusCode,
    ).toBe(404);
  });

  it('Thema löschen: Klausur nur mit diesem Thema fällt weg, gemischte behält die übrigen', async () => {
    const t1 = (await post('/themen', { fachId, name: 'T1' })).json().id;
    const t2 = (await post('/themen', { fachId, name: 'T2' })).json().id;
    const nurT1 = (
      await post('/klausuren', { fachId, themaIds: [t1], titel: 'Nur T1', datum: '2026-12-01' })
    ).json().klausur.id;
    const gemischt = (
      await post('/klausuren', {
        fachId,
        themaIds: [t1, t2],
        titel: 'T1+T2',
        datum: '2026-12-02',
      })
    ).json().klausur.id;

    const res = await del(`/themen/${t1}`);
    expect(res.statusCode).toBe(200);
    expect(res.json().klausurenGeloescht).toBe(1);

    const get = (id: string) => app.inject({ method: 'GET', url: `/klausuren/${id}`, headers: a });
    expect((await get(nurT1)).statusCode).toBe(404);
    const rest = await get(gemischt);
    expect(rest.statusCode).toBe(200);
    expect(rest.json().themaIds ?? rest.json().klausur?.themaIds).toEqual([t2]);
  });

  it('Klausur löschen: 204, danach 404', async () => {
    const t = (await post('/themen', { fachId, name: 'K-Thema' })).json().id;
    const kId = (
      await post('/klausuren', { fachId, themaIds: [t], titel: 'Weg', datum: '2026-12-03' })
    ).json().klausur.id;
    expect((await del(`/klausuren/${kId}`)).statusCode).toBe(204);
    expect(
      (await app.inject({ method: 'GET', url: `/klausuren/${kId}`, headers: a })).statusCode,
    ).toBe(404);
  });

  it('Fach löschen: alles darin weg, Usage bleibt', async () => {
    const usageVorher = (await app.inject({ method: 'GET', url: '/usage', headers: a })).json();
    expect((await del(`/faecher/${fachId}`, b)).statusCode).toBe(404);
    expect((await del(`/faecher/${fachId}`)).statusCode).toBe(204);
    const faecher = (await app.inject({ method: 'GET', url: '/faecher', headers: a })).json() as {
      id: string;
    }[];
    expect(faecher.some((f) => f.id === fachId)).toBe(false);
    const usageNachher = (await app.inject({ method: 'GET', url: '/usage', headers: a })).json();
    expect(usageNachher).toEqual(usageVorher);
  });
});
