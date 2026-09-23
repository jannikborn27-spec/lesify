import { createHash } from 'node:crypto';
import type { Abo, PrismaClient } from '@prisma/client';
import type { ZahlungsGateway } from './zahlung.js';

export type TestphasePruefung =
  | { ergebnis: 'ok' }
  /** Zahlungsart ohne stabile Kennung (Klarna, Amazon Pay) oder noch keins hinterlegt */
  | { ergebnis: 'nicht_pruefbar' }
  | { ergebnis: 'abgelehnt' };

function hashKennung(kennung: string): string {
  return createHash('sha256').update(kennung).digest('hex');
}

/**
 * Testphase einmal je Zahlungsmittel (Entscheidung 2026-09-23: „refuse").
 * Läuft direkt nach dem Hinterlegen des Zahlungsmittels (Kasse →
 * `POST /abo/testphase-pruefen`) und zusätzlich als Sicherheitsnetz im
 * Webhook. Wurde das Zahlungsmittel schon für eine Testphase eines anderen
 * Abos genutzt, wird die neue Subscription **sofort beendet, bevor irgendwas
 * abgebucht wird**, und die Abo-Zeile entfernt — das Konto steht danach wieder
 * ohne Abo da und kann ohne Testphase abschließen.
 */
export async function testphasePruefen(
  prisma: PrismaClient,
  zahlung: ZahlungsGateway,
  abo: Abo,
): Promise<TestphasePruefung> {
  if (abo.status !== 'test') return { ergebnis: 'ok' };
  const kennung = await zahlung.zahlungsmittelKennung(abo.zahlungsanbieterRef ?? abo.id);
  if (!kennung) return { ergebnis: 'nicht_pruefbar' };

  const kennungHash = hashKennung(kennung);
  const bekannt = await prisma.trialZahlungsmittel.findUnique({ where: { kennungHash } });
  if (!bekannt) {
    await prisma.trialZahlungsmittel.create({ data: { kennungHash, aboId: abo.id } });
    return { ergebnis: 'ok' };
  }
  if (bekannt.aboId === abo.id) return { ergebnis: 'ok' };

  await zahlung.subscriptionSofortBeenden(abo.zahlungsanbieterRef ?? abo.id);
  await prisma.$transaction([
    prisma.user.updateMany({ where: { aboId: abo.id }, data: { aboId: null } }),
    prisma.abo.delete({ where: { id: abo.id } }),
  ]);
  return { ergebnis: 'abgelehnt' };
}
