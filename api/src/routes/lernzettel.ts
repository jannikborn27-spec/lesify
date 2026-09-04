import type { FastifyInstance } from 'fastify';
import { oder404 } from '../lib/scope.js';

export async function lernzettelRoutes(app: FastifyInstance): Promise<void> {
  const { prisma } = app;
  app.addHook('preHandler', app.requireAuth);

  // GET /lernzettel/:id — Inhalt + Revisionsverlauf + freeMessagesUsed
  // (Erstellung + Revisions-KI-Call: Phase 6)
  app.get<{ Params: { id: string } }>('/lernzettel/:id', async (req) => {
    const lz = oder404(
      await prisma.lernzettel.findFirst({
        where: { id: req.params.id, userId: req.userId },
        include: { revisionen: { orderBy: { erstelltAm: 'asc' } } },
      }),
    );
    return {
      id: lz.id,
      fachId: lz.fachId,
      themaId: lz.themaId,
      titel: lz.titel,
      content: lz.content,
      freeMessagesUsed: lz.freeMessagesUsed,
      erstelltAm: lz.erstelltAm,
      aktualisiertAm: lz.aktualisiertAm,
      revisionen: lz.revisionen.map((r) => ({
        id: r.id,
        rolle: r.rolle,
        text: r.text,
        erstelltAm: r.erstelltAm,
      })),
    };
  });
}
