import { beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../app.js';
import { getPrisma } from '../db.js';
import { FakeZahlungsGateway } from '../lib/zahlung.js';

// Erzwingt den Fake-Zahlungsanbieter, unabhängig von einem lokal gesetzten
// STRIPE_SECRET_KEY (api/.env) — dieselbe Determinismus-Regel wie beim
// `prisma`-Stub oben. Sonst würden diese Tests bei vorhandenem Key echte
// Stripe-Calls auslösen und an `zahlungsanbieterRef` (erwartet `fake_sub_…`)
// scheitern.

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
    payload: {
      rolle: 'elternteil',
      name: 'Abo Test',
      klassenstufe: '—',
      email,
      passwort,
      einwilligung: true,
    },
  });
  return (
    await app.inject({ method: 'POST', url: '/auth/login', payload: { email, passwort } })
  ).json().token as string;
}

describe.runIf(hatDb)('abo — Einzelplatz-Flow (Supabase)', () => {
  const app = buildApp({ logger: false, zahlung: new FakeZahlungsGateway() });
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

  it('POST /abo/kinder auf Einzelplatz-Abo legt genau 1 Kind an, zweites → 409 sitze_ausgeschoepft', async () => {
    const erstes = await app.inject({
      method: 'POST',
      url: '/abo/kinder',
      headers: auth(),
      payload: { name: 'Einzel Kind', klassenstufe: '8. Klasse' },
    });
    expect(erstes.statusCode).toBe(201);

    const zweites = await app.inject({
      method: 'POST',
      url: '/abo/kinder',
      headers: auth(),
      payload: { name: 'Zweites Kind', klassenstufe: '8. Klasse' },
    });
    expect(zweites.statusCode).toBe(409);
    expect(zweites.json().fehler).toBe('sitze_ausgeschoepft');
    expect(zweites.json().details).toEqual({ sitze: 1, belegt: 1 });
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

  it('kuendigen → gekuendigt, pausieren → pausiert, reaktivieren → aktiv', async () => {
    const k = await app.inject({ method: 'POST', url: '/abo/kuendigen', headers: auth() });
    expect(k.json().status).toBe('gekuendigt');
    const r1 = await app.inject({ method: 'POST', url: '/abo/reaktivieren', headers: auth() });
    expect(r1.json().status).toBe('aktiv');

    const p = await app.inject({ method: 'POST', url: '/abo/pausieren', headers: auth() });
    expect(p.json().status).toBe('pausiert');
    const r2 = await app.inject({ method: 'POST', url: '/abo/reaktivieren', headers: auth() });
    expect(r2.json().status).toBe('aktiv');
  });

  it('reaktivieren auf einem bereits aktiven Abo → 409 abo_nicht_reaktivierbar', async () => {
    const res = await app.inject({ method: 'POST', url: '/abo/reaktivieren', headers: auth() });
    expect(res.statusCode).toBe(409);
    expect(res.json().fehler).toBe('abo_nicht_reaktivierbar');
  });

  it('gekuendigtes, wirklich abgelaufenes Abo blockiert kein neues POST /abo mehr', async () => {
    // Kündigen — solange der Zeitraum noch läuft, blockiert es weiterhin
    // (kein Vertragsende, kein Neuabschluss möglich).
    await app.inject({ method: 'POST', url: '/abo/kuendigen', headers: auth() });
    const nochBlockiert = await app.inject({
      method: 'POST',
      url: '/abo',
      headers: auth(),
      payload: { paket: 'starter', intervall: 'monatlich' },
    });
    expect(nochBlockiert.statusCode).toBe(409);
    expect(nochBlockiert.json().fehler).toBe('abo_vorhanden');

    // Zeitraum künstlich in die Vergangenheit setzen (simuliert echtes
    // Vertragsende) — ab hier darf ein neues Abo entstehen.
    await prisma.abo.update({
      where: { id: (await app.inject({ method: 'GET', url: '/abo', headers: auth() })).json().id },
      data: { aktuellerZeitraumEnde: new Date('2000-01-01') },
    });

    const neu = await app.inject({
      method: 'POST',
      url: '/abo',
      headers: auth(),
      payload: { paket: 'premium', intervall: 'monatlich' },
    });
    expect(neu.statusCode).toBe(201);
    expect(neu.json().paket).toBe('premium');
    expect(neu.json().status).toBe('test');

    // GET /abo zeigt jetzt deterministisch das neue Abo, nicht das alte
    // abgelaufene — `User.aboId` entscheidet, nicht `ownerUserId`.
    const aktuelles = await app.inject({ method: 'GET', url: '/abo', headers: auth() });
    expect(aktuelles.json().id).toBe(neu.json().id);
    expect(aktuelles.json().paket).toBe('premium');
  });
});

describe.runIf(hatDb)('abo — Familien-Flow + Kind-Profile (Supabase)', () => {
  const app = buildApp({ logger: false, zahlung: new FakeZahlungsGateway() });
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

  it('PATCH /abo Sitzverringerung wird geplant, Sitzerhöhung greift sofort', async () => {
    const runter = await app.inject({
      method: 'PATCH',
      url: '/abo',
      headers: auth(),
      payload: { sitze: 2 },
    });
    expect(runter.statusCode).toBe(200);
    expect(runter.json()).toMatchObject({ sitze: 3, geplanteSitze: 2 });

    const rauf = await app.inject({
      method: 'PATCH',
      url: '/abo',
      headers: auth(),
      payload: { sitze: 4 },
    });
    expect(rauf.statusCode).toBe(200);
    expect(rauf.json()).toMatchObject({ sitze: 4, geplanteSitze: null });
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

describe.runIf(hatDb)('abo — Eltern-Features Phase 12 (Supabase)', () => {
  const zahlung = new FakeZahlungsGateway();
  const app = buildApp({ logger: false, zahlung });
  const prisma = getPrisma();
  let token = '';
  const auth = () => ({ authorization: `Bearer ${token}` });
  let kindAId = '';
  let kindCId = '';
  const kindAEmail = `kindA+${crypto.randomUUID()}@abo.lesify.test`;

  beforeAll(async () => {
    await app.ready();
    token = await registriereUndLogin(app, `p12+${crypto.randomUUID()}@abo.lesify.test`);
    await app.inject({
      method: 'POST',
      url: '/abo',
      headers: auth(),
      payload: { paket: 'starter', intervall: 'monatlich', sitze: 3 },
    });
    for (const n of ['A', 'B', 'C']) {
      const r = await app.inject({
        method: 'POST',
        url: '/abo/kinder',
        headers: auth(),
        payload: { name: `Kind ${n}`, klassenstufe: '7. Klasse' },
      });
      if (n === 'A') kindAId = r.json().id;
      if (n === 'C') kindCId = r.json().id;
    }
  });

  it('Einladung setzt E-Mail + gibt Reset-Token, Kind kann Passwort setzen und sich einloggen', async () => {
    const einl = await app.inject({
      method: 'POST',
      url: `/abo/kinder/${kindAId}/einladung`,
      headers: auth(),
      payload: { email: kindAEmail },
    });
    expect(einl.statusCode).toBe(200);
    const resetToken = einl.json().resetToken;
    expect(typeof resetToken).toBe('string');

    const setz = await app.inject({
      method: 'POST',
      url: '/auth/passwort-zuruecksetzen',
      payload: { token: resetToken, neuesPasswort: 'kind-a-pass-1234' },
    });
    expect(setz.statusCode).toBe(200);

    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: kindAEmail, passwort: 'kind-a-pass-1234' },
    });
    expect(typeof login.json().token).toBe('string');
  });

  it('GET /abo/kinder markiert eingeladene vs. nicht eingeladene Kinder', async () => {
    const res = await app.inject({ method: 'GET', url: '/abo/kinder', headers: auth() });
    const kinder = res.json() as { id: string; eingeladen: boolean }[];
    expect(kinder.find((k) => k.id === kindAId)?.eingeladen).toBe(true);
    expect(kinder.find((k) => k.id === kindCId)?.eingeladen).toBe(false);
  });

  it('Kontext-Wechsel: /abo/kinder/:id/sitzung liefert eine Kind-Session', async () => {
    const s = await app.inject({
      method: 'POST',
      url: `/abo/kinder/${kindAId}/sitzung`,
      headers: auth(),
    });
    expect(s.statusCode).toBe(200);
    const kindToken = s.json().token;
    const wer = await app.inject({
      method: 'GET',
      url: '/user',
      headers: { authorization: `Bearer ${kindToken}` },
    });
    expect(wer.json().name).toBe('Kind A');
  });

  it('Zusammenfassung: aggregierte Kennzahlen + Fach-/Klausur-Metadaten, kein Chat-Wortlaut', async () => {
    // Fach + Klausur als Kind A anlegen (eigene Session), damit die
    // Metadaten-Listen (Name/Datum + Anzahl, kein Inhalt) etwas zu zeigen haben.
    const sitzung = await app.inject({
      method: 'POST',
      url: `/abo/kinder/${kindAId}/sitzung`,
      headers: auth(),
    });
    const kindAuth = { authorization: `Bearer ${sitzung.json().token}` };
    const fach = await app.inject({
      method: 'POST',
      url: '/faecher',
      headers: kindAuth,
      payload: { name: 'Physik' },
    });
    const fachId = fach.json().id;
    await app.inject({
      method: 'POST',
      url: '/themen',
      headers: kindAuth,
      payload: { fachId, name: 'Mechanik' },
    });
    await app.inject({
      method: 'POST',
      url: '/klausuren',
      headers: kindAuth,
      payload: {
        fachId,
        themaIds: [
          (
            await app.inject({
              method: 'GET',
              url: '/faecher/' + fachId + '/themen',
              headers: kindAuth,
            })
          ).json()[0].id,
        ],
        titel: 'Mechanik-Klausur',
        datum: '2027-01-15',
      },
    });

    const z = await app.inject({
      method: 'GET',
      url: `/abo/kinder/${kindAId}/zusammenfassung`,
      headers: auth(),
    });
    expect(z.statusCode).toBe(200);
    const b = z.json();
    expect(b.name).toBe('Kind A');
    expect(b).toMatchObject({ faecher: 1, themen: 1, anstehendeKlausuren: 1 });
    expect(b.faecherListe).toEqual([{ name: 'Physik', farbe: expect.any(String), themen: 1 }]);
    expect(b.anstehendeKlausurenListe).toEqual([{ fach: 'Physik', datum: '2027-01-15' }]);
    expect(JSON.stringify(b).toLowerCase()).not.toContain('wortlaut');
    expect(b).not.toHaveProperty('chats');
  });

  it('Sitzverringerung wird geplant und erst per Job (nach Kind-Löschung) wirksam', async () => {
    const patch = await app.inject({
      method: 'PATCH',
      url: '/abo',
      headers: auth(),
      payload: { sitze: 2 },
    });
    expect(patch.statusCode).toBe(200);
    expect(patch.json()).toMatchObject({ sitze: 3, geplanteSitze: 2 });

    // Zeitraum künstlich beenden.
    await prisma.abo.updateMany({
      where: {
        ownerUserId: (await app.inject({ method: 'GET', url: '/auth/me', headers: auth() })).json()
          .user.id,
      },
      data: { aktuellerZeitraumEnde: new Date('2020-01-01') },
    });

    const { geplanteAboAenderungenAnwenden } = await import('../lib/jobs.js');
    // `zahlung` explizit mitgeben — der Job ruft jetzt auch
    // `subscriptionAendern` auf, ohne das würde der Default
    // `getZahlungsGateway()` (echtes Stripe, falls STRIPE_SECRET_KEY
    // gesetzt ist) statt des Fakes hier greifen und an der
    // `fake_sub_…`-Referenz aus diesem Test scheitern.
    const warte = await geplanteAboAenderungenAnwenden(prisma, new Date(), zahlung);
    expect(warte.wartetAufKindLoeschung).toBeGreaterThanOrEqual(1);

    await app.inject({ method: 'DELETE', url: `/abo/kinder/${kindCId}`, headers: auth() });
    const jetzt = await geplanteAboAenderungenAnwenden(prisma, new Date(), zahlung);
    expect(jetzt.angewendet).toBeGreaterThanOrEqual(1);

    const abo = await app.inject({ method: 'GET', url: '/abo', headers: auth() });
    expect(abo.json()).toMatchObject({ sitze: 2, geplanteSitze: null });
  });
});
