import type { Prisma, PrismaClient } from '@prisma/client';
import type { StorageGateway } from './storage.js';

/**
 * Inhalte löschen (Einstellungen → „Meine Inhalte", 2026-09-30). Die FK-
 * Kaskaden erledigen den Großteil; hier liegt nur, was die DB nicht selbst
 * kann:
 * - Speicherobjekte der mitgelöschten `Datei`-Zeilen entfernen,
 * - `Klausur.themaIds`/`Testklausur.themaIds` (String-Arrays ohne FK) um ein
 *   gelöschtes Thema bereinigen,
 * - `Lernplan.chatMap` von Verweisen auf gelöschte Chats befreien.
 * Usage-Zähler bleiben unangetastet — Gelöschtes wird nicht gutgeschrieben.
 */

async function speicherLoeschen(
  storage: StorageGateway,
  pfade: string[],
  log: (err: unknown) => void,
): Promise<void> {
  if (!pfade.length) return;
  await storage.loeschen(pfade).catch(log);
}

/** Entfernt chatMap-Einträge, deren Chat nicht mehr existiert. */
export async function chatMapBereinigen(prisma: PrismaClient, userId: string): Promise<void> {
  const plaene = await prisma.lernplan.findMany({
    where: { userId },
    select: { id: true, chatMap: true },
  });
  const map = (p: { chatMap: Prisma.JsonValue }) => (p.chatMap ?? {}) as Record<string, string>;
  const ids = [...new Set(plaene.flatMap((p) => Object.values(map(p))))];
  if (!ids.length) return;
  const vorhanden = new Set(
    (await prisma.chat.findMany({ where: { id: { in: ids } }, select: { id: true } })).map(
      (c) => c.id,
    ),
  );
  for (const p of plaene) {
    const alt = map(p);
    const neu = Object.fromEntries(Object.entries(alt).filter(([, id]) => vorhanden.has(id)));
    if (Object.keys(neu).length !== Object.keys(alt).length) {
      await prisma.lernplan.update({ where: { id: p.id }, data: { chatMap: neu } });
    }
  }
}

/** Speicherpfade aller Dateien, die an Fach/Thema oder an Testklausuren hängen. */
async function dateiPfade(prisma: PrismaClient, where: Prisma.DateiWhereInput): Promise<string[]> {
  return (await prisma.datei.findMany({ where, select: { speicherPfad: true } })).map(
    (d) => d.speicherPfad,
  );
}

/** Lösungs-Uploads der Testklausuren einer Klausur (hängen nicht per Kaskade an ihr). */
async function loesungsDateiIds(prisma: PrismaClient, klausurIds: string[]): Promise<string[]> {
  if (!klausurIds.length) return [];
  const tks = await prisma.testklausur.findMany({
    where: { klausurId: { in: klausurIds }, geloesteDateiId: { not: null } },
    select: { geloesteDateiId: true },
  });
  return tks.map((t) => t.geloesteDateiId!);
}

export async function fachLoeschen(
  prisma: PrismaClient,
  storage: StorageGateway,
  userId: string,
  fachId: string,
  log: (err: unknown) => void,
): Promise<void> {
  const pfade = await dateiPfade(prisma, { userId, fachId });
  // Kaskade: Themen, Chats, Lernzettel, Dateien, Klausuren (+ Lernpläne),
  // Testklausuren (+ Aufgaben/Ergebnisse).
  await prisma.fach.delete({ where: { id: fachId } });
  await chatMapBereinigen(prisma, userId);
  await speicherLoeschen(storage, pfade, log);
}

export async function klausurLoeschen(
  prisma: PrismaClient,
  storage: StorageGateway,
  userId: string,
  klausurId: string,
  log: (err: unknown) => void,
): Promise<void> {
  const dateiIds = await loesungsDateiIds(prisma, [klausurId]);
  const pfade = await dateiPfade(prisma, { id: { in: dateiIds } });
  // Kaskade: Lernplan + Testklausuren (+ Aufgaben/Ergebnisse).
  await prisma.$transaction([
    prisma.klausur.delete({ where: { id: klausurId } }),
    prisma.datei.deleteMany({ where: { id: { in: dateiIds }, userId } }),
  ]);
  await speicherLoeschen(storage, pfade, log);
}

/**
 * Thema löschen. Klausuren, die **nur** dieses Thema abdecken, werden samt
 * Lernplan/Testklausuren mitgelöscht; bei den übrigen wird das Thema aus
 * `themaIds` entfernt (Aufgaben/Ergebnisse zum Thema fallen per Kaskade weg).
 * Eine Testklausur 2, die danach leer wäre, wird verworfen (Lernplan steht
 * wieder auf „Testklausur 2 noch nicht gestartet").
 */
export async function themaLoeschen(
  prisma: PrismaClient,
  storage: StorageGateway,
  userId: string,
  themaId: string,
  log: (err: unknown) => void,
): Promise<{ klausurenGeloescht: number }> {
  const klausuren = await prisma.klausur.findMany({
    where: { userId, themaIds: { has: themaId } },
    select: { id: true, themaIds: true },
  });
  const nurDiesesThema = klausuren.filter((k) => k.themaIds.every((t) => t === themaId));
  const behalten = klausuren.filter((k) => !nurDiesesThema.includes(k));

  for (const k of nurDiesesThema) await klausurLoeschen(prisma, storage, userId, k.id, log);

  const pfade = await dateiPfade(prisma, { userId, themaId });
  await prisma.$transaction(async (tx) => {
    for (const k of behalten) {
      await tx.klausur.update({
        where: { id: k.id },
        data: { themaIds: k.themaIds.filter((t) => t !== themaId) },
      });
    }
    const tks = await tx.testklausur.findMany({
      where: { userId, themaIds: { has: themaId } },
      select: {
        id: true,
        themaIds: true,
        lernplanAlsT1: { select: { id: true } },
        lernplanAlsT2: { select: { id: true } },
      },
    });
    for (const tk of tks) {
      const rest = tk.themaIds.filter((t) => t !== themaId);
      if (!rest.length && !tk.lernplanAlsT1) {
        if (tk.lernplanAlsT2) {
          await tx.lernplan.update({
            where: { id: tk.lernplanAlsT2.id },
            data: { testklausur2Id: null },
          });
        }
        await tx.testklausur.delete({ where: { id: tk.id } });
      } else {
        await tx.testklausur.update({ where: { id: tk.id }, data: { themaIds: rest } });
      }
    }
    // Kaskade: Chats, Lernzettel, Dateien, Aufgaben/Ergebnisse zum Thema.
    await tx.thema.delete({ where: { id: themaId } });
  });
  await chatMapBereinigen(prisma, userId);
  await speicherLoeschen(storage, pfade, log);
  return { klausurenGeloescht: nurDiesesThema.length };
}

/**
 * Konto hart löschen (DSGVO Art. 17): das Konto, seine Kind-Profile und per
 * FK-Kaskade alle Inhalte, Sessions, Einstellungen und eigenen Abos; danach die
 * Speicherobjekte (best effort, außerhalb der Transaktion). Genutzt von
 * `POST /user/loeschen` und `tools/konten-loeschen.ts`.
 */
export async function kontoLoeschen(
  prisma: PrismaClient,
  storage: StorageGateway,
  userId: string,
  log: (err: unknown) => void,
): Promise<{ kindProfileGeloescht: number }> {
  const kinder = await prisma.user.findMany({
    where: { parentUserId: userId },
    select: { id: true },
  });
  const betroffeneUserIds = [userId, ...kinder.map((k) => k.id)];
  const dateiKeys = (
    await prisma.datei.findMany({
      where: { userId: { in: betroffeneUserIds } },
      select: { speicherPfad: true },
    })
  ).map((d) => d.speicherPfad);

  await prisma.$transaction([
    ...kinder.map((k) => prisma.user.delete({ where: { id: k.id } })),
    prisma.user.delete({ where: { id: userId } }),
  ]);
  await speicherLoeschen(storage, dateiKeys, log);
  return { kindProfileGeloescht: kinder.length };
}
