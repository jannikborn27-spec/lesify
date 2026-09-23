import { describe, expect, it } from 'vitest';
import type Stripe from 'stripe';
import { requestErlaubt, zugriffFuer, loeschDatum } from './aboZugriff.js';
import { STRIPE_STATUS, stripeEventAuswerten } from './zahlung.js';

const jetzt = new Date('2026-10-01T12:00:00Z');
const morgen = new Date('2026-10-02T12:00:00Z');
const gestern = new Date('2026-09-30T12:00:00Z');
const kind = { rolle: 'schueler' as const };
const eltern = { rolle: 'elternteil' as const };
const abo = (status: string, ende = morgen, zahlungOffenSeit: Date | null = null) =>
  ({ status, aktuellerZeitraumEnde: ende, zahlungOffenSeit }) as never;

describe('zugriffFuer — Kind-Zugriff je Abo-Status (Entscheidung 2026-09-23)', () => {
  it('test/aktiv → voll', () => {
    expect(zugriffFuer(kind, abo('test'), jetzt).zugriff).toBe('voll');
    expect(zugriffFuer(kind, abo('aktiv'), jetzt).zugriff).toBe('voll');
  });

  it('gekündigt, Zeitraum läuft noch → voll; abgelaufen → gesperrt', () => {
    expect(zugriffFuer(kind, abo('gekuendigt', morgen), jetzt).zugriff).toBe('voll');
    expect(zugriffFuer(kind, abo('gekuendigt', gestern), jetzt)).toEqual({
      zugriff: 'gesperrt',
      grund: 'abgelaufen',
      loeschungAm: null,
    });
  });

  it('pausiert → gesperrt', () => {
    expect(zugriffFuer(kind, abo('pausiert'), jetzt).grund).toBe('pausiert');
  });

  it('zahlung_offen → eingeschränkt, Löschung 30 Tage nach dem ersten Fehlschlag', () => {
    const seit = new Date('2026-09-20T00:00:00Z');
    const s = zugriffFuer(kind, abo('zahlung_offen', morgen, seit), jetzt);
    expect(s.zugriff).toBe('eingeschraenkt');
    expect(s.loeschungAm?.toISOString()).toBe('2026-10-20T00:00:00.000Z');
    expect(loeschDatum(seit).toISOString()).toBe('2026-10-20T00:00:00.000Z');
  });

  it('Eltern werden nie gesperrt, Konten ohne Abo auch nicht', () => {
    expect(zugriffFuer(eltern, abo('pausiert'), jetzt).zugriff).toBe('voll');
    expect(zugriffFuer(kind, null, jetzt).zugriff).toBe('voll');
  });
});

describe('requestErlaubt', () => {
  const gesperrt = { zugriff: 'gesperrt', grund: 'pausiert', loeschungAm: null } as const;
  const eingeschraenkt = {
    zugriff: 'eingeschraenkt',
    grund: 'zahlung_offen',
    loeschungAm: null,
  } as const;

  it('gesperrt: nur /auth/*', () => {
    expect(requestErlaubt(gesperrt, 'GET', '/auth/me')).toBe(true);
    expect(requestErlaubt(gesperrt, 'POST', '/auth/logout')).toBe(true);
    expect(requestErlaubt(gesperrt, 'GET', '/faecher')).toBe(false);
  });

  it('eingeschränkt: lesen ja, schreiben nein', () => {
    expect(requestErlaubt(eingeschraenkt, 'GET', '/faecher?x=1')).toBe(true);
    expect(requestErlaubt(eingeschraenkt, 'POST', '/chats')).toBe(false);
    expect(requestErlaubt(eingeschraenkt, 'PATCH', '/faecher/1')).toBe(false);
    expect(requestErlaubt(eingeschraenkt, 'POST', '/auth/logout')).toBe(true);
  });
});

describe('stripeEventAuswerten — Kündigung/Pause überschreiben nicht mehr mit „aktiv"', () => {
  const ev = (type: string, obj: Record<string, unknown>) =>
    ({ type, created: 1_790_000_000, data: { object: obj } }) as unknown as Stripe.Event;
  const status = (e: Stripe.Event) => STRIPE_STATUS[stripeEventAuswerten(e).statusQuelle ?? ''];

  it('updated + cancel_at_period_end → gekuendigt', () => {
    const e = ev('customer.subscription.updated', {
      id: 'sub_1',
      status: 'active',
      cancel_at_period_end: true,
      pause_collection: null,
    });
    expect(status(e)).toBe('gekuendigt');
  });

  it('updated + pause_collection → pausiert', () => {
    const e = ev('customer.subscription.updated', {
      id: 'sub_1',
      status: 'active',
      cancel_at_period_end: false,
      pause_collection: { behavior: 'void' },
    });
    expect(status(e)).toBe('pausiert');
  });

  it('updated ohne Flags → aktiv; past_due → zahlung_offen', () => {
    const basis = { id: 'sub_1', cancel_at_period_end: false, pause_collection: null };
    expect(status(ev('customer.subscription.updated', { ...basis, status: 'active' }))).toBe(
      'aktiv',
    );
    expect(status(ev('customer.subscription.updated', { ...basis, status: 'past_due' }))).toBe(
      'zahlung_offen',
    );
  });

  it('deleted liefert das tatsächliche Ende mit', () => {
    const r = stripeEventAuswerten(
      ev('customer.subscription.deleted', {
        id: 'sub_1',
        status: 'canceled',
        ended_at: 1_790_000_500,
      }),
    );
    expect(r.statusQuelle).toBe('canceled');
    expect(r.endetAm?.getTime()).toBe(1_790_000_500_000);
  });
});
