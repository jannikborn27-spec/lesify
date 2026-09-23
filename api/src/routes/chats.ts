import type { FastifyInstance } from 'fastify';
import type { Chat, Fach, Thema } from '@prisma/client';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { nichtGefunden } from '../lib/http.js';
import { oder404 } from '../lib/scope.js';
import { inkrementiereUsage, pruefeUsageLimit } from '../lib/usage.js';
import { chatMapKey, setChatMapEintrag } from '../lib/lernplan.js';
import { pruefeKiEingabe } from '../lib/ki/guard.js';
import { klassenstufeFuer, themenMemoryBlock } from '../lib/ki/kontext.js';
import { tonfallBaustein, type KiTonfall } from '../lib/ki/tonfall.js';
import { chatAntwortErzeugen, chatTitelErzeugen } from '../lib/ki/calls.js';
import type { KiNachricht } from '../lib/ki/client.js';
import { streameSse, willStream } from '../lib/sse.js';

const erstellen = z.object({
  fachId: z.string().uuid(),
  themaId: z.string().uuid(),
  // `null` = freie Frage ohne Modus — chat.html schickt `modus: null`, wenn
  // keiner gewählt ist (vorher 400 → Senden-Button tat still nichts).
  modus: z.enum(['erklaeren', 'hausaufgaben', 'ueben', 'zusammenfassen']).nullish(),
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

/** Fallback, falls der Titel-Call fehlschlägt — nie den ganzen Chat blockieren. */
function fallbackTitel(text: string): string {
  const s = text.trim().replace(/\s+/g, ' ');
  return s.length <= 48 ? s : `${s.slice(0, 47)}…`;
}

export async function chatsRoutes(app: FastifyInstance): Promise<void> {
  const { prisma, ki } = app;
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

  // POST /chats/:id/nachrichten — mit `Accept: text/event-stream` gestreamt
  // (SSE, siehe `lib/sse.ts`), sonst klassisch als JSON.
  app.post<{ Params: { id: string } }>('/chats/:id/nachrichten', async (req, reply) => {
    const body = parse(nachricht, req.body);
    const chat = oder404(
      await prisma.chat.findFirst({
        where: { id: req.params.id, userId: req.userId },
        include: { fach: true, thema: true },
      }),
    );

    // Vorab-Filter (§3/§7): kein KI-Call, kein Usage-Verbrauch bei Treffer.
    pruefeKiEingabe(req.userId, body.text);

    // Harte Limit-Durchsetzung vor dem KI-Call — Hard-Stop nur dieses
    // Features: 403 limit_erreicht, Klausuren/Uploads laufen weiter (§7).
    await pruefeUsageLimit(prisma, req.userId, 'nachrichten');

    let anhang: { name: string; zusammenfassung: string } | undefined;
    if (body.anhangDateiId) {
      const datei = oder404(
        await prisma.datei.findFirst({ where: { id: body.anhangDateiId, userId: req.userId } }),
      );
      if (datei.zusammenfassung)
        anhang = { name: datei.name, zusammenfassung: datei.zusammenfassung };
    }

    const bisherigeNachrichten = await prisma.nachricht.findMany({
      where: { chatId: chat.id },
      orderBy: { erstelltAm: 'asc' },
      select: { rolle: true, text: true },
    });
    const erste = bisherigeNachrichten.length === 0;
    const verlauf: KiNachricht[] = bisherigeNachrichten.map((n) => ({
      rolle: n.rolle === 'user' ? 'user' : 'assistant',
      text: n.text,
    }));

    const einstellungen = await prisma.einstellungen.findUnique({ where: { userId: req.userId } });
    const [klassenstufe, themenMemory] = await Promise.all([
      klassenstufeFuer(prisma, req.userId, chat.fachId),
      themenMemoryBlock(prisma, chat.themaId),
    ]);

    const kiKontext = {
      modus: chat.modus,
      klassenstufe,
      fachName: chat.fach.name,
      themaName: chat.thema.name,
      themenMemory,
      tonfallBaustein: tonfallBaustein((einstellungen?.kiTonfall as KiTonfall) ?? 'freundlich'),
      verlauf,
      neueNachricht: body.text,
      anhang,
    };

    if (willStream(req)) {
      await streameSse(req, reply, async (onDelta) => {
        const { text } = await chatAntwortErzeugen(ki, kiKontext, onDelta);
        return abschliessen(text);
      });
      return reply;
    }
    const { text: antwortText } = await chatAntwortErzeugen(ki, kiKontext);
    return abschliessen(antwortText);

    // Nachrichten speichern, Titel, Usage, Lernplan-Chat-Map — erst nach
    // erfolgreichem KI-Call (bei Fehler kein Usage-Verbrauch, keine halbe
    // Nachricht).
    async function abschliessen(antwortText: string) {
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

      const aiNachricht = await prisma.nachricht.create({
        data: {
          userId: req.userId,
          chatId: chat.id,
          rolle: 'ai',
          text: antwortText,
          zaehltGegenLimit: false,
        },
      });

      // Titel per KI beim ersten Mal (Call 07, günstigste Modellklasse); schlägt
      // der Call fehl, Fallback auf eine einfache Kürzung statt den Chat zu
      // blockieren. Bei Folgenachrichten nur „zuletzt aktiv" anstoßen.
      let titel = chat.titel;
      if (erste) {
        titel = await chatTitelErzeugen(ki, {
          fachName: chat.fach.name,
          themaName: chat.thema.name,
          ersteNachricht: body.text,
        }).catch(() => fallbackTitel(body.text));
      }
      await prisma.chat.update({ where: { id: chat.id }, data: { titel } });

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
    }
  });
}
