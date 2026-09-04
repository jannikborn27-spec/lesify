import { beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';

const hatDb = !!process.env.DATABASE_URL;

describe.runIf(hatDb)('DSGVO — Export & Konto-Löschung (Supabase)', () => {
  const app = buildApp({ logger: false });
  const email = `dsgvo+${crypto.randomUUID()}@dsgvo.lesify.test`;
  const passwort = 'dsgvo-test-pass-1234';
  let token = '';
  const auth = () => ({ authorization: `Bearer ${token}` });

  beforeAll(async () => {
    await app.ready();
    await app.inject({
      method: 'POST',
      url: '/auth/registrieren',
      payload: {
        rolle: 'schueler',
        name: 'DSGVO',
        klassenstufe: '8. Klasse',
        email,
        passwort,
        einwilligung: true,
      },
    });
    token = (
      await app.inject({ method: 'POST', url: '/auth/login', payload: { email, passwort } })
    ).json().token;
    await app.inject({
      method: 'POST',
      url: '/faecher',
      headers: auth(),
      payload: { name: 'Mathe', icon: 'mathematik' },
    });
  });

  it('registrieren speichert einwilligungAm', async () => {
    // indirekt über den Export geprüft (unten).
    expect(token).not.toBe('');
  });

  it('GET /user/export liefert alle Bereiche + Download-Header', async () => {
    const res = await app.inject({ method: 'GET', url: '/user/export', headers: auth() });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-disposition']).toContain('lesify-datenexport.json');
    const b = res.json();
    expect(b.user.email).toBe(email);
    expect(b.user.passwordHash).toBeUndefined();
    expect(b.user.einwilligungAm).toBeTruthy();
    expect(Array.isArray(b.faecher)).toBe(true);
    expect(b.faecher.length).toBe(1);
    for (const k of ['einstellungen', 'chats', 'lernzettel', 'klausuren', 'usage']) {
      expect(b).toHaveProperty(k);
    }
  });

  it('POST /user/loeschen mit falschem Passwort → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/user/loeschen',
      headers: auth(),
      payload: { passwort: 'falsch-falsch' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('POST /user/loeschen mit korrektem Passwort → Konto weg, Session ungültig', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/user/loeschen',
      headers: auth(),
      payload: { passwort },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().geloescht).toBe(true);

    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: auth() });
    expect(me.statusCode).toBe(401);
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, passwort },
    });
    expect(login.statusCode).toBe(401);
  });
});
