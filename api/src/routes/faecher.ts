import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FACH_COLOR_DEFAULT, FACH_COLOR_KEYS, FACH_ICON_KEYS } from '@lesify/shared';
import { parse } from '../lib/validate.js';
import { oder404 } from '../lib/scope.js';
import { fachDTO, themaDTO } from '../lib/dto.js';

const farbeSchema = z.enum(FACH_COLOR_KEYS);

const erstellen = z.object({
  name: z.string().trim().min(1).max(80),
  klasse: z.string().trim().max(40).optional(),
  farbe: farbeSchema.optional(),
  icon: z
    .string()
    .refine((v) => FACH_ICON_KEYS.includes(v), 'unbekanntes icon')
    .optional(),
});

export async function faecherRoutes(app: FastifyInstance): Promise<void> {
  const { prisma } = app;
  app.addHook('preHandler', app.requireAuth);

  // GET /faecher — Liste inkl. Zählwerten
  app.get('/faecher', async (req) => {
    const faecher = await prisma.fach.findMany({
      where: { userId: req.userId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { themen: true, klausuren: true } } },
    });
    return faecher.map((f) =>
      fachDTO(f, { themen: f._count.themen, klausuren: f._count.klausuren }),
    );
  });

  // POST /faecher
  app.post('/faecher', async (req, reply) => {
    const body = parse(erstellen, req.body);
    const anzahl = await prisma.fach.count({ where: { userId: req.userId } });
    const farbe =
      body.farbe ?? FACH_COLOR_KEYS[anzahl % FACH_COLOR_KEYS.length] ?? FACH_COLOR_DEFAULT;
    const fach = await prisma.fach.create({
      data: {
        userId: req.userId,
        name: body.name,
        klasse: body.klasse ?? null,
        initial: [...body.name][0]!.toUpperCase(),
        farbe,
        icon: body.icon ?? null,
      },
    });
    return reply.code(201).send(fachDTO(fach));
  });

  // PATCH /faecher/:id — nur farbe
  app.patch<{ Params: { id: string } }>('/faecher/:id', async (req) => {
    const { farbe } = parse(z.object({ farbe: farbeSchema }), req.body);
    const vorhanden = oder404(
      await prisma.fach.findFirst({ where: { id: req.params.id, userId: req.userId } }),
    );
    const fach = await prisma.fach.update({ where: { id: vorhanden.id }, data: { farbe } });
    return fachDTO(fach);
  });

  // GET /faecher/:id/themen
  // Mit Zählwerten (Chats/Lernzettel/Dateien) — Klausuren/Testklausuren
  // hängen über `themaIds` (String-Array) statt einer echten Relation und
  // lassen sich darum nicht über `_count` mitziehen (siehe GET /themen/:id
  // für den vollen, teureren Weg per Thema).
  app.get<{ Params: { id: string } }>('/faecher/:id/themen', async (req) => {
    oder404(await prisma.fach.findFirst({ where: { id: req.params.id, userId: req.userId } }));
    const themen = await prisma.thema.findMany({
      where: { fachId: req.params.id, userId: req.userId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { chats: true, lernzettel: true, dateien: true } } },
    });
    return themen.map((t) =>
      themaDTO(t, {
        chats: t._count.chats,
        lernzettel: t._count.lernzettel,
        dateien: t._count.dateien,
      }),
    );
  });
}
