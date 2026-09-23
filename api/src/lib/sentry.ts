import * as Sentry from '@sentry/node';
import { env } from '../env.js';

/**
 * Error-Tracking (Phase 15, eingerichtet 2026-09-23). Aktiv nur, wenn
 * `SENTRY_DSN` gesetzt ist — sonst no-op (lokal, Tests). EU-Region, keine
 * personenbezogenen Daten: Sentry bekommt nur Fehlertyp, Stacktrace, Route und
 * die interne User-ID — **keine** Request-Bodys (Chat-Texte, Passwörter),
 * keine Header, keine IP.
 */
let aktiv = false;

export function sentryStarten(): void {
  if (!env.SENTRY_DSN || aktiv) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    // Nichts Personenbezogenes/Inhaltliches mitschicken (Chat-Texte, Tokens,
    // KI-Prompts, DB-Werte) — `beforeSend` unten räumt zusätzlich auf.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      stackFrameVariables: false,
    },
    tracesSampleRate: 0,
    beforeSend(event) {
      if (event.request) {
        delete event.request.data;
        delete event.request.cookies;
        delete event.request.headers;
        delete event.request.query_string;
      }
      if (event.user) event.user = { id: event.user.id };
      return event;
    },
  });
  aktiv = true;
}

/** Unerwarteten Fehler melden (500er, KI-Ausfälle, Job-Abbrüche). */
export function fehlerMelden(
  err: unknown,
  kontext: { route?: string; userId?: string; job?: string } = {},
): void {
  if (!aktiv) return;
  Sentry.withScope((scope) => {
    if (kontext.userId) scope.setUser({ id: kontext.userId });
    if (kontext.route) scope.setTag('route', kontext.route);
    if (kontext.job) scope.setTag('job', kontext.job);
    Sentry.captureException(err);
  });
}

/** Vor Prozessende (Jobs): gepufferte Events noch rausschicken. */
export async function sentryLeeren(): Promise<void> {
  if (aktiv) await Sentry.flush(2000);
}
