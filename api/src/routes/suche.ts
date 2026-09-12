import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../lib/validate.js';

const GRUPPE_LIMIT = 8;

interface Treffer {
  title: string;
  sub: string;
  href: string;
  fachId: string;
  fachName: string;
}
interface Gruppe {
  type: string;
  label: string;
  icon: string;
  items: Treffer[];
}

export async function sucheRoutes(app: FastifyInstance): Promise<void> {
  const { prisma } = app;
  app.addHook('preHandler', app.requireAuth);

  // GET /suche?q= — Substring-Match (ILIKE) über Titel-/Namensfelder (§4).
  app.get('/suche', async (req) => {
    const { q } = parse(z.object({ q: z.string().trim().min(1).max(100) }), req.query);
    const userId = req.userId;
    const like = { contains: q, mode: 'insensitive' as const };
    const take = GRUPPE_LIMIT;

    const [faecher, themen, chats, lernzettel, dateien, klausuren, testklausuren] =
      await Promise.all([
        prisma.fach.findMany({ where: { userId, name: like }, take, orderBy: { name: 'asc' } }),
        prisma.thema.findMany({
          where: { userId, name: like },
          take,
          orderBy: { name: 'asc' },
          include: { fach: true },
        }),
        prisma.chat.findMany({
          where: { userId, titel: like },
          take,
          orderBy: { aktualisiertAm: 'desc' },
          include: { fach: true },
        }),
        prisma.lernzettel.findMany({
          where: { userId, titel: like },
          take,
          orderBy: { aktualisiertAm: 'desc' },
          include: { fach: true },
        }),
        prisma.datei.findMany({
          where: { userId, name: like },
          take,
          orderBy: { erstelltAm: 'desc' },
          include: { fach: true },
        }),
        prisma.klausur.findMany({
          where: { userId, titel: like },
          take,
          orderBy: { datum: 'asc' },
          include: { fach: true },
        }),
        prisma.testklausur.findMany({
          where: { userId, titel: like },
          take,
          orderBy: { erstelltAm: 'desc' },
          include: { fach: true },
        }),
      ]);

    const gruppen: Gruppe[] = [];
    const add = (type: string, label: string, icon: string, items: Treffer[]) => {
      if (items.length) gruppen.push({ type, label, icon, items });
    };

    add(
      'fach',
      'Fächer',
      'fach',
      faecher.map((f) => ({
        title: f.name,
        sub: f.klasse ?? 'Fach',
        href: `fach.html?id=${f.id}`,
        fachId: f.id,
        fachName: f.name,
      })),
    );
    add(
      'thema',
      'Themen',
      'thema',
      themen.map((t) => ({
        title: t.name,
        sub: t.fach.name,
        href: `thema.html?id=${t.id}`,
        fachId: t.fachId,
        fachName: t.fach.name,
      })),
    );
    add(
      'chat',
      'Chats',
      'chat',
      chats.map((c) => ({
        title: c.titel,
        sub: c.fach.name,
        href: `chat.html?fach=${c.fachId}&thema=${c.themaId}&chat=${c.id}`,
        fachId: c.fachId,
        fachName: c.fach.name,
      })),
    );
    add(
      'lernzettel',
      'Lernzettel',
      'lernzettel',
      lernzettel.map((l) => ({
        title: l.titel,
        sub: l.fach.name,
        href: `lernzettel.html?id=${l.id}`,
        fachId: l.fachId,
        fachName: l.fach.name,
      })),
    );
    add(
      'datei',
      'Dateien',
      'datei',
      dateien.map((d) => ({
        title: d.name,
        sub: d.typ,
        href: `thema.html?id=${d.themaId}&tab=dateien`,
        fachId: d.fachId,
        fachName: d.fach.name,
      })),
    );
    add(
      'klausur',
      'Klausuren',
      'klausur',
      klausuren.map((k) => ({
        title: k.titel,
        sub: k.datum.toISOString().slice(0, 10),
        href: `klausur.html?id=${k.id}`,
        fachId: k.fachId,
        fachName: k.fach.name,
      })),
    );
    add(
      'testklausur',
      'Testklausuren',
      'testklausur',
      testklausuren.map((t) => ({
        title: t.titel,
        sub: t.status,
        href: `testklausur.html?id=${t.id}`,
        fachId: t.fachId,
        fachName: t.fach.name,
      })),
    );

    return gruppen;
  });
}
