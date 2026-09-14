/**
 * Abo-Preise & -Regeln — Backend-Spiegel von
 * `marketing/assets/js/stripe-config.js` (`plans` / `family` / `offer` /
 * `trialDays`). Beträge in **Cent**. `amount` ist der aktuell fällige Betrag
 * (bereits mit Angebot), `normal` der durchgestrichene Listenpreis.
 *
 * Preistabelle final (Stand 2026-09-14). Weiterhin offen (backend-planning.md
 * §8): Angebotsdauer/-verlängerung, Jahrespreis-Rundung, ob der Angebotspreis
 * dauerhaft an den Vertrag gebunden bleibt.
 */

export type AboPaketKey = 'starter' | 'premium' | 'infinite';
export type AboArtKey = 'einzel' | 'familie';
export type AboIntervallKey = 'monatlich' | 'jaehrlich';

/** Kostenlose Testphase in Tagen (Stripe `trial_period_days`). */
export const ABO_TRIAL_TAGE = 14;

/** Erlaubte Sitzzahlen im Familien-Abo. */
export const FAMILIE_SITZ_OPTIONEN = [2, 3, 4] as const;

/** Aktives Rabatt-Angebot (`offer` in stripe-config.js). */
export const ABO_ANGEBOT = {
  key: 'schuljahresstart_-20',
  aktiv: true,
  prozent: 20,
  label: '−20 % zum Schuljahresstart',
} as const;

interface Betrag {
  amount: number;
  normal?: number;
}
interface PaketPreis {
  monatlich: Betrag;
  jaehrlich: Betrag;
}

/** Einzelplatz-Preise je Paket. */
export const EINZEL_PREISE: Record<AboPaketKey, PaketPreis> = {
  starter: {
    monatlich: { amount: 1599, normal: 1999 },
    jaehrlich: { amount: 15588, normal: 23988 },
  },
  premium: {
    monatlich: { amount: 1999, normal: 2499 },
    jaehrlich: { amount: 19188, normal: 29988 },
  },
  infinite: {
    monatlich: { amount: 3599, normal: 4499 },
    jaehrlich: { amount: 33588, normal: 53988 },
  },
};

/** Familien-Preise je Paket und Sitzzahl (2–4), Stand 2026-09-14. */
export const FAMILIE_PREISE: Record<AboPaketKey, Record<number, PaketPreis>> = {
  starter: {
    2: { monatlich: { amount: 2899, normal: 3299 }, jaehrlich: { amount: 27588, normal: 35988 } },
    3: { monatlich: { amount: 4199, normal: 4599 }, jaehrlich: { amount: 39588, normal: 47988 } },
    4: { monatlich: { amount: 5499, normal: 5899 }, jaehrlich: { amount: 51588, normal: 59988 } },
  },
  premium: {
    2: { monatlich: { amount: 3599, normal: 4099 }, jaehrlich: { amount: 33188, normal: 44388 } },
    3: { monatlich: { amount: 5199, normal: 5699 }, jaehrlich: { amount: 47588, normal: 58788 } },
    4: { monatlich: { amount: 6799, normal: 7299 }, jaehrlich: { amount: 61988, normal: 73188 } },
  },
  infinite: {
    2: { monatlich: { amount: 6499, normal: 7399 }, jaehrlich: { amount: 59988, normal: 80388 } },
    3: { monatlich: { amount: 9399, normal: 10299 }, jaehrlich: { amount: 86388, normal: 106788 } },
    4: {
      monatlich: { amount: 12299, normal: 13199 },
      jaehrlich: { amount: 112788, normal: 133188 },
    },
  },
};

/** `einzel` bei 1 Sitz, sonst `familie` (2–4). */
export function aboArtFuerSitze(sitze: number): AboArtKey {
  return sitze <= 1 ? 'einzel' : 'familie';
}

export function istGueltigeSitzzahl(art: AboArtKey, sitze: number): boolean {
  if (art === 'einzel') return sitze === 1;
  return (FAMILIE_SITZ_OPTIONEN as readonly number[]).includes(sitze);
}

export interface AboPreis {
  /** aktuell fälliger Betrag in Cent (mit Angebot) */
  betragCent: number;
  /** Listenpreis in Cent, falls abweichend */
  normalCent: number | null;
  intervall: AboIntervallKey;
  angebotKey: string | null;
}

/**
 * Löst den Preis für eine Abo-Konfiguration auf. Wirft, wenn die Kombination
 * (Paket × Art × Sitze × Intervall) nicht existiert.
 */
export function aboPreis(opts: {
  paket: AboPaketKey;
  art: AboArtKey;
  sitze: number;
  intervall: AboIntervallKey;
}): AboPreis {
  const { paket, art, sitze, intervall } = opts;
  if (!istGueltigeSitzzahl(art, sitze)) {
    throw new Error(`ungültige Sitzzahl ${sitze} für ${art}`);
  }
  const tabelle = art === 'einzel' ? EINZEL_PREISE[paket] : FAMILIE_PREISE[paket]?.[sitze];
  if (!tabelle) throw new Error(`kein Preis für ${paket}/${art}/${sitze}`);
  const b = tabelle[intervall];
  return {
    betragCent: b.amount,
    normalCent: b.normal ?? null,
    intervall,
    angebotKey: ABO_ANGEBOT.aktiv ? ABO_ANGEBOT.key : null,
  };
}
