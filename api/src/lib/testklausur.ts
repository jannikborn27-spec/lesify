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
  if (input.klausurId) {
    const bisherige = await prisma.testklausur.count({
      where: { klausurId: input.klausurId, userId: input.userId },
    });
    if (bisherige >= MAX_TESTKLAUSUREN_PRO_KLAUSUR) {
      throw new HttpError(409, 'testklausur_limit_erreicht', {
        max: MAX_TESTKLAUSUREN_PRO_KLAUSUR,
      });
    }
  }
  await pruefeUsageLimit(prisma, input.userId, 'testklausuren');

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

  const testklausur = await prisma.testklausur.create({
    data: {
      userId: input.userId,
      klausurId: input.klausurId ?? null,
      fachId: input.fachId,
      themaIds: input.themaIds,
      titel: input.titel,
      status: 'erstellt',
      aufgaben: {
        create: input.themaIds.map((themaId, i) => ({
          userId: input.userId,
          themaId,
          frage:
            aufgaben.find((a) => a.themaId === themaId)?.frage ??
            '(Aufgabe konnte der KI-Antwort nicht zugeordnet werden — bitte Testklausur neu erstellen.)',
          reihenfolge: i,
        })),
      },
    },
    include: { aufgaben: { orderBy: { reihenfolge: 'asc' } } },
  });

  await inkrementiereUsage(prisma, input.userId, 'testklausuren');
  return testklausur;
}
