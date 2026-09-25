import type { FastifyInstance } from 'fastify';
import { env } from '../env.js';
import { AnthropicKiClient, FakeKiClient } from '../lib/ki/client.js';

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
      sentry: !!env.SENTRY_DSN,
    };
  };
  app.get('/health', check);
  app.get('/health/ready', check);
}
