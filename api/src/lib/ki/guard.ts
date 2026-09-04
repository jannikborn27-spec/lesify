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

/** Bündelt Größen-, Themen- und Spam-Guard in dieser Reihenfolge. */
export function pruefeKiEingabe(
  userId: string,
  text: string,
  spamWaechter = getSpamWaechter(),
): void {
  pruefeGroesse(text);
  pruefeThemenrelevanz(text);
  spamWaechter.treffer(userId, text);
}
