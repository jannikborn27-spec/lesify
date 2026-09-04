import type { FastifyInstance } from 'fastify';

export async function healthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    let db = false;
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch {
      db = false;
    }
    return { status: db ? 'ok' : 'degraded', service: 'lesify-api', db };
  });
}
