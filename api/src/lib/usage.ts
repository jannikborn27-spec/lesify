import type { PrismaClient } from '@prisma/client';
import { PLAN_LIMITS, TRIAL_PAKET, monatsSchluessel, type Paket } from '@lesify/shared';

/** Aktuelles Tarif-Paket des Users (Abo, sonst Premium im Trial, sonst Starter). */
export async function paketFuerUser(prisma: PrismaClient, userId: string): Promise<Paket> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { abo: true } });
  if (user?.abo) return user.abo.paket;
  const imTrial = !!user?.trialEndetAm && user.trialEndetAm.getTime() > Date.now();
  return imTrial ? TRIAL_PAKET : 'starter';
}

type Zaehler = 'nachrichtenUsed' | 'dateienUsed' | 'lernzettelUsed' | 'testklausurenUsed';

/**
 * Erhöht einen Usage-Zähler im laufenden Monat (Upsert). Die harte Limit-
 * Durchsetzung + der Monats-Reset kommen in Phase 8 — hier wird nur gezählt.
 */
export async function inkrementiereUsage(
  prisma: PrismaClient,
  userId: string,
  zaehler: Zaehler,
  betrag = 1,
): Promise<void> {
  const monat = monatsSchluessel();
  const paket = await paketFuerUser(prisma, userId);
  const l = PLAN_LIMITS[paket];
  await prisma.usage.upsert({
    where: { userId_monat: { userId, monat } },
    update: { [zaehler]: { increment: betrag } },
    create: {
      userId,
      monat,
      nachrichtenLimit: l.nachrichten,
      dateienLimit: l.dateien,
      lernzettelLimit: l.lernzettel,
      testklausurenLimit: l.testklausuren,
      [zaehler]: betrag,
    },
  });
}
