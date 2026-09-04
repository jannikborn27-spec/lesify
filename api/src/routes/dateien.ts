import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { oder404 } from '../lib/scope.js';

const dateiDTO = (d: {
  id: string;
  fachId: string;
  themaId: string;
  name: string;
  typ: string;
  groesseBytes: number;
  status: string;
  zusammenfassung: string | null;
  erstelltAm: Date;
  fach?: { name: string } | null;
}) => ({
  id: d.id,
  fachId: d.fachId,
  themaId: d.themaId,
  name: d.name,
  typ: d.typ,
  groesseBytes: d.groesseBytes,
  status: d.status,
  zusammenfassung: d.zusammenfassung,
  erstelltAm: d.erstelltAm,
  ...(d.fach ? { fachName: d.fach.name } : {}),
});

export async function dateienRoutes(app: FastifyInstance): Promise<void> {
  const { prisma } = app;
  app.addHook('preHandler', app.requireAuth);

  // GET /dateien?themaId=
  app.get('/dateien', async (req) => {
    const { themaId } = parse(z.object({ themaId: z.string().uuid().optional() }), req.query);
    const dateien = await prisma.datei.findMany({
      where: { userId: req.userId, ...(themaId ? { themaId } : {}) },
      orderBy: { erstelltAm: 'desc' },
      include: { fach: { select: { name: true } } },
    });
    return dateien.map(dateiDTO);
  });

  // GET /dateien/:id
  app.get<{ Params: { id: string } }>('/dateien/:id', async (req) => {
    const datei = oder404(
      await prisma.datei.findFirst({
        where: { id: req.params.id, userId: req.userId },
        include: { fach: { select: { name: true } } },
      }),
    );
    return dateiDTO(datei);
  });

  // GET /dateien/:id/inhalt — signierte URL / Stream: Phase 5 (Objektspeicher).
}
