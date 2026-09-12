import type { PrismaClient } from '@prisma/client';

/**
 * Anzahl Klausuren je Thema — `Klausur.themaIds` ist ein String-Array-Feld,
 * keine echte Relation, darum kein `_count` möglich (anders als
 * chats/lernzettel/dateien in `themaDTO`). Ein Request lädt alle Klausuren
 * des Users einmal (klein, keine Inhalte) und zählt clientseitig — für
 * `GET /themen` und `GET /faecher/:id/themen`.
 */
export async function klausurenAnzahlProThema(
  prisma: PrismaClient,
  userId: string,
): Promise<Map<string, number>> {
  const klausuren = await prisma.klausur.findMany({
    where: { userId },
    select: { themaIds: true },
  });
  const anzahl = new Map<string, number>();
  for (const k of klausuren) {
    for (const themaId of k.themaIds) {
      anzahl.set(themaId, (anzahl.get(themaId) ?? 0) + 1);
    }
  }
  return anzahl;
}
