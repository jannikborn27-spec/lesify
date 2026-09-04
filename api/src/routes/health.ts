import type { FastifyInstance } from 'fastify';

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
    };
  };
  app.get('/health', check);
  app.get('/health/ready', check);
}
