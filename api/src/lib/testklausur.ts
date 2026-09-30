import type { PrismaClient, Testklausur, Aufgabe } from '@prisma/client';
import type { KiClient } from './ki/client.js';
import { testklausurAufgabenErzeugen } from './ki/calls.js';
import { klassenstufeFuer, themaMaterial } from './ki/kontext.js';
import { pruefeUsageLimit, inkrementiereUsage } from './usage.js';
import { HttpError } from './http.js';

/** Max. Testklausuren pro Klausurvorbereitung (Entscheidung 2026-09-04). */
export const MAX_TESTKLAUSUREN_PRO_KLAUSUR = 2;

export interface TestklausurErstellenInput {
  userId: string;
  fachId: string;
  themaIds: string[];
  titel: string;
  klausurId?: string | null;
}

/**
 * Call 10 (Testklausur-Erstellung) end-to-end: 3.-Aufruf-Riegel je
 * `klausurId`, Usage-Limit, KI-Call (ein Call für alle Aufgaben), Persistenz.
 * Läuft **außerhalb** einer DB-Transaktion — ein KI-Call darf keine
 * Datenbank-Transaktion offen halten (Verbindungspool!). `POST /klausuren`
 * und `POST /testklausuren` teilen sich diese Funktion.
 */
export async function testklausurErstellen(
  prisma: PrismaClient,
  ki: KiClient,
  input: TestklausurErstellenInput,
): Promise<Testklausur & { aufgaben: Aufgabe[] }> {
  let bisherige = 0;
  if (input.klausurId) {
    bisherige = await prisma.testklausur.count({
      where: { klausurId: input.klausurId, userId: input.userId },
    });
    if (bisherige >= MAX_TESTKLAUSUREN_PRO_KLAUSUR) {
      throw new HttpError(409, 'testklausur_limit_erreicht', {
        max: MAX_TESTKLAUSUREN_PRO_KLAUSUR,
      });
    }
  }
  // Limitiert werden Klausurvorbereitungen, nicht Testklausuren (2026-09-30):
  // nur die erste Testklausur einer Klausur zählt (= die Klausur selbst),
  // Testklausur 2 gehört zur selben Vorbereitung und ist frei.
  const zaehltAlsVorbereitung = bisherige === 0;
  if (zaehltAlsVorbereitung) await pruefeUsageLimit(prisma, input.userId, 'testklausuren');

  const themen = await prisma.thema.findMany({
    where: { id: { in: input.themaIds }, userId: input.userId, fachId: input.fachId },
  });
  if (themen.length !== new Set(input.themaIds).size) throw new HttpError(404, 'nicht_gefunden');
  const fach = await prisma.fach.findFirst({ where: { id: input.fachId, userId: input.userId } });
  if (!fach) throw new HttpError(404, 'nicht_gefunden');

  const klassenstufe = await klassenstufeFuer(prisma, input.userId, input.fachId);
  const themenInput = await Promise.all(
    input.themaIds.map(async (themaId) => {
      const thema = themen.find((t) => t.id === themaId)!;
      const material = await themaMaterial(prisma, themaId);
      return { themaId, themaName: thema.name, themaBeschreibung: thema.beschreibung, ...material };
    }),
  );

  const aufgaben = await testklausurAufgabenErzeugen(ki, {
    klassenstufe,
    fachName: fach.name,
    themen: themenInput,
  });

  // ≈ 30 Minuten (2026-09-30): mehrere Aufgaben je Thema erlaubt. Nach
  // Themenreihenfolge gruppiert; jedes Thema mindestens eine Aufgabe, fremde
  // themaIds verworfen.
  const zeilen = input.themaIds.flatMap((themaId) => {
    const eigene = aufgaben.filter((a) => a.themaId === themaId && a.frage?.trim());
    if (!eigene.length) {
      return [
        {
          themaId,
          frage:
            '(Aufgabe konnte der KI-Antwort nicht zugeordnet werden — bitte Testklausur neu erstellen.)',
          minuten: null,
        },
      ];
    }
    return eigene.map((a) => ({
      themaId,
      frage: a.frage,
      minuten:
        typeof a.minuten === 'number' && a.minuten > 0
          ? Math.min(60, Math.max(1, Math.round(a.minuten)))
          : null,
    }));
  });

  const testklausur = await prisma.testklausur.create({
    data: {
      userId: input.userId,
      klausurId: input.klausurId ?? null,
      fachId: input.fachId,
      themaIds: input.themaIds,
      titel: input.titel,
      status: 'erstellt',
      aufgaben: {
        create: zeilen.map((z, i) => ({
          userId: input.userId,
          themaId: z.themaId,
          frage: z.frage,
          minuten: z.minuten,
          reihenfolge: i,
        })),
      },
    },
    include: { aufgaben: { orderBy: { reihenfolge: 'asc' } } },
  });

  if (zaehltAlsVorbereitung) await inkrementiereUsage(prisma, input.userId, 'testklausuren');
  return testklausur;
}
