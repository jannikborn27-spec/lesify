import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { oder404 } from '../lib/scope.js';
import { themaDTO } from '../lib/dto.js';
import { klausurenAnzahlProThema } from '../lib/themen.js';

const erstellen = z.object({
  fachId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  beschreibung: z.string().trim().max(2000).optional(),
});

export async function themenRoutes(app: FastifyInstance): Promise<void> {
  const { prisma } = app;
  app.addHook('preHandler', app.requireAuth);

  // GET /themen — fächerübergreifende Aggregat-Liste, mit Zählwerten
  // (für themen.html — themaCard() zeigt dort standardmäßig alle vier).
  app.get('/themen', async (req) => {
    const [themen, klausurenProThema] = await Promise.all([
      prisma.thema.findMany({
        where: { userId: req.userId },
        orderBy: [{ fach: { name: 'asc' } }, { name: 'asc' }],
        include: {
          fach: true,
          _count: { select: { chats: true, lernzettel: true, dateien: true } },
        },
      }),
      klausurenAnzahlProThema(prisma, req.userId),
    ]);
    return themen.map((t) =>
      themaDTO(t, {
        chats: t._count.chats,
        lernzettel: t._count.lernzettel,
        dateien: t._count.dateien,
        klausuren: klausurenProThema.get(t.id) ?? 0,
      }),
    );
  });

  // POST /themen
  app.post('/themen', async (req, reply) => {
    const body = parse(erstellen, req.body);
    oder404(await prisma.fach.findFirst({ where: { id: body.fachId, userId: req.userId } }));
    const thema = await prisma.thema.create({
      data: {
        userId: req.userId,
        fachId: body.fachId,
        name: body.name,
        beschreibung: body.beschreibung ?? '',
      },
      include: { fach: true },
    });
    return reply.code(201).send(themaDTO(thema));
  });

  // GET /themen/:id — inkl. Zählwerten + gekürzten Listen
  app.get<{ Params: { id: string } }>('/themen/:id', async (req) => {
    const thema = oder404(
      await prisma.thema.findFirst({
        where: { id: req.params.id, userId: req.userId },
        include: { fach: true },
      }),
    );

    const themaId = thema.id;
    const [
      chats,
      lernzettel,
      dateien,
      klausuren,
      testklausuren,
      nChats,
      nLernzettel,
      nDateien,
      nKlausuren,
      nTestklausuren,
    ] = await Promise.all([
      prisma.chat.findMany({
        where: { themaId },
        orderBy: { aktualisiertAm: 'desc' },
        take: 5,
        select: { id: true, titel: true, modus: true, aktualisiertAm: true },
      }),
      prisma.lernzettel.findMany({
        where: { themaId },
        orderBy: { aktualisiertAm: 'desc' },
        take: 5,
        select: { id: true, titel: true, aktualisiertAm: true },
      }),
      prisma.datei.findMany({
        where: { themaId },
        orderBy: { erstelltAm: 'desc' },
        take: 5,
        select: { id: true, name: true, typ: true, status: true },
      }),
      prisma.klausur.findMany({
        where: { themaIds: { has: themaId } },
        orderBy: { datum: 'asc' },
        take: 5,
        select: { id: true, titel: true, datum: true },
      }),
      prisma.testklausur.findMany({
        where: { themaIds: { has: themaId } },
        orderBy: { erstelltAm: 'desc' },
        take: 5,
        select: { id: true, titel: true, status: true },
      }),
      prisma.chat.count({ where: { themaId } }),
      prisma.lernzettel.count({ where: { themaId } }),
      prisma.datei.count({ where: { themaId } }),
      prisma.klausur.count({ where: { themaIds: { has: themaId } } }),
      prisma.testklausur.count({ where: { themaIds: { has: themaId } } }),
    ]);

    return {
      ...themaDTO(thema),
      stats: {
        chats: nChats,
        lernzettel: nLernzettel,
        dateien: nDateien,
        klausuren: nKlausuren,
        testklausuren: nTestklausuren,
      },
      chats,
      lernzettel,
      dateien,
      klausuren,
      testklausuren,
    };
  });
}
