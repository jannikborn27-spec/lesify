import type { FastifyRequest } from 'fastify';
import { HttpError } from './http.js';

/**
 * Request-Rate-Limiting nach `backend-planning.md` §7 (Phase 15). Getrennt vom
 * bezahlten Usage-Limit. In-Memory-Fixed-Window pro (Klasse, Schlüssel) — für
 * eine Einzel-Instanz ausreichend; bei mehreren API-Instanzen später auf Redis
 * heben. Startwerte, nach echtem Traffic kalibrieren.
 *
 * Hängt als `onRequest`-Hook — dort ist `request.userId` noch nicht gesetzt,
 * daher werden aktuell **alle** Klassen effektiv per IP geschlüsselt. Sobald
 * feineres User-Keying nötig wird: Hook nach `requireAuth` ziehen bzw. Redis.
 */

export interface RateRegel {
  klasse: string;
  limit: number;
  fensterSek: number;
  /** Schlüssel-Quelle: User-Session bevorzugt, sonst IP. */
  schluessel: 'user' | 'ip';
}

const AUTH_PFADE = new Set([
  '/auth/login',
  '/auth/registrieren',
  '/auth/passwort-vergessen',
  '/auth/passwort-zuruecksetzen',
]);

/** Teure (später KI-)Endpunkte — Klasse „ki". */
function istKiPfad(method: string, pfad: string): boolean {
  if (method !== 'POST') return false;
  return (
    /^\/chats\/[^/]+\/nachrichten$/.test(pfad) ||
    /^\/testklausuren(\/[^/]+\/(loesung|analyse))?$/.test(pfad) ||
    /^\/lernzettel\/[^/]+\/revisionen$/.test(pfad) ||
    /^\/themen\/[^/]+\/(lernzettel|dateien)$/.test(pfad) ||
    /^\/lernplaene\/[^/]+\/(testklausur2|lernzettel)$/.test(pfad)
  );
}

/** Ordnet einen Request einer Rate-Regel zu (oder `null` = kein Limit). */
export function regelFuer(method: string, pfad: string): RateRegel | null {
  if (pfad.startsWith('/health') || pfad.startsWith('/abo/webhook')) return null;
  if (AUTH_PFADE.has(pfad)) {
    return { klasse: 'auth', limit: 10, fensterSek: 60, schluessel: 'ip' };
  }
  if (pfad === '/kontakt') {
    return { klasse: 'kontakt', limit: 3, fensterSek: 60, schluessel: 'ip' };
  }
  if (istKiPfad(method, pfad)) {
    return { klasse: 'ki', limit: 20, fensterSek: 60, schluessel: 'user' };
  }
  // alles andere: Lese-/Schreib-Endpunkte
  return { klasse: 'io', limit: 120, fensterSek: 60, schluessel: 'user' };
}

interface Fenster {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private readonly buckets = new Map<string, Fenster>();

  /** Prüft & zählt. Wirft `429 rate_limit` mit `retryAfterSek`, wenn überschritten. */
  treffer(req: FastifyRequest): void {
    const regel = regelFuer(req.method, req.url.split('?')[0] ?? req.url);
    if (!regel) return;

    const wer = regel.schluessel === 'user' && req.userId ? `u:${req.userId}` : `ip:${req.ip}`;
    const key = `${regel.klasse}:${wer}`;
    const jetzt = Date.now();

    let f = this.buckets.get(key);
    if (!f || f.resetAt <= jetzt) {
      f = { count: 0, resetAt: jetzt + regel.fensterSek * 1000 };
      this.buckets.set(key, f);
    }
    f.count += 1;
    if (f.count > regel.limit) {
      const retryAfterSek = Math.max(1, Math.ceil((f.resetAt - jetzt) / 1000));
      throw new HttpError(429, 'rate_limit', { klasse: regel.klasse, retryAfterSek });
    }
  }

  /** Abgelaufene Fenster wegräumen (periodisch aufrufen). */
  aufraeumen(jetzt = Date.now()): void {
    for (const [k, f] of this.buckets) if (f.resetAt <= jetzt) this.buckets.delete(k);
  }

  /** Nur für Tests. */
  zuruecksetzen(): void {
    this.buckets.clear();
  }
}
