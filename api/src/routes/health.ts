import type { FastifyInstance } from 'fastify';
import { env } from '../env.js';
import { AnthropicKiClient, FakeKiClient } from '../lib/ki/client.js';

/** Stripe-Modus aus dem Schlüssel-Präfix — nie der Schlüssel selbst (2026-09-29,
 * zum Prüfen der Umstellung auf Live). Ohne Schlüssel läuft der Fake-Gateway. */
export function zahlungsModus(
  secretKey: string | undefined,
): 'live' | 'test' | 'fake' | 'unbekannt' {
  if (!secretKey) return 'fake';
  if (/^(sk|rk)_live_/.test(secretKey)) return 'live';
  if (/^(sk|rk)_test_/.test(secretKey)) return 'test';
  return 'unbekannt';
}

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  // Liveness — reagiert der Prozess? (kein DB-Zugriff, fürs Uptime-Monitoring)
  app.get('/health/live', async () => ({ status: 'ok', uptimeSek: Math.round(process.uptime()) }));

  // Readiness / voller Health-Check — inkl. DB.
  const check = async () => {
    let db = false;
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch {
      db = false;
    }
    return {
      status: db ? 'ok' : 'degraded',
      service: 'lesify-api',
      db,
      uptimeSek: Math.round(process.uptime()),
      zeit: new Date().toISOString(),
      // Betriebs-Diagnose (2026-09-25): welcher KI-Adapter läuft, welche
      // Modelle — keine Schlüssel, nur Typ/Namen.
      ki: {
        adapter:
          app.ki instanceof AnthropicKiClient
            ? 'anthropic'
            : app.ki instanceof FakeKiClient
              ? 'fake'
              : 'anderer',
        modelle: { standard: env.KI_MODELL_STANDARD, analyse: env.KI_MODELL_ANALYSE },
      },
      zahlung: {
        modus: zahlungsModus(env.STRIPE_SECRET_KEY),
        webhookSecret: !!env.STRIPE_WEBHOOK_SECRET,
      },
      sentry: !!env.SENTRY_DSN,
    };
  };
  app.get('/health', check);
  app.get('/health/ready', check);
}
