import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { oder404 } from '../lib/scope.js';

export async function testklausurenRoutes(app: FastifyInstance): Promise<void> {
  const { prisma } = app;
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
  // Skelett: nimmt eine bereits vorhandene Datei-ID entgegen. Der echte
  // multipart-Upload läuft in Phase 5 über den Objektspeicher-Mechanismus.
  app.post<{ Params: { id: string } }>('/testklausuren/:id/loesung', async (req) => {
    const { geloesteDateiId } = parse(z.object({ geloesteDateiId: z.string().uuid() }), req.body);
    const t = oder404(await laden(req.userId, req.params.id));
    oder404(await prisma.datei.findFirst({ where: { id: geloesteDateiId, userId: req.userId } }));
    const updated = await prisma.testklausur.update({
      where: { id: t.id },
      data: { geloesteDateiId, status: 'geloest' },
    });
    return { id: updated.id, status: updated.status, geloesteDateiId: updated.geloesteDateiId };
  });

  // POST /testklausuren            → Phase 6 (KI-Aufgabengenerierung; 3. Aufruf/klausurId hart ablehnen)
  // POST /testklausuren/:id/analyse → Phase 6 (KI-Auswertung → Ergebnis + Vorbereitungsstand)
}
