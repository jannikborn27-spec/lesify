import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import type { AboStatus } from '@prisma/client';
import {
  ABO_TRIAL_TAGE,
  type AboArtKey,
  type AboIntervallKey,
  type AboPaketKey,
} from '@lesify/shared';
import { env, istProd } from '../env.js';
import { HttpError } from './http.js';

export interface SubAnlegenInput {
  userId: string;
  email?: string;
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
  /**
   * Nur beim echten Stripe-Adapter gesetzt: Client Secret fürs Frontend
   * (`stripe.confirmSetup`/`confirmPayment`). Bei Trial ohne Sofortbelastung
   * ein SetupIntent-Secret (Präfix `seti_…`), sonst ein PaymentIntent-Secret
   * (Präfix `pi_…`) — das Frontend unterscheidet daran, welche Confirm-
   * Methode zu rufen ist.
   */
  clientSecret?: string | null;
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
  /**
   * Hebt eine Kündigung (`cancel_at_period_end`) oder Pause auf. Liefert den
   * tatsächlichen Status danach zurück — bei Stripe **nicht** automatisch
   * `aktiv`: ein während der Trial-Phase gekündigtes/pausiertes Abo bleibt
   * nach der Reaktivierung `trialing` (→ `test`), bis die Trial endet. Der
   * Aufrufer persistiert genau diesen Status, statt ihn zu erraten
   * (Bug 2026-09-17: `POST /abo/reaktivieren` schrieb bisher hart `aktiv`).
   */
  subscriptionReaktivieren(ref: string): Promise<{ status: AboStatus }>;
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

  async subscriptionReaktivieren(): Promise<{ status: AboStatus }> {
    // Fake kennt keine Trial-Historie über den Aufruf hinweg (keine
    // gespeicherten Subscription-Objekte) — anders als beim echten
    // Stripe-Adapter simuliert er hier weiterhin schlicht `aktiv`.
    return { status: 'aktiv' };
  }

  webhookVerarbeiten(rohBody: string): WebhookErgebnis {
    // Echte Signaturprüfung (HMAC über den Roh-Body) macht jetzt
    // `StripeZahlungsGateway.webhookVerarbeiten` — der Fake bleibt bewusst
    // ungeprüft, er simuliert nur die Business-Logik fürs Testen/lokale Dev.
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

/** Jede Lesify-Subscription hat genau ein Item (siehe `preisDaten`). */
function ersteItem(sub: Stripe.Subscription): Stripe.SubscriptionItem {
  const item = sub.items.data[0];
  if (!item) throw new HttpError(500, 'stripe_subscription_ohne_item');
  return item;
}

/** Stripe-Produkt je Paket — feste, sprechende IDs statt Dashboard-Pflege. */
const STRIPE_PRODUKT_ID: Record<AboPaketKey, string> = {
  starter: 'lesify_starter',
  premium: 'lesify_premium',
  infinite: 'lesify_infinite',
};
const STRIPE_PRODUKT_NAME: Record<AboPaketKey, string> = {
  starter: 'Lesify Starter',
  premium: 'Lesify Premium',
  infinite: 'Lesify Infinite',
};

/** Mappt Stripe-Webhook-Event-Typen auf unseren internen `AboStatus`. */
const STRIPE_STATUS: Record<string, AboStatus> = {
  active: 'aktiv',
  trialing: 'test',
  canceled: 'gekuendigt',
  paused: 'pausiert',
  past_due: 'zahlung_offen',
  unpaid: 'zahlung_offen',
};

/**
 * Echtes Stripe-Adapter (Phase 16). Aktiv, sobald `STRIPE_SECRET_KEY` gesetzt
 * ist (siehe `getZahlungsGateway`). Preise werden dynamisch über
 * `price_data` angelegt (siehe `aboPreis()` in `@lesify/shared`) — kein
 * manuell zu pflegender Preis-Katalog im Stripe-Dashboard nötig, nur drei
 * feste Produkte (eines je Paket), die sich beim ersten Gebrauch selbst
 * anlegen.
 */
export class StripeZahlungsGateway implements ZahlungsGateway {
  private readonly stripe: Stripe;
  private readonly produkteBereit = new Set<AboPaketKey>();

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey);
  }

  private async produktId(paket: AboPaketKey): Promise<string> {
    const id = STRIPE_PRODUKT_ID[paket];
    if (this.produkteBereit.has(paket)) return id;
    try {
      await this.stripe.products.retrieve(id);
    } catch {
      await this.stripe.products.create({ id, name: STRIPE_PRODUKT_NAME[paket] });
    }
    this.produkteBereit.add(paket);
    return id;
  }

  private preisDaten(
    produkt: string,
    intervall: AboIntervallKey,
    betragCent: number,
  ): Stripe.SubscriptionCreateParams.Item.PriceData {
    return {
      currency: 'eur',
      unit_amount: betragCent,
      recurring: { interval: intervall === 'jaehrlich' ? 'year' : 'month' },
      product: produkt,
    };
  }

  async subscriptionAnlegen(input: SubAnlegenInput): Promise<SubZustand> {
    const produkt = await this.produktId(input.paket);
    const customer = await this.stripe.customers.create({
      email: input.email,
      metadata: { userId: input.userId },
    });

    const sub = await this.stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price_data: this.preisDaten(produkt, input.intervall, input.betragCent) }],
      trial_period_days: ABO_TRIAL_TAGE,
      // Ohne `trial_settings.end_behavior` erzeugt Stripe bei einer
      // Trial-Subscription KEIN `pending_setup_intent` — die Trial-Rechnung
      // ist 0 € und braucht serverseitig keine Zahlungsbestätigung, also
      // bleibt `clientSecret` null und das Frontend kann `confirmSetup` nie
      // aufrufen (checkout.js wirft dann `kein_client_secret`). Erst
      // `missing_payment_method: 'cancel'` weist Stripe an, die Zahlungsdaten
      // schon jetzt zu verlangen und dafür den SetupIntent auszustellen.
      trial_settings: { end_behavior: { missing_payment_method: 'cancel' } },
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['pending_setup_intent', 'latest_invoice.confirmation_secret'],
      metadata: { userId: input.userId, paket: input.paket, sitze: String(input.sitze) },
    });

    const setupIntent = sub.pending_setup_intent as Stripe.SetupIntent | null;
    const invoice = sub.latest_invoice as Stripe.Invoice | null;
    const clientSecret =
      setupIntent?.client_secret ?? invoice?.confirmation_secret?.client_secret ?? null;
    const item = ersteItem(sub);

    return {
      ref: sub.id,
      status: STRIPE_STATUS[sub.status] ?? 'test',
      trialEndetAm: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      aktuellerZeitraumEnde: new Date(item.current_period_end * 1000),
      clientSecret,
    };
  }

  async subscriptionAendern(
    ref: string,
    input: { intervall: AboIntervallKey; betragCent: number },
  ): Promise<{ aktuellerZeitraumEnde: Date }> {
    const sub = await this.stripe.subscriptions.retrieve(ref);
    const item = ersteItem(sub);
    const produkt =
      typeof item.price.product === 'string' ? item.price.product : item.price.product.id;

    const aktualisiert = await this.stripe.subscriptions.update(ref, {
      items: [
        { id: item.id, price_data: this.preisDaten(produkt, input.intervall, input.betragCent) },
      ],
      proration_behavior: 'create_prorations',
    });
    return { aktuellerZeitraumEnde: new Date(ersteItem(aktualisiert).current_period_end * 1000) };
  }

  async subscriptionKuendigen(ref: string): Promise<void> {
    await this.stripe.subscriptions.update(ref, { cancel_at_period_end: true });
  }

  async subscriptionPausieren(ref: string): Promise<void> {
    await this.stripe.subscriptions.update(ref, { pause_collection: { behavior: 'void' } });
  }

  async subscriptionReaktivieren(ref: string): Promise<{ status: AboStatus }> {
    // Hebt beides gleichzeitig auf — je nachdem, ob das Abo gekündigt
    // (`cancel_at_period_end`) oder pausiert (`pause_collection`) war,
    // greift nur die jeweils passende Option; die andere ist ein No-op.
    const sub = await this.stripe.subscriptions.update(ref, {
      cancel_at_period_end: false,
      pause_collection: null,
    });
    // Wichtig: NICHT hart `aktiv` zurückgeben. Ein während der Trial-Phase
    // gekündigtes/pausiertes Abo ist danach weiterhin `trialing`, bis die
    // Trial regulär endet — Stripes echter Status entscheidet.
    return { status: STRIPE_STATUS[sub.status] ?? 'aktiv' };
  }

  webhookVerarbeiten(rohBody: string, signatur: string | undefined): WebhookErgebnis {
    if (!env.STRIPE_WEBHOOK_SECRET) throw new HttpError(500, 'webhook_secret_fehlt');
    if (!signatur) throw new HttpError(400, 'signatur_fehlt');

    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rohBody, signatur, env.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw new HttpError(400, 'signatur_ungueltig');
    }

    const { aboRef, statusQuelle } = ((): {
      aboRef: string | null;
      statusQuelle: string | null;
    } => {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const sub = event.data.object as Stripe.Subscription;
          return { aboRef: sub.id, statusQuelle: sub.status };
        }
        case 'customer.subscription.deleted': {
          const sub = event.data.object as Stripe.Subscription;
          return { aboRef: sub.id, statusQuelle: 'canceled' };
        }
        case 'invoice.paid':
        case 'invoice.payment_succeeded': {
          const inv = event.data.object as Stripe.Invoice;
          const subRef = inv.parent?.subscription_details?.subscription;
          const ref = typeof subRef === 'string' ? subRef : (subRef?.id ?? null);
          return { aboRef: ref, statusQuelle: 'active' };
        }
        case 'invoice.payment_failed': {
          const inv = event.data.object as Stripe.Invoice;
          const subRef = inv.parent?.subscription_details?.subscription;
          const ref = typeof subRef === 'string' ? subRef : (subRef?.id ?? null);
          return { aboRef: ref, statusQuelle: 'past_due' };
        }
        default:
          return { aboRef: null, statusQuelle: null };
      }
    })();

    const neuerStatus = statusQuelle ? STRIPE_STATUS[statusQuelle] : undefined;
    if (!aboRef || !neuerStatus)
      throw new HttpError(400, 'ereignis_unbekannt', { typ: event.type });
    return { aboRef, neuerStatus, typ: event.type };
  }
}

let instanz: ZahlungsGateway | undefined;

/** Prozessweiter Gateway (in Tests via buildApp ersetzbar). */
export function getZahlungsGateway(): ZahlungsGateway {
  if (!instanz) {
    if (env.STRIPE_SECRET_KEY) {
      instanz = new StripeZahlungsGateway(env.STRIPE_SECRET_KEY);
    } else {
      // In Produktion würde das bedeuten: POST /abo antwortet 201 mit einer
      // in der DB angelegten Abo-Zeile, aber ohne clientSecret — checkout.js
      // kann dann nie `confirmSetup`/`confirmPayment` aufrufen und zeigt dem
      // Nutzer einen generischen Fehler, ohne dass am eigentlichen Code etwas
      // kaputt ist. Laut lautes Log statt eines stillen Fallbacks, damit das
      // sofort im Deploy-Log auffällt statt erst beim nächsten Checkout-Bugreport.
      if (istProd) {
        console.error(
          JSON.stringify({
            zahlungFakeGatewayInProd: true,
            warnung:
              'STRIPE_SECRET_KEY fehlt in Produktion — POST /abo liefert kein clientSecret, Kasse kann nicht abschließen.',
          }),
        );
      }
      instanz = new FakeZahlungsGateway();
    }
  }
  return instanz;
}
