import type { FastifyInstance } from 'fastify';
import type { Chat, Fach, Thema } from '@prisma/client';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { nichtGefunden } from '../lib/http.js';
import { oder404 } from '../lib/scope.js';
import { inkrementiereUsage, pruefeUsageLimit } from '../lib/usage.js';
import { chatMapKey, setChatMapEintrag } from '../lib/lernplan.js';

const erstellen = z.object({
  fachId: z.string().uuid(),
  themaId: z.string().uuid(),
  modus: z.enum(['erklaeren', 'hausaufgaben', 'ueben', 'zusammenfassen']).optional(),
});

const nachricht = z.object({
  text: z.string().trim().min(1).max(8000),
  anhangDateiId: z.string().uuid().optional(),
  lernplanKontext: z
    .object({ lernplanId: z.string().uuid(), tag: z.number().int().min(1).max(7) })
    .optional(),
});

function chatDTO(c: Chat & { fach?: Fach | null; thema?: Thema | null }) {
  return {
    id: c.id,
    fachId: c.fachId,
    themaId: c.themaId,
    titel: c.titel,
    modus: c.modus,
    erstelltAm: c.erstelltAm,
    aktualisiertAm: c.aktualisiertAm,
    ...(c.fach ? { fachName: c.fach.name, farbe: c.fach.farbe } : {}),
    ...(c.thema ? { themaName: c.thema.name } : {}),
  };
}

/** Prototyp-Ersatz für den KI-Titel-Call (Prompt 07 kommt in Phase 6). */
function platzhalterTitel(text: string): string {
  const s = text.trim().replace(/\s+/g, ' ');
  return s.length <= 48 ? s : `${s.slice(0, 47)}…`;
}

export async function chatsRoutes(app: FastifyInstance): Promise<void> {
  const { prisma } = app;
  app.addHook('preHandler', app.requireAuth);

  // GET /chats?fachId=
  app.get('/chats', async (req) => {
    const { fachId } = parse(z.object({ fachId: z.string().uuid().optional() }), req.query);
    const chats = await prisma.chat.findMany({
      where: { userId: req.userId, ...(fachId ? { fachId } : {}) },
      orderBy: { aktualisiertAm: 'desc' },
      include: { fach: true, thema: true },
    });
    return chats.map(chatDTO);
  });

  // POST /chats — Chat-Zeile anlegen (Client ruft das erst beim ersten Senden auf)
  app.post('/chats', async (req, reply) => {
    const body = parse(erstellen, req.body);
    const thema = oder404(
      await prisma.thema.findFirst({ where: { id: body.themaId, userId: req.userId } }),
    );
    if (thema.fachId !== body.fachId) nichtGefunden();
    const chat = await prisma.chat.create({
      data: {
        userId: req.userId,
        fachId: body.fachId,
        themaId: body.themaId,
        modus: body.modus ?? null,
        titel: '',
      },
      include: { fach: true, thema: true },
    });
    return reply.code(201).send(chatDTO(chat));
  });

  // GET /chats/:id inkl. Nachrichten
  app.get<{ Params: { id: string } }>('/chats/:id', async (req) => {
    const chat = oder404(
      await prisma.chat.findFirst({
        where: { id: req.params.id, userId: req.userId },
        include: {
          fach: true,
          thema: true,
          nachrichten: { orderBy: { erstelltAm: 'asc' } },
        },
      }),
    );
    return {
      ...chatDTO(chat),
      nachrichten: chat.nachrichten.map((n) => ({
        id: n.id,
        rolle: n.rolle,
        text: n.text,
        anhangDateiId: n.anhangDateiId,
        erstelltAm: n.erstelltAm,
      })),
    };
  });

  // POST /chats/:id/nachrichten
  app.post<{ Params: { id: string } }>('/chats/:id/nachrichten', async (req) => {
    const body = parse(nachricht, req.body);
    const chat = oder404(
      await prisma.chat.findFirst({ where: { id: req.params.id, userId: req.userId } }),
    );

    // Harte Limit-Durchsetzung vor dem (Platzhalter-)KI-Call — Hard-Stop nur
    // dieses Features: 403 limit_erreicht, Klausuren/Uploads laufen weiter (§7).
    await pruefeUsageLimit(prisma, req.userId, 'nachrichten');

    if (body.anhangDateiId) {
      oder404(
        await prisma.datei.findFirst({ where: { id: body.anhangDateiId, userId: req.userId } }),
      );
    }

    const erste = (await prisma.nachricht.count({ where: { chatId: chat.id } })) === 0;

    const userNachricht = await prisma.nachricht.create({
      data: {
        userId: req.userId,
        chatId: chat.id,
        rolle: 'user',
        text: body.text,
        anhangDateiId: body.anhangDateiId ?? null,
        zaehltGegenLimit: true,
      },
    });

    // Platzhalter-Antwort (echter KI-Call: Phase 6). Zählt nicht gegen das Limit.
    const aiNachricht = await prisma.nachricht.create({
      data: {
        userId: req.userId,
        chatId: chat.id,
        rolle: 'ai',
        text: '_(Platzhalter-Antwort — die echte KI-Integration folgt in Phase 6.)_',
        zaehltGegenLimit: false,
      },
    });

    // Titel beim ersten Mal setzen (Prototyp-Kürzung; KI-Titel = Phase 6),
    // sonst nur „zuletzt aktiv" anstoßen.
    await prisma.chat.update({
      where: { id: chat.id },
      data: { titel: erste ? platzhalterTitel(body.text) : chat.titel },
    });

    await inkrementiereUsage(prisma, req.userId, 'nachrichten');

    let chatMap: Record<string, string> | undefined;
    if (body.lernplanKontext) {
      const key = chatMapKey(body.lernplanKontext.tag, chat.modus, chat.themaId);
      chatMap = await setChatMapEintrag(
        prisma,
        req.userId,
        body.lernplanKontext.lernplanId,
        key,
        chat.id,
      );
    }

    return {
      chatId: chat.id,
      nachrichten: [userNachricht, aiNachricht].map((n) => ({
        id: n.id,
        rolle: n.rolle,
        text: n.text,
        erstelltAm: n.erstelltAm,
      })),
      ...(chatMap ? { chatMap } : {}),
    };
  });
}
