import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { noteAmpel, prozentZuNote } from '@lesify/shared';
import { parse } from '../lib/validate.js';
import { oder404 } from '../lib/scope.js';
import { testklausurPdf } from '../lib/pdf/dokumente.js';
import { pdfAntwort } from '../lib/pdf/antwort.js';
import { HttpError } from '../lib/http.js';
import { testklausurErstellen } from '../lib/testklausur.js';
import { klassenstufeFuer, themaMaterial } from '../lib/ki/kontext.js';
import { testklausurAnalyseErzeugen } from '../lib/ki/calls.js';
import { typAusMime } from '../lib/dateiExtraktion.js';
import { loesungTextExtrahieren } from '../lib/dateiVerarbeitung.js';
import { liesDateiTeil } from '../lib/upload.js';

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
  const { prisma, ki, storage } = app;
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

  // GET /testklausuren/:id/dokument — Testklausur als PDF (Basisvorlage +
  // Aufgaben mit Antwortfeldern); `?download=1` erzwingt den Speichern-Dialog.
  app.get<{ Params: { id: string } }>('/testklausuren/:id/dokument', async (req, reply) => {
    const { download } = parse(z.object({ download: z.enum(['0', '1']).optional() }), req.query);
    const t = oder404(await laden(req.userId, req.params.id));
    const [fach, themen] = await Promise.all([
      prisma.fach.findUniqueOrThrow({ where: { id: t.fachId } }),
      prisma.thema.findMany({ where: { id: { in: t.themaIds }, userId: req.userId } }),
    ]);
    const pdf = await testklausurPdf({
      titel: t.titel,
      fachName: fach.name,
      fachFarbe: fach.farbe,
      klasse: fach.klasse,
      erstelltAm: t.erstelltAm,
      aufgaben: t.aufgaben.map((a) => ({
        themaName: themen.find((th) => th.id === a.themaId)?.name ?? 'Thema',
        frage: a.frage,
      })),
    });
    return pdfAntwort(reply, pdf, t.titel, download === '1');
  });

  // POST /testklausuren/:id/loesung
  // Multipart: echter Foto-/PDF-Upload (Phase 5) — landet nicht in der
  // Themen-Dateiliste, zählt nicht gegen das Content-Limit (`zweck:
  // testklausurLoesung`), Text-Extraktion (pdf/doc) bzw. Vision-Transkription
  // (img) läuft synchron. JSON `loesungsText`: Bridge/Testing-Pfad, unverändert.
  app.post<{ Params: { id: string } }>('/testklausuren/:id/loesung', async (req) => {
    const t = oder404(await laden(req.userId, req.params.id));

    if (req.isMultipart()) {
      const teil = await req.file();
      if (!teil) throw new HttpError(400, 'validierung', { grund: 'keine_datei' });
      const typ = typAusMime(teil.mimetype);
      if (!typ) throw new HttpError(400, 'dateityp_nicht_unterstuetzt', { mime: teil.mimetype });

      const buffer = await liesDateiTeil(teil);

      const key = `${req.userId}/testklausur-loesungen/${t.id}/${randomUUID()}-${teil.filename}`;
      await storage.hochladen(key, buffer, teil.mimetype);
      const datei = await prisma.datei.create({
        data: {
          userId: req.userId,
          fachId: t.fachId,
          // Datei.themaId ist eine Pflicht-FK; Testklausuren haben immer ≥1 Thema
          // (erstellenBody.themaIds.min(1)). `zweck: testklausurLoesung` hält die
          // Datei trotzdem aus der Themen-Dateiliste raus (GET /dateien filtert).
          themaId: t.themaIds[0]!,
          name: teil.filename,
          typ,
          mime: teil.mimetype,
          groesseBytes: buffer.byteLength,
          speicherPfad: key,
          status: 'bereit',
          zweck: 'testklausurLoesung',
        },
      });

      const loesungsText = await loesungTextExtrahieren(ki, buffer, typ, teil.mimetype);
      const updated = await prisma.testklausur.update({
        where: { id: t.id },
        data: { geloesteDateiId: datei.id, loesungsText, status: 'geloest' },
      });
      return {
        id: updated.id,
        status: updated.status,
        geloesteDateiId: updated.geloesteDateiId,
        hatLoesungsText: !!updated.loesungsText,
      };
    }

    const body = parse(loesungBody, req.body);
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
      // Strict-Tool-Schemas erlauben kein minimum/maximum — Bereich hier absichern.
      const prozent = Math.min(100, Math.max(0, Math.round(e.prozent)));
      const note = prozentZuNote(prozent);
      return {
        themaId: e.themaId,
        prozent,
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
