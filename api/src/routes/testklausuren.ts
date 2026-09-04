import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { noteAmpel, prozentZuNote } from '@lesify/shared';
import { parse } from '../lib/validate.js';
import { oder404 } from '../lib/scope.js';
import { HttpError } from '../lib/http.js';
import { testklausurErstellen } from '../lib/testklausur.js';
import { klassenstufeFuer, themaMaterial } from '../lib/ki/kontext.js';
import { testklausurAnalyseErzeugen } from '../lib/ki/calls.js';

const erstellenBody = z.object({
  fachId: z.string().uuid(),
  themaIds: z.array(z.string().uuid()).min(1).max(20),
  titel: z.string().trim().min(1).max(160),
  klausurId: z.string().uuid().optional(),
});

const loesungBody = z
  .object({
    geloesteDateiId: z.string().uuid().optional(),
    // Bridge bis Phase 5 (echte Datei-Extraktion): Klartext der Lösung direkt
    // mitschicken. Mindestens eines der beiden Felder ist Pflicht.
    loesungsText: z.string().trim().min(1).max(20000).optional(),
  })
  .refine((o) => o.geloesteDateiId ?? o.loesungsText, 'geloesteDateiId oder loesungsText nötig');

export async function testklausurenRoutes(app: FastifyInstance): Promise<void> {
  const { prisma, ki } = app;
  app.addHook('preHandler', app.requireAuth);

  const laden = (userId: string, id: string) =>
    prisma.testklausur.findFirst({
      where: { id, userId },
      include: {
        aufgaben: { orderBy: { reihenfolge: 'asc' } },
        ergebnisse: true,
        vorbereitung: true,
      },
    });

  // POST /testklausuren — Call 10, für Testklausur 1 (via /klausuren) und 2
  // (via /lernplaene/:id/testklausur2) dieselbe Funktion.
  app.post('/testklausuren', async (req, reply) => {
    const body = parse(erstellenBody, req.body);
    oder404(await prisma.fach.findFirst({ where: { id: body.fachId, userId: req.userId } }));
    const t = await testklausurErstellen(prisma, ki, { userId: req.userId, ...body });
    return reply.code(201).send(t);
  });

  // GET /testklausuren/:id — voller Zustand
  app.get<{ Params: { id: string } }>('/testklausuren/:id', async (req) => {
    const t = oder404(await laden(req.userId, req.params.id));
    return {
      id: t.id,
      klausurId: t.klausurId,
      fachId: t.fachId,
      themaIds: t.themaIds,
      titel: t.titel,
      status: t.status,
      geloesteDateiId: t.geloesteDateiId,
      erstelltAm: t.erstelltAm,
      aufgaben: t.aufgaben.map((a) => ({
        id: a.id,
        themaId: a.themaId,
        frage: a.frage,
        reihenfolge: a.reihenfolge,
      })),
      ergebnisse: t.ergebnisse,
      vorbereitung: t.vorbereitung,
    };
  });

  // GET /testklausuren/:id/dokument — Aufgaben als Text-Download
  app.get<{ Params: { id: string } }>('/testklausuren/:id/dokument', async (req, reply) => {
    const t = oder404(await laden(req.userId, req.params.id));
    const text =
      `${t.titel}\n\n` +
      t.aufgaben.map((a, i) => `Aufgabe ${i + 1}\n${a.frage}\n`).join('\n') +
      '\n';
    return reply.type('text/plain; charset=utf-8').send(text);
  });

  // POST /testklausuren/:id/loesung
  // `geloesteDateiId` referenziert eine vorhandene Datei (echter Upload:
  // Phase 5). `loesungsText` ist die Bridge, bis die Datei-Extraktion steht.
  app.post<{ Params: { id: string } }>('/testklausuren/:id/loesung', async (req) => {
    const body = parse(loesungBody, req.body);
    const t = oder404(await laden(req.userId, req.params.id));
    if (body.geloesteDateiId) {
      oder404(
        await prisma.datei.findFirst({ where: { id: body.geloesteDateiId, userId: req.userId } }),
      );
    }
    const updated = await prisma.testklausur.update({
      where: { id: t.id },
      data: {
        geloesteDateiId: body.geloesteDateiId ?? t.geloesteDateiId,
        loesungsText: body.loesungsText ?? t.loesungsText,
        status: 'geloest',
      },
    });
    return {
      id: updated.id,
      status: updated.status,
      geloesteDateiId: updated.geloesteDateiId,
      hatLoesungsText: !!updated.loesungsText,
    };
  });

  // POST /testklausuren/:id/analyse — Call 11
  app.post<{ Params: { id: string } }>('/testklausuren/:id/analyse', async (req) => {
    const t = oder404(await laden(req.userId, req.params.id));
    if (t.status !== 'geloest') throw new HttpError(409, 'testklausur_nicht_geloest');
    if (!t.loesungsText) {
      // Phase 5 wird geloesteDateiId hier automatisch in loesungsText
      // extrahieren; bis dahin muss der Text direkt mitgeschickt worden sein.
      throw new HttpError(422, 'keine_loesung_extrahiert');
    }

    const klassenstufe = await klassenstufeFuer(prisma, req.userId, t.fachId);
    const fach = oder404(
      await prisma.fach.findFirst({ where: { id: t.fachId, userId: req.userId } }),
    );
    const themen = await prisma.thema.findMany({ where: { id: { in: t.themaIds } } });
    const aufgabenMitMaterial = await Promise.all(
      t.aufgaben.map(async (a) => {
        const material = await themaMaterial(prisma, a.themaId);
        return {
          themaId: a.themaId,
          themaName: themen.find((th) => th.id === a.themaId)?.name ?? a.themaId,
          frage: a.frage,
          material: `${material.lernzettelOderChats}\n${material.dateiZusammenfassungen}`,
        };
      }),
    );

    const ergebnisse = await testklausurAnalyseErzeugen(ki, {
      klassenstufe,
      fachName: fach.name,
      aufgaben: aufgabenMitMaterial,
      loesungsText: t.loesungsText,
    });

    const zeilen = ergebnisse.map((e) => {
      const note = prozentZuNote(e.prozent);
      return {
        themaId: e.themaId,
        prozent: e.prozent,
        note,
        erklaerung: e.erklaerung,
        ampel: noteAmpel(note),
      };
    });

    await prisma.$transaction([
      prisma.testklausurErgebnis.createMany({
        data: zeilen.map((z) => ({
          userId: req.userId,
          testklausurId: t.id,
          themaId: z.themaId,
          prozent: z.prozent,
          note: z.note,
          erklaerung: z.erklaerung,
        })),
      }),
      prisma.vorbereitungsstand.createMany({
        data: zeilen.map((z) => ({
          userId: req.userId,
          testklausurId: t.id,
          themaId: z.themaId,
          prozent: z.prozent,
          note: z.note,
          ampel: z.ampel,
        })),
      }),
      prisma.testklausur.update({ where: { id: t.id }, data: { status: 'analysiert' } }),
    ]);

    return laden(req.userId, t.id);
  });
}
