import type { Lernplan, PrismaClient } from '@prisma/client';
import {
  klausurNote,
  lernplanStatus,
  testklausurGesamtNote,
  type LernplanStatus,
  type TestklausurEingabe,
} from '@lesify/shared';
import { HttpError } from './http.js';

/** chatMap-Schlüssel wie im Prototyp: "<tag>|<modus>|<themaId>" (modus null → ""). */
export function chatMapKey(tag: number, modus: string | null, themaId: string): string {
  return `${tag}|${modus ?? ''}|${themaId}`;
}

/**
 * Setzt `Lernplan.chatMap[key] = chatId` idempotent (Override-Muster).
 * Wirft 404, wenn der Lernplan nicht dem User gehört.
 */
export async function setChatMapEintrag(
  prisma: PrismaClient,
  userId: string,
  lernplanId: string,
  key: string,
  chatId: string,
): Promise<Record<string, string>> {
  const lp = await prisma.lernplan.findFirst({ where: { id: lernplanId, userId } });
  if (!lp) throw new HttpError(404, 'nicht_gefunden');
  const map = { ...((lp.chatMap as Record<string, string> | null) ?? {}) };
  if (map[key] === chatId) return map; // schon gesetzt
  map[key] = chatId;
  await prisma.lernplan.update({ where: { id: lp.id }, data: { chatMap: map } });
  return map;
}

/** Eine Testklausur in die Eingabeform für `lernplanStatus` bringen. */
export async function testklausurEingabe(
  prisma: PrismaClient,
  tkId: string,
): Promise<TestklausurEingabe | null> {
  const tk = await prisma.testklausur.findUnique({
    where: { id: tkId },
    include: { ergebnisse: { select: { prozent: true } }, vorbereitung: true },
  });
  if (!tk) return null;
  return {
    status: tk.status,
    fachId: tk.fachId,
    themaIds: tk.themaIds,
    ergebnisNote: testklausurGesamtNote(tk.ergebnisse.map((e) => e.prozent)),
    vorbereitungProThema: tk.vorbereitung.length
      ? tk.vorbereitung.map((v) => ({
          themaId: v.themaId,
          ampel: v.ampel,
          note: Number(v.note),
          prozent: v.prozent,
        }))
      : null,
  };
}

/** Vollständiger berechneter Lernplan-Zustand (data.js `Lesify.lernplanStatus`). */
export async function berechneLernplanStatus(
  prisma: PrismaClient,
  lp: Lernplan,
): Promise<LernplanStatus> {
  const klausur = await prisma.klausur.findUnique({
    where: { id: lp.klausurId },
    select: { themaIds: true, fachId: true },
  });
  return lernplanStatus({
    klausurThemaIds: klausur?.themaIds ?? null,
    klausurFachId: klausur?.fachId ?? null,
    testklausur1: await testklausurEingabe(prisma, lp.testklausur1Id),
    testklausur2: lp.testklausur2Id ? await testklausurEingabe(prisma, lp.testklausur2Id) : null,
    tageErledigt: lp.tageErledigt,
    checklist: (lp.checklist as Record<string, Record<string, boolean>> | null) ?? null,
  });
}

/**
 * `Lesify.klausurNote(klausurId)` — Note der zuletzt analysierten Testklausur.
 * `tks` in Erstellungsreihenfolge.
 */
export async function klausurNoteFuer(
  prisma: PrismaClient,
  klausurId: string,
): Promise<{ note: number; testNr: 1 | 2 } | null> {
  const tks = await prisma.testklausur.findMany({
    where: { klausurId },
    orderBy: { erstelltAm: 'asc' },
    include: { ergebnisse: { select: { prozent: true } } },
  });
  return klausurNote(
    tks.map((t) => ({
      status: t.status,
      ergebnisNote: testklausurGesamtNote(t.ergebnisse.map((e) => e.prozent)),
    })),
  );
}
