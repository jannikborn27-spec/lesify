import type { FastifyInstance } from 'fastify';
import type { Lernplan } from '@prisma/client';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { oder404 } from '../lib/scope.js';
import { chatMapKey, setChatMapEintrag } from '../lib/lernplan.js';

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

/** Rohzustand — der voll BERECHNETE Zustand (aktueller Tag, schwache Themen …)
 *  kommt in Phase 7 (`lernplanStatus`). */
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
  const { prisma } = app;
  app.addHook('preHandler', app.requireAuth);

  const laden = async (userId: string, id: string) =>
    oder404(await prisma.lernplan.findFirst({ where: { id, userId } }));

  // GET /lernplaene/:id  (Rohzustand; berechneter Zustand = Phase 7)
  app.get<{ Params: { id: string } }>('/lernplaene/:id', async (req) => {
    return lernplanDTO(await laden(req.userId, req.params.id));
  });

  // GET /klausuren/:id/lernplan
  app.get<{ Params: { id: string } }>('/klausuren/:id/lernplan', async (req) => {
    const k = oder404(
      await prisma.klausur.findFirst({
        where: { id: req.params.id, userId: req.userId },
        include: { lernplan: true },
      }),
    );
    return lernplanDTO(oder404(k.lernplan));
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

  // POST /lernplaene/:id/testklausur2  und  .../lernzettel  → Phase 6 (KI).
}
