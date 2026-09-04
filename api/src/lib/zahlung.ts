import { randomUUID } from 'node:crypto';
import type { AboStatus } from '@prisma/client';
import {
  ABO_TRIAL_TAGE,
  type AboArtKey,
  type AboIntervallKey,
  type AboPaketKey,
} from '@lesify/shared';
import { env } from '../env.js';
import { HttpError } from './http.js';

export interface SubAnlegenInput {
  userId: string;
  paket: AboPaketKey;
  art: AboArtKey;
  sitze: number;
  intervall: AboIntervallKey;
  betragCent: number;
}

export interface SubZustand {
  /** Referenz beim Zahlungsanbieter (Stripe Customer/Subscription) */
  ref: string;
  status: AboStatus;
  trialEndetAm: Date | null;
  aktuellerZeitraumEnde: Date;
}

export interface WebhookErgebnis {
  aboRef: string;
  neuerStatus: AboStatus;
  typ: string;
}

export interface ZahlungsGateway {
  subscriptionAnlegen(input: SubAnlegenInput): Promise<SubZustand>;
  subscriptionAendern(
    ref: string,
    input: { intervall: AboIntervallKey; betragCent: number },
  ): Promise<{ aktuellerZeitraumEnde: Date }>;
  subscriptionKuendigen(ref: string): Promise<void>;
  subscriptionPausieren(ref: string): Promise<void>;
  webhookVerarbeiten(rohBody: string, signatur: string | undefined): WebhookErgebnis;
}

function tageAddieren(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function zeitraumEnde(ab: Date, intervall: AboIntervallKey): Date {
  const r = new Date(ab);
  if (intervall === 'jaehrlich') r.setFullYear(r.getFullYear() + 1);
  else r.setMonth(r.getMonth() + 1);
  return r;
}

const WEBHOOK_STATUS: Record<string, AboStatus> = {
  zahlung_erfolgreich: 'aktiv',
  trial_beendet: 'aktiv',
  abo_reaktiviert: 'aktiv',
  zahlung_fehlgeschlagen: 'zahlung_offen',
  abo_gekuendigt: 'gekuendigt',
  abo_pausiert: 'pausiert',
};

/**
 * Deterministischer Platzhalter-Zahlungsanbieter (wie die Platzhalter-KI in
 * Phase 4). Legt keine echten Stripe-Objekte an, bildet aber Trial → Abbuchung,
 * Wechsel, Kündigung, Pause und Webhooks vollständig ab, damit die /abo-API
 * jetzt schon end-to-end testbar ist. Echtes Stripe-Adapter: Phase 16.
 */
export class FakeZahlungsGateway implements ZahlungsGateway {
  async subscriptionAnlegen(input: SubAnlegenInput): Promise<SubZustand> {
    const jetzt = new Date();
    const trialEndetAm = tageAddieren(jetzt, ABO_TRIAL_TAGE);
    return {
      ref: `fake_sub_${randomUUID()}`,
      status: 'test',
      trialEndetAm,
      // erster echter Abrechnungszeitraum beginnt nach dem Trial
      aktuellerZeitraumEnde: zeitraumEnde(trialEndetAm, input.intervall),
    };
  }

  async subscriptionAendern(
    _ref: string,
    input: { intervall: AboIntervallKey; betragCent: number },
  ): Promise<{ aktuellerZeitraumEnde: Date }> {
    return { aktuellerZeitraumEnde: zeitraumEnde(new Date(), input.intervall) };
  }

  async subscriptionKuendigen(): Promise<void> {
    // no-op: bei Stripe `cancel_at_period_end = true`
  }

  async subscriptionPausieren(): Promise<void> {
    // no-op: bei Stripe `pause_collection`
  }

  webhookVerarbeiten(rohBody: string, signatur: string | undefined): WebhookErgebnis {
    // TODO Phase 16: echte Stripe-Signaturprüfung (HMAC über den Roh-Body).
    if (env.STRIPE_WEBHOOK_SECRET && signatur !== env.STRIPE_WEBHOOK_SECRET) {
      throw new HttpError(400, 'signatur_ungueltig');
    }
    let payload: { typ?: unknown; aboRef?: unknown };
    try {
      payload = JSON.parse(rohBody) as typeof payload;
    } catch {
      throw new HttpError(400, 'body_ungueltig');
    }
    const typ = String(payload.typ ?? '');
    const aboRef = String(payload.aboRef ?? '');
    const neuerStatus = WEBHOOK_STATUS[typ];
    if (!aboRef || !neuerStatus) throw new HttpError(400, 'ereignis_unbekannt', { typ });
    return { aboRef, neuerStatus, typ };
  }
}

let instanz: ZahlungsGateway | undefined;

/** Prozessweiter Gateway (in Tests via buildApp ersetzbar). */
export function getZahlungsGateway(): ZahlungsGateway {
  // TODO Phase 16: bei gesetztem STRIPE_SECRET_KEY das echte Stripe-Adapter.
  if (!instanz) instanz = new FakeZahlungsGateway();
  return instanz;
}
