import type { FastifyInstance } from 'fastify';
import { usageStand } from '../lib/usage.js';

export async function usageRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', app.requireAuth);

  // GET /usage — vier Zähler (used/limit/resetDatum) + Ring + planName.
  // Spiegelt Lesify.usage() aus data.js; Limits live aus dem aktiven Paket,
  // Monats-Reset implizit über den Usage.monat-Schlüssel (§7).
  app.get('/usage', async (req) => {
    const s = await usageStand(app.prisma, req.userId);
    return {
      paket: s.paket,
      planName: s.planName,
      resetDatum: s.resetDatum,
      nachrichten: s.nachrichten,
      dateien: s.dateien,
      lernzettel: s.lernzettel,
      testklausuren: s.testklausuren,
      ring: { ratio: s.ringRatio, stufe: s.stufe },
    };
  });
}
