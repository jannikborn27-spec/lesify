import { env } from '../../env.js';
import { HttpError } from '../http.js';

/**
 * KI-Vorab-Filter (`backend-planning.md` §3/§7, Phase 6): läuft vor jedem
 * KI-Call. Bei Treffer **kein** KI-Call, **kein** Usage-Verbrauch — die Route
 * fängt die geworfene `HttpError` und der Client zeigt sie als Popup/Toast
 * (`Lesify.fehlerText` in `app/assets/js/api.js` kennt die drei Codes schon).
 */

// ---- Größen-Guard --------------------------------------------------------

/** Wirft `400 anfrage_zu_gross`, wenn die Nutzer-Eingabe die Grenze sprengt. */
export function pruefeGroesse(text: string): void {
  if (text.length > env.KI_ANFRAGE_MAX_ZEICHEN) {
    throw new HttpError(400, 'anfrage_zu_gross', { maxZeichen: env.KI_ANFRAGE_MAX_ZEICHEN });
  }
}

// ---- Themen-Guard (Regelwerk-Variante, siehe §3: „kleiner Call oder
// Regelwerk") ---------------------------------------------------------------
//
// Bewusst konservativ (eher zu wenig als zu viel blockieren): fängt klar
// erkennbare Missbrauchs-/Off-Topic-Muster ab, ist aber keine vollständige
// Klassifikation. Eine echte Klassifikations-KI-Call-Variante ist eine
// mögliche spätere Erweiterung (§3 erlaubt beides), aktuell nicht nötig.

const VERBOTENE_MUSTER: RegExp[] = [
  // Anleitung zu Waffen/Sprengstoff (beide Wortreihenfolgen, daher Lookahead)
  /(?=.*\b(bombe|sprengstoff|waffen?)\b)(?=.*\b(bau\w*|herstell\w*|bastl\w*)\b)/i,
  /(?=.*\bdrogen?\b)(?=.*\b(herstell\w*|synthetisier\w*|koch\w*)\b)/i,
  // Unautorisierter Zugriff / Malware
  /(?=.*\b(passwort|account|wlan|w-?lan)\w*\b)(?=.*\b(hack\w*|knack\w*)\b)/i,
  /(?=.*\b(malware|virus|virus\w*)\b)(?=.*\b(schreib\w*|programmier\w*|erstell\w*)\b)/i,
  // Selbstverletzung
  /\b(suizid|selbstmord)\w*\s*(anleitung|methode)/i,
  // Sexuell explizite Inhalte
  /\b(porno|sexuelle?\s+inhalte|nacktbilder)\b/i,
];

const OFF_TOPIC_MUSTER: RegExp[] = [
  /\brezept\w*\s+für\b/i,
  /\bkochen?\s+(für|mit)\b/i,
  /\b(diät|abnehmen)\w*\s*(plan|tipps)?\b/i,
  /\bliebeskummer\b/i,
  /\bpartnersuche\b/i,
  /\bhoroskop\b/i,
];

/** Wirft `400 nicht_schulrelevant` bei erkennbar unpassender Anfrage. */
export function pruefeThemenrelevanz(text: string): void {
  const t = text.trim();
  if (!t) return; // leer wird von der Zod-Validierung schon abgefangen
  for (const muster of VERBOTENE_MUSTER) {
    if (muster.test(t)) throw new HttpError(400, 'nicht_schulrelevant');
  }
  for (const muster of OFF_TOPIC_MUSTER) {
    if (muster.test(t)) throw new HttpError(400, 'nicht_schulrelevant');
  }
}

// ---- Spam-Guard -----------------------------------------------------------

interface LetzteNachricht {
  text: string;
  zeit: number;
  wiederholungen: number;
}

const SPAM_FENSTER_MS = 30_000;
const SPAM_MAX_WIEDERHOLUNGEN = 2;

function normalisieren(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

export class SpamWaechter {
  private readonly letzte = new Map<string, LetzteNachricht>();

  /** Wirft `400 spam_erkannt`, wenn dieselbe Nachricht kurz hintereinander kommt. */
  treffer(userId: string, text: string): void {
    const jetzt = Date.now();
    const norm = normalisieren(text);
    const vorher = this.letzte.get(userId);

    if (vorher && vorher.text === norm && jetzt - vorher.zeit < SPAM_FENSTER_MS) {
      vorher.wiederholungen += 1;
      vorher.zeit = jetzt;
      if (vorher.wiederholungen > SPAM_MAX_WIEDERHOLUNGEN) {
        throw new HttpError(400, 'spam_erkannt');
      }
      return;
    }
    this.letzte.set(userId, { text: norm, zeit: jetzt, wiederholungen: 0 });
  }

  /** Nur für Tests. */
  zuruecksetzen(): void {
    this.letzte.clear();
  }
}

let spamInstanz: SpamWaechter | undefined;
export function getSpamWaechter(): SpamWaechter {
  if (!spamInstanz) spamInstanz = new SpamWaechter();
  return spamInstanz;
}

// ---- Missbrauchs-Signale (§7 „Rate-Limiting & Missbrauchsschutz", Punkt 3:
// „Logging + temporäre Sperre") -----------------------------------------
//
// Jeder Guard-Treffer (Größe/Themen/Spam) eines Nutzers wird strukturiert
// geloggt. Häufen sich die Treffer eines Nutzers in kurzer Zeit, ist das ein
// stärkeres Signal als ein einzelner Treffer (Testen der Grenzen, Scripting)
// — dann greift zusätzlich eine kurze temporäre Sperre der KI-Funktionen für
// genau diesen Nutzer (unabhängig vom IP-basierten Rate-Limiting in
// `ratelimit.ts`).

const MISSBRAUCH_FENSTER_MS = 60 * 60 * 1000; // 1 Stunde
const MISSBRAUCH_SCHWELLE = 5; // ab dem 5. Guard-Treffer im Fenster → Sperre
const MISSBRAUCH_SPERRE_MS = 30 * 60 * 1000; // 30 Minuten

interface MissbrauchsEintrag {
  treffer: number[];
  gesperrtBis?: number;
}

export class MissbrauchsWaechter {
  private readonly eintraege = new Map<string, MissbrauchsEintrag>();

  /** Wirft `429 missbrauch_gesperrt`, solange eine laufende Sperre besteht. */
  pruefeGesperrt(userId: string, jetzt = Date.now()): void {
    const eintrag = this.eintraege.get(userId);
    if (eintrag?.gesperrtBis && eintrag.gesperrtBis > jetzt) {
      throw new HttpError(429, 'missbrauch_gesperrt', {
        bisSek: Math.ceil((eintrag.gesperrtBis - jetzt) / 1000),
      });
    }
  }

  /** Meldet einen Guard-Treffer; sperrt bei zu vielen Treffern im Fenster temporär. */
  melden(userId: string, art: string, jetzt = Date.now()): void {
    const eintrag = this.eintraege.get(userId) ?? { treffer: [] };
    eintrag.treffer = eintrag.treffer.filter((t) => jetzt - t < MISSBRAUCH_FENSTER_MS);
    eintrag.treffer.push(jetzt);
    console.warn(
      JSON.stringify({
        missbrauchssignal: true,
        userId,
        art,
        anzahlImFenster: eintrag.treffer.length,
      }),
    );
    if (eintrag.treffer.length >= MISSBRAUCH_SCHWELLE) {
      eintrag.gesperrtBis = jetzt + MISSBRAUCH_SPERRE_MS;
      console.warn(
        JSON.stringify({
          missbrauchVerdacht: true,
          userId,
          anzahlImFenster: eintrag.treffer.length,
          gesperrtBisSek: MISSBRAUCH_SPERRE_MS / 1000,
        }),
      );
    }
    this.eintraege.set(userId, eintrag);
  }

  /** Nur für Tests. */
  zuruecksetzen(): void {
    this.eintraege.clear();
  }
}

let missbrauchsInstanz: MissbrauchsWaechter | undefined;
export function getMissbrauchsWaechter(): MissbrauchsWaechter {
  if (!missbrauchsInstanz) missbrauchsInstanz = new MissbrauchsWaechter();
  return missbrauchsInstanz;
}

/**
 * Bündelt Größen-, Themen- und Spam-Guard in dieser Reihenfolge; jeder
 * Guard-Treffer wird als Missbrauchs-Signal gemeldet (`MissbrauchsWaechter`),
 * eine laufende temporäre Sperre schlägt allem anderen vor.
 */
export function pruefeKiEingabe(
  userId: string,
  text: string,
  spamWaechter = getSpamWaechter(),
  missbrauchsWaechter = getMissbrauchsWaechter(),
): void {
  missbrauchsWaechter.pruefeGesperrt(userId);
  try {
    pruefeGroesse(text);
    pruefeThemenrelevanz(text);
    spamWaechter.treffer(userId, text);
  } catch (err) {
    if (err instanceof HttpError) missbrauchsWaechter.melden(userId, err.code);
    throw err;
  }
}
