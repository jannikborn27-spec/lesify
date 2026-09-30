import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { HttpError, nichtGefunden } from '../lib/http.js';
import { oder404 } from '../lib/scope.js';
import { klausurNoteFuer } from '../lib/lernplan.js';
import { testklausurErstellen } from '../lib/testklausur.js';
import { klausurLoeschen } from '../lib/inhalteLoeschen.js';
import { pruefeUsageLimit } from '../lib/usage.js';

const erstellen = z.object({
  fachId: z.string().uuid(),
  themaIds: z.array(z.string().uuid()).min(1).max(20),
  titel: z.string().trim().min(1).max(160),
  datum: z.coerce.date(),
});

export async function klausurenRoutes(app: FastifyInstance): Promise<void> {
  const { prisma, ki, storage } = app;
  app.addHook('preHandler', app.requireAuth);

  // POST /klausuren — legt Klausur + Testklausur 1 (Call 10, KI) + Lernplan an.
  // Kein DB-`$transaction`: der KI-Call darf keine Transaktion offen halten.
  app.post('/klausuren', async (req, reply) => {
    const body = parse(erstellen, req.body);
    const userId = req.userId;

    oder404(await prisma.fach.findFirst({ where: { id: body.fachId, userId } }));
    // Keine Klausuren in der Vergangenheit anlegen (2026-09-30) — Stichtag
    // „heute" in deutscher Zeit, der heutige Tag selbst ist erlaubt.
    const heute = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Berlin' });
    if (body.datum.toISOString().slice(0, 10) < heute) {
      throw new HttpError(400, 'klausur_datum_vergangen');
    }
    // Eine Klausur = eine „Klausurvorbereitung" (Usage-Zähler `testklausuren`):
    // vor dem Anlegen prüfen, damit keine halbe Klausur entsteht.
    await pruefeUsageLimit(prisma, userId, 'testklausuren');
    const themen = await prisma.thema.findMany({
      where: { id: { in: body.themaIds }, userId, fachId: body.fachId },
      select: { id: true },
    });
    if (themen.length !== new Set(body.themaIds).size) nichtGefunden();

    const klausur = await prisma.klausur.create({
      data: {
        userId,
        fachId: body.fachId,
        themaIds: body.themaIds,
        titel: body.titel,
        datum: body.datum,
      },
    });

    try {
      const testklausur1 = await testklausurErstellen(prisma, ki, {
        userId,
        fachId: body.fachId,
        themaIds: body.themaIds,
        titel: `Testklausur 1 — ${body.titel}`,
        klausurId: klausur.id,
      });
      const lernplan = await prisma.lernplan.create({
        data: { userId, klausurId: klausur.id, testklausur1Id: testklausur1.id },
      });
      return reply.code(201).send({ klausur, lernplan, testklausur1 });
    } catch (err) {
      // Aufräumen, falls Testklausur/Lernplan nach der Klausur fehlschlagen
      // (kein DB-Transaktions-Schutz über den KI-Call hinweg möglich).
      await prisma.klausur.delete({ where: { id: klausur.id } }).catch(() => {});
      throw err;
    }
  });

  // GET /klausuren — „bereits geschrieben" leitet der Client aus `datum` ab.
  app.get('/klausuren', async (req) => {
    const klausuren = await prisma.klausur.findMany({
      where: { userId: req.userId },
      orderBy: { datum: 'asc' },
      include: { fach: { select: { name: true, farbe: true } } },
    });
    return Promise.all(
      klausuren.map(async (k) => ({
        id: k.id,
        fachId: k.fachId,
        fachName: k.fach.name,
        farbe: k.fach.farbe,
        themaIds: k.themaIds,
        titel: k.titel,
        datum: k.datum.toISOString().slice(0, 10),
        erstelltAm: k.erstelltAm,
        note: await klausurNoteFuer(prisma, k.id),
      })),
    );
  });

  // DELETE /klausuren/:id — Klausur samt Lernplan und Testklausuren
  // (2026-09-30). Usage wird nicht gutgeschrieben.
  app.delete<{ Params: { id: string } }>('/klausuren/:id', async (req, reply) => {
    const klausur = oder404(
      await prisma.klausur.findFirst({ where: { id: req.params.id, userId: req.userId } }),
    );
    await klausurLoeschen(prisma, storage, req.userId, klausur.id, (err) =>
      app.log.error({ err }, 'inhalt_speicher_loeschen_fehlgeschlagen'),
    );
    return reply.code(204).send();
  });

  // GET /klausuren/:id — Detail inkl. Lernplan + Testklausuren
  app.get<{ Params: { id: string } }>('/klausuren/:id', async (req) => {
    const k = oder404(
      await prisma.klausur.findFirst({
        where: { id: req.params.id, userId: req.userId },
        include: {
          fach: { select: { name: true, farbe: true } },
          lernplan: true,
          testklausuren: {
            orderBy: { erstelltAm: 'asc' },
            select: { id: true, titel: true, status: true, themaIds: true },
          },
        },
      }),
    );
    return {
      id: k.id,
      fachId: k.fachId,
      fachName: k.fach.name,
      farbe: k.fach.farbe,
      themaIds: k.themaIds,
      titel: k.titel,
      datum: k.datum.toISOString().slice(0, 10),
      erstelltAm: k.erstelltAm,
      note: await klausurNoteFuer(prisma, k.id),
      lernplan: k.lernplan,
      testklausuren: k.testklausuren,
    };
  });
}
