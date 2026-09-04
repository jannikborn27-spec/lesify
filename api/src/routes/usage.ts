import type { FastifyInstance } from 'fastify';
import {
  PLAN_LIMITS,
  PLAN_NAMES,
  TRIAL_PAKET,
  monatsSchluessel,
  naechsterMonatsErster,
  type Paket,
} from '@lesify/shared';
import { oder404 } from '../lib/scope.js';

export async function usageRoutes(app: FastifyInstance): Promise<void> {
  const { prisma } = app;
  app.addHook('preHandler', app.requireAuth);

  // GET /usage — vier Zähler + Limit + resetDatum + planName.
  // Die endgültige Zähl-/Reset-Logik kommt in Phase 8; hier die Leseform.
  app.get('/usage', async (req) => {
    const user = oder404(
      await prisma.user.findUnique({ where: { id: req.userId }, include: { abo: true } }),
    );

    const imTrial = !user.abo && !!user.trialEndetAm && user.trialEndetAm.getTime() > Date.now();
    const paket: Paket = user.abo?.paket ?? (imTrial ? TRIAL_PAKET : 'starter');
    const limits = PLAN_LIMITS[paket];

    const monat = monatsSchluessel();
    const row = await prisma.usage.findUnique({
      where: { userId_monat: { userId: user.id, monat } },
    });

    return {
      planName: PLAN_NAMES[paket],
      paket,
      resetDatum: naechsterMonatsErster(),
      nachrichten: { used: row?.nachrichtenUsed ?? 0, limit: limits.nachrichten },
      dateien: { used: row?.dateienUsed ?? 0, limit: limits.dateien },
      lernzettel: { used: row?.lernzettelUsed ?? 0, limit: limits.lernzettel },
      testklausuren: { used: row?.testklausurenUsed ?? 0, limit: limits.testklausuren },
    };
  });
}
