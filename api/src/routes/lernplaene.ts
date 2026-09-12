import type { FastifyInstance } from 'fastify';
import type { Lernplan, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { oder404 } from '../lib/scope.js';
import { HttpError } from '../lib/http.js';
import {
  berechneLernplanStatus,
  chatMapKey,
  setChatMapEintrag,
  testklausurFuerLernplanUI,
} from '../lib/lernplan.js';
import { testklausurErstellen } from '../lib/testklausur.js';
import { klassenstufeFuer, themaMaterial } from '../lib/ki/kontext.js';
import { lernplanLernzettelErzeugen } from '../lib/ki/calls.js';

const checklistPatch = z.union([
  z.object({
    tag: z.number().int().min(1).max(7),
    key: z.string().min(1).max(120),
    checked: z.boolean(),
  }),
  z.object({ tag: z.number().int().min(1).max(7), checked: z.boolean() }),
]);

const chatMapPatch = z.object({
  tag: z.number().int().min(1).max(7),
  modus: z.enum(['erklaeren', 'hausaufgaben', 'ueben', 'zusammenfassen']).nullable().optional(),
  themaId: z.string().uuid(),
  chatId: z.string().uuid(),
});

const lernzettelBody = z.object({ themaIds: z.array(z.string().uuid()).min(1).max(20) });

/** Bevorzugt das Feedback aus Testklausur 2 (aktueller), sonst Testklausur 1. */
async function fehlerHinweisFuer(
  prisma: PrismaClient,
  lp: Lernplan,
  themaId: string,
): Promise<string | undefined> {
  for (const tkId of [lp.testklausur2Id, lp.testklausur1Id]) {
    if (!tkId) continue;
    const e = await prisma.testklausurErgebnis.findFirst({
      where: { testklausurId: tkId, themaId },
    });
    if (e) return e.erklaerung;
  }
  return undefined;
}

/** Rohzustand (persistierte Felder). Der berechnete Zustand kommt als
 *  `status` dazu (siehe `mitStatus`). */
function lernplanDTO(lp: Lernplan) {
  return {
    id: lp.id,
    klausurId: lp.klausurId,
    testklausur1Id: lp.testklausur1Id,
    testklausur2Id: lp.testklausur2Id,
    checklist: lp.checklist,
    tageErledigt: lp.tageErledigt,
    lernzettel: lp.lernzettel,
    chatMap: lp.chatMap,
    erstelltAm: lp.erstelltAm,
  };
}

export async function lernplaeneRoutes(app: FastifyInstance): Promise<void> {
  const { prisma, ki } = app;
  app.addHook('preHandler', app.requireAuth);

  const laden = async (userId: string, id: string) =>
    oder404(await prisma.lernplan.findFirst({ where: { id, userId } }));

  // `klausur`/`testklausur1`/`testklausur2` als volle, verschachtelte Objekte
  // (data.js-Prototyp-Form) dazu — das UI (app.js → lpTag1Body, lpChecklist,
  // lpAufgabeUndErklaerung, …) liest sie direkt, nicht nur `status`.
  const mitStatus = async (lp: Lernplan) => {
    const [status, klausur, testklausur1, testklausur2] = await Promise.all([
      berechneLernplanStatus(prisma, lp),
      prisma.klausur.findUnique({ where: { id: lp.klausurId } }),
      lp.testklausur1Id ? testklausurFuerLernplanUI(prisma, lp.testklausur1Id) : null,
      lp.testklausur2Id ? testklausurFuerLernplanUI(prisma, lp.testklausur2Id) : null,
    ]);
    return {
      ...lernplanDTO(lp),
      status,
      klausur: klausur
        ? {
            id: klausur.id,
            titel: klausur.titel,
            datum: klausur.datum.toISOString().slice(0, 10),
            fachId: klausur.fachId,
            themaIds: klausur.themaIds,
          }
        : null,
      testklausur1,
      testklausur2,
    };
  };

  // GET /lernplaene/:id — persistierte Felder + berechneter `status`
  app.get<{ Params: { id: string } }>('/lernplaene/:id', async (req) => {
    return mitStatus(await laden(req.userId, req.params.id));
  });

  // GET /klausuren/:id/lernplan
  app.get<{ Params: { id: string } }>('/klausuren/:id/lernplan', async (req) => {
    const k = oder404(
      await prisma.klausur.findFirst({
        where: { id: req.params.id, userId: req.userId },
        include: { lernplan: true },
      }),
    );
    return mitStatus(oder404(k.lernplan));
  });

  // PATCH /lernplaene/:id/checklist
  app.patch<{ Params: { id: string } }>('/lernplaene/:id/checklist', async (req) => {
    const patch = parse(checklistPatch, req.body);
    const lp = await laden(req.userId, req.params.id);

    if ('key' in patch) {
      const cl = { ...((lp.checklist as Record<string, Record<string, boolean>> | null) ?? {}) };
      cl[patch.tag] = { ...(cl[patch.tag] ?? {}), [patch.key]: patch.checked };
      const updated = await prisma.lernplan.update({
        where: { id: lp.id },
        data: { checklist: cl },
      });
      return lernplanDTO(updated);
    }

    // „Tag abschließen" / wieder öffnen — bis Phase 7 (Key-Liste je Tag) über den
    // Legacy-Marker `tageErledigt`.
    const set = new Set(lp.tageErledigt);
    if (patch.checked) set.add(patch.tag);
    else set.delete(patch.tag);
    const updated = await prisma.lernplan.update({
      where: { id: lp.id },
      data: { tageErledigt: [...set].sort((a, b) => a - b) },
    });
    return lernplanDTO(updated);
  });

  // PATCH /lernplaene/:id — einen chatMap-Eintrag setzen
  app.patch<{ Params: { id: string } }>('/lernplaene/:id', async (req) => {
    const body = parse(chatMapPatch, req.body);
    await laden(req.userId, req.params.id);
    oder404(await prisma.chat.findFirst({ where: { id: body.chatId, userId: req.userId } }));
    const key = chatMapKey(body.tag, body.modus ?? null, body.themaId);
    const chatMap = await setChatMapEintrag(prisma, req.userId, req.params.id, key, body.chatId);
    return { ...lernplanDTO(await laden(req.userId, req.params.id)), chatMap };
  });

  // GET /lernplaene/:id/lernzettel/dokument — Markdown-Download
  app.get<{ Params: { id: string } }>('/lernplaene/:id/lernzettel/dokument', async (req, reply) => {
    const lp = await laden(req.userId, req.params.id);
    const doc = lp.lernzettel as { content?: string } | null;
    return reply
      .type('text/markdown; charset=utf-8')
      .send(doc?.content ?? '# Lernzettel\n\n_(noch leer)_\n');
  });

  // POST /lernplaene/:id/testklausur2 — Call 10, begrenzt auf die an Tag 1
  // schwachen/wackeligen Themen (§4: „intern der normale POST /testklausuren-Call").
  app.post<{ Params: { id: string } }>('/lernplaene/:id/testklausur2', async (req) => {
    const lp = await laden(req.userId, req.params.id);
    if (lp.testklausur2Id) throw new HttpError(409, 'testklausur2_bereits_gestartet');

    const status = await berechneLernplanStatus(prisma, lp);
    if (!status.tag5.verfuegbar) throw new HttpError(409, 'testklausur2_nicht_verfuegbar');
    if (!status.tag5.noetig) throw new HttpError(409, 'testklausur2_nicht_noetig');

    const klausur = await prisma.klausur.findUniqueOrThrow({ where: { id: lp.klausurId } });
    const testklausur2 = await testklausurErstellen(prisma, ki, {
      userId: req.userId,
      fachId: klausur.fachId,
      themaIds: status.tag1.schwacheThemen,
      titel: `Testklausur 2 — ${klausur.titel}`,
      klausurId: lp.klausurId,
    });
    const updated = await prisma.lernplan.update({
      where: { id: lp.id },
      data: { testklausur2Id: testklausur2.id },
    });
    // mitStatus() lädt testklausur2 jetzt selbst nach (testklausurFuerLernplanUI,
    // reshaped) — das rohe testklausurErstellen()-Ergebnis hier nicht mehr
    // zusätzlich anhängen, sonst überschreibt es die passende Form wieder.
    return mitStatus(updated);
  });

  // POST /lernplaene/:id/lernzettel — Call 12 (Tag 3/4/6), angehängt statt
  // Vollersatz.
  app.post<{ Params: { id: string } }>('/lernplaene/:id/lernzettel', async (req) => {
    const body = parse(lernzettelBody, req.body);
    const lp = await laden(req.userId, req.params.id);
    const klausur = await prisma.klausur.findUniqueOrThrow({ where: { id: lp.klausurId } });
    const fach = oder404(
      await prisma.fach.findFirst({ where: { id: klausur.fachId, userId: req.userId } }),
    );
    const themen = await prisma.thema.findMany({ where: { id: { in: body.themaIds } } });
    if (themen.length !== new Set(body.themaIds).size) throw new HttpError(404, 'nicht_gefunden');

    const klassenstufe = await klassenstufeFuer(prisma, req.userId, klausur.fachId);
    const bisher = (lp.lernzettel as { content?: string } | null)?.content ?? null;

    const themenInput = await Promise.all(
      body.themaIds.map(async (themaId) => {
        const material = await themaMaterial(prisma, themaId);
        return {
          themaId,
          themaName: themen.find((t) => t.id === themaId)?.name ?? themaId,
          material: `${material.lernzettelOderChats}\n${material.dateiZusammenfassungen}`,
          fehlerHinweis: await fehlerHinweisFuer(prisma, lp, themaId),
        };
      }),
    );

    const eintraege = await lernplanLernzettelErzeugen(ki, {
      klassenstufe,
      fachName: fach.name,
      bisherigerLernzettel: bisher,
      themen: themenInput,
    });

    const neu = eintraege.map((e) => e.abschnitt).join('\n\n');
    const content = bisher ? `${bisher}\n\n${neu}` : `# Lernzettel\n\n${neu}`;
    const aktualisiertAm = new Date().toISOString();

    const updated = await prisma.lernplan.update({
      where: { id: lp.id },
      data: { lernzettel: { content, aktualisiertAm } },
    });
    return updated.lernzettel;
  });
}
