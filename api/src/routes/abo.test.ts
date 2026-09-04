import { beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../app.js';
import { getPrisma } from '../db.js';

const keinPrisma = {} as unknown as PrismaClient;
const hatDb = !!process.env.DATABASE_URL;

describe('abo — ohne Token → 401', () => {
  const app = buildApp({ prisma: keinPrisma, logger: false });
  for (const [method, url] of [
    ['GET', '/abo'],
    ['POST', '/abo'],
    ['PATCH', '/abo'],
    ['POST', '/abo/kuendigen'],
    ['GET', '/abo/kinder'],
  ] as const) {
    it(`${method} ${url} → 401`, async () => {
      const res = await app.inject({ method, url });
      expect(res.statusCode).toBe(401);
    });
  }
});

async function registriereUndLogin(app: ReturnType<typeof buildApp>, email: string) {
  const passwort = 'abo-test-pass-1234';
  await app.inject({
    method: 'POST',
    url: '/auth/registrieren',
    payload: { rolle: 'elternteil', name: 'Abo Test', klassenstufe: '—', email, passwort },
  });
  return (
    await app.inject({ method: 'POST', url: '/auth/login', payload: { email, passwort } })
  ).json().token as string;
}

describe.runIf(hatDb)('abo — Einzelplatz-Flow (Supabase)', () => {
  const app = buildApp({ logger: false });
  const prisma = getPrisma();
  let token = '';
  const auth = () => ({ authorization: `Bearer ${token}` });
  let aboRef = '';

  beforeAll(async () => {
    await app.ready();
    token = await registriereUndLogin(app, `abo+${crypto.randomUUID()}@abo.lesify.test`);
  });

  it('GET /abo ohne Abo → 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/abo', headers: auth() });
    expect(res.statusCode).toBe(404);
  });

  it('POST /abo legt Trial-Abo an', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/abo',
      headers: auth(),
      payload: { paket: 'premium', intervall: 'monatlich' },
    });
    expect(res.statusCode).toBe(201);
    const b = res.json();
    expect(b.status).toBe('test');
    expect(b.art).toBe('einzel');
    expect(b.sitze).toBe(1);
    expect(b.angebot).toBe('schuljahresstart_-20');
    expect(typeof b.trialEndetAm).toBe('string');
    expect(b.kontingente.nachrichten).toBe(250);

    const row = await prisma.abo.findFirstOrThrow({ where: { id: b.id } });
    expect(row.zahlungsanbieterRef).toMatch(/^fake_sub_/);
    aboRef = row.zahlungsanbieterRef!;
  });

  it('zweites POST /abo → 409 abo_vorhanden', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/abo',
      headers: auth(),
      payload: { paket: 'starter', intervall: 'monatlich' },
    });
    expect(res.statusCode).toBe(409);
    expect(res.json().fehler).toBe('abo_vorhanden');
  });

  it('PATCH /abo wechselt den Tarif', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/abo',
      headers: auth(),
      payload: { paket: 'infinite' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().paket).toBe('infinite');
    expect(res.json().kontingente.nachrichten).toBe(null);
  });

  it('Webhook trial_beendet → status aktiv, idempotent', async () => {
    const eins = await app.inject({
      method: 'POST',
      url: '/abo/webhook',
      payload: { typ: 'trial_beendet', aboRef },
    });
    expect(eins.json()).toEqual({ ok: true, status: 'aktiv' });

    const zwei = await app.inject({
      method: 'POST',
      url: '/abo/webhook',
      payload: { typ: 'trial_beendet', aboRef },
    });
    expect(zwei.json()).toEqual({ ok: true, unveraendert: true });

    const abo = await app.inject({ method: 'GET', url: '/abo', headers: auth() });
    expect(abo.json().status).toBe('aktiv');
  });

  it('Webhook mit unbekannter aboRef → 200, ignoriert', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/abo/webhook',
      payload: { typ: 'zahlung_erfolgreich', aboRef: 'fake_sub_gibtsnicht' },
    });
    expect(res.json()).toEqual({ ok: true, ignoriert: 'abo_unbekannt' });
  });

  it('Webhook mit unbekanntem Ereignistyp → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/abo/webhook',
      payload: { typ: 'irgendwas', aboRef },
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().fehler).toBe('ereignis_unbekannt');
  });

  it('kuendigen → gekuendigt, pausieren → pausiert', async () => {
    const k = await app.inject({ method: 'POST', url: '/abo/kuendigen', headers: auth() });
    expect(k.json().status).toBe('gekuendigt');
    const p = await app.inject({ method: 'POST', url: '/abo/pausieren', headers: auth() });
    expect(p.json().status).toBe('pausiert');
  });
});

describe.runIf(hatDb)('abo — Familien-Flow + Kind-Profile (Supabase)', () => {
  const app = buildApp({ logger: false });
  let token = '';
  const auth = () => ({ authorization: `Bearer ${token}` });

  beforeAll(async () => {
    await app.ready();
    token = await registriereUndLogin(app, `fam+${crypto.randomUUID()}@abo.lesify.test`);
    await app.inject({
      method: 'POST',
      url: '/abo',
      headers: auth(),
      payload: { paket: 'starter', intervall: 'monatlich', sitze: 3 },
    });
  });

  it('Abo ist familie mit 3 Sitzen', async () => {
    const res = await app.inject({ method: 'GET', url: '/abo', headers: auth() });
    expect(res.json().art).toBe('familie');
    expect(res.json().sitze).toBe(3);
  });

  it('3 Kind-Profile anlegen, das 4. wird abgelehnt', async () => {
    for (const n of ['A', 'B', 'C']) {
      const res = await app.inject({
        method: 'POST',
        url: '/abo/kinder',
        headers: auth(),
        payload: { name: `Kind ${n}`, klassenstufe: '7. Klasse' },
      });
      expect(res.statusCode).toBe(201);
    }
    const viert = await app.inject({
      method: 'POST',
      url: '/abo/kinder',
      headers: auth(),
      payload: { name: 'Kind D', klassenstufe: '7. Klasse' },
    });
    expect(viert.statusCode).toBe(409);
    expect(viert.json().fehler).toBe('sitze_ausgeschoepft');

    const liste = await app.inject({ method: 'GET', url: '/abo/kinder', headers: auth() });
    expect(liste.json()).toHaveLength(3);
  });

  it('PATCH /abo Sitzverringerung → 409, Sitzerhöhung ok', async () => {
    const runter = await app.inject({
      method: 'PATCH',
      url: '/abo',
      headers: auth(),
      payload: { sitze: 2 },
    });
    expect(runter.statusCode).toBe(409);
    expect(runter.json().fehler).toBe('sitzverringerung_zum_zeitraumende');

    const rauf = await app.inject({
      method: 'PATCH',
      url: '/abo',
      headers: auth(),
      payload: { sitze: 4 },
    });
    expect(rauf.statusCode).toBe(200);
    expect(rauf.json().sitze).toBe(4);
  });

  it('DELETE /abo/kinder/:id entfernt den Sitz', async () => {
    const liste = await app.inject({ method: 'GET', url: '/abo/kinder', headers: auth() });
    const kindId = liste.json()[0].id;
    const del = await app.inject({
      method: 'DELETE',
      url: `/abo/kinder/${kindId}`,
      headers: auth(),
    });
    expect(del.statusCode).toBe(200);
    expect(del.json()).toEqual({ ok: true });

    const nachher = await app.inject({ method: 'GET', url: '/abo/kinder', headers: auth() });
    expect(nachher.json()).toHaveLength(2);
  });

  it('DELETE eines fremden Kind-Profils → 404', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/abo/kinder/${crypto.randomUUID()}`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(404);
  });
});
