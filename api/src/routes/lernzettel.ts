import type { FastifyInstance } from 'fastify';
import type { Lernzettel } from '@prisma/client';
import { z } from 'zod';
import { revisionZaehltGegenLimit } from '@lesify/shared';
import { parse } from '../lib/validate.js';
import { lernzettelPdf } from '../lib/pdf/dokumente.js';
import { pdfAntwort } from '../lib/pdf/antwort.js';
import { oder404 } from '../lib/scope.js';
import { inkrementiereUsage, pruefeUsageLimit } from '../lib/usage.js';
import { pruefeKiEingabe } from '../lib/ki/guard.js';
import { klassenstufeFuer, themaChatsUndDateien } from '../lib/ki/kontext.js';
import { tonfallBaustein, type KiTonfall } from '../lib/ki/tonfall.js';
import {
  lernzettelErstellen,
  lernzettelRevisionErzeugen,
  wendePatchesAn,
} from '../lib/ki/calls.js';

const revisionBody = z.object({ text: z.string().trim().min(1).max(4000) });

function lernzettelDTO(lz: Lernzettel) {
  return {
    id: lz.id,
    fachId: lz.fachId,
    themaId: lz.themaId,
    titel: lz.titel,
    content: lz.content,
    freeMessagesUsed: lz.freeMessagesUsed,
    erstelltAm: lz.erstelltAm,
    aktualisiertAm: lz.aktualisiertAm,
  };
}

export async function lernzettelRoutes(app: FastifyInstance): Promise<void> {
  const { prisma, ki } = app;
  app.addHook('preHandler', app.requireAuth);

  // GET /lernzettel?themaId= — fächerübergreifende Liste (Feeds/Übersichten,
  // z. B. Dashboard „Zuletzt bearbeitet"). Ohne Revisionsverlauf (der kommt
  // nur über GET /lernzettel/:id) — hier reicht die Übersicht.
  app.get('/lernzettel', async (req) => {
    const { themaId } = parse(z.object({ themaId: z.string().uuid().optional() }), req.query);
    const liste = await prisma.lernzettel.findMany({
      where: { userId: req.userId, ...(themaId ? { themaId } : {}) },
      orderBy: { aktualisiertAm: 'desc' },
    });
    return liste.map(lernzettelDTO);
  });

  // GET /lernzettel/:id — Inhalt + Revisionsverlauf + freeMessagesUsed
  app.get<{ Params: { id: string } }>('/lernzettel/:id', async (req) => {
    const lz = oder404(
      await prisma.lernzettel.findFirst({
        where: { id: req.params.id, userId: req.userId },
        include: { revisionen: { orderBy: { erstelltAm: 'asc' } } },
      }),
    );
    return {
      ...lernzettelDTO(lz),
      revisionen: lz.revisionen.map((r) => ({
        id: r.id,
        rolle: r.rolle,
        text: r.text,
        erstelltAm: r.erstelltAm,
      })),
    };
  });

  // GET /lernzettel/:id/pdf — der Lernzettel als PDF (Basisvorlage + Markdown-Inhalt).
  // Das PDF wird bei jedem Abruf frisch aus `content` gerendert, damit es nach
  // einer Revision nie veraltet; `?download=1` erzwingt den Speichern-Dialog.
  app.get<{ Params: { id: string } }>('/lernzettel/:id/pdf', async (req, reply) => {
    const { download } = parse(z.object({ download: z.enum(['0', '1']).optional() }), req.query);
    const lz = oder404(
      await prisma.lernzettel.findFirst({ where: { id: req.params.id, userId: req.userId } }),
    );
    const [fach, thema] = await Promise.all([
      prisma.fach.findUniqueOrThrow({ where: { id: lz.fachId } }),
      prisma.thema.findUniqueOrThrow({ where: { id: lz.themaId } }),
    ]);
    const pdf = await lernzettelPdf({
      titel: lz.titel,
      content: lz.content,
      fachName: fach.name,
      fachFarbe: fach.farbe,
      klasse: fach.klasse,
      themaName: thema.name,
      stand: lz.aktualisiertAm,
    });
    return pdfAntwort(reply, pdf, `lernzettel-${lz.titel}`, download === '1');
  });

  // POST /themen/:id/lernzettel — Call 08: vollautomatisch aus allen Chats +
  // Dateien des Themas.
  app.post<{ Params: { id: string } }>('/themen/:id/lernzettel', async (req, reply) => {
    const thema = oder404(
      await prisma.thema.findFirst({ where: { id: req.params.id, userId: req.userId } }),
    );
    await pruefeUsageLimit(prisma, req.userId, 'lernzettel');

    const [fach, einstellungen, klassenstufe, chatsUndDateien] = await Promise.all([
      prisma.fach.findUniqueOrThrow({ where: { id: thema.fachId } }),
      prisma.einstellungen.findUnique({ where: { userId: req.userId } }),
      klassenstufeFuer(prisma, req.userId, thema.fachId),
      themaChatsUndDateien(prisma, thema.id),
    ]);

    const { titel, content } = await lernzettelErstellen(ki, {
      klassenstufe,
      fachName: fach.name,
      themaName: thema.name,
      themaBeschreibung: thema.beschreibung,
      tonfallBaustein: tonfallBaustein((einstellungen?.kiTonfall as KiTonfall) ?? 'freundlich'),
      chatsUndDateien,
    });

    const lz = await prisma.lernzettel.create({
      data: { userId: req.userId, fachId: thema.fachId, themaId: thema.id, titel, content },
    });
    await inkrementiereUsage(prisma, req.userId, 'lernzettel');
    return reply.code(201).send({ ...lernzettelDTO(lz), revisionen: [] });
  });

  // POST /lernzettel/:id/revisionen — Call 09: Such-/Ersetzen-Patches
  // (Regelfall) statt Vollersatz. Erste 10 Nachrichten je Lernzettel gratis.
  app.post<{ Params: { id: string } }>('/lernzettel/:id/revisionen', async (req) => {
    const body = parse(revisionBody, req.body);
    const lz = oder404(
      await prisma.lernzettel.findFirst({
        where: { id: req.params.id, userId: req.userId },
        include: { revisionen: { orderBy: { erstelltAm: 'asc' } } },
      }),
    );

    pruefeKiEingabe(req.userId, body.text);
    const zaehltGegenLimit = revisionZaehltGegenLimit(lz.freeMessagesUsed);
    if (zaehltGegenLimit) await pruefeUsageLimit(prisma, req.userId, 'nachrichten');

    const [fach, thema, einstellungen, klassenstufe] = await Promise.all([
      prisma.fach.findUniqueOrThrow({ where: { id: lz.fachId } }),
      prisma.thema.findUniqueOrThrow({ where: { id: lz.themaId } }),
      prisma.einstellungen.findUnique({ where: { userId: req.userId } }),
      klassenstufeFuer(prisma, req.userId, lz.fachId),
    ]);
    const revisionsVerlauf = lz.revisionen.map((r) => `${r.rolle}: ${r.text}`).join('\n');

    const ausgabe = await lernzettelRevisionErzeugen(ki, {
      klassenstufe,
      fachName: fach.name,
      themaName: thema.name,
      tonfallBaustein: tonfallBaustein((einstellungen?.kiTonfall as KiTonfall) ?? 'freundlich'),
      lernzettelContent: lz.content,
      revisionsVerlauf,
      anweisung: body.text,
    });

    let neuerContent = lz.content;
    let antwortText = ausgabe.antwortText;
    if (ausgabe.art === 'vollersatz' && ausgabe.neuerContent) {
      neuerContent = ausgabe.neuerContent;
    } else if (ausgabe.patches?.length) {
      try {
        neuerContent = wendePatchesAn(lz.content, ausgabe.patches);
      } catch {
        antwortText =
          'Die Änderung konnte nicht eindeutig automatisch angewendet werden — bitte formuliere die Anweisung genauer (z. B. den betroffenen Abschnitt nennen).';
      }
    }

    const freeMessagesUsed = Math.min(10, lz.freeMessagesUsed + 1);
    const [updated] = await prisma.$transaction([
      prisma.lernzettel.update({
        where: { id: lz.id },
        data: { content: neuerContent, freeMessagesUsed },
      }),
      prisma.lernzettelRevision.create({
        data: { userId: req.userId, lernzettelId: lz.id, rolle: 'user', text: body.text },
      }),
      prisma.lernzettelRevision.create({
        data: { userId: req.userId, lernzettelId: lz.id, rolle: 'ai', text: antwortText },
      }),
    ]);

    if (zaehltGegenLimit) await inkrementiereUsage(prisma, req.userId, 'nachrichten');

    const revisionen = await prisma.lernzettelRevision.findMany({
      where: { lernzettelId: lz.id },
      orderBy: { erstelltAm: 'asc' },
    });
    return {
      ...lernzettelDTO(updated),
      revisionen: revisionen.map((r) => ({
        id: r.id,
        rolle: r.rolle,
        text: r.text,
        erstelltAm: r.erstelltAm,
      })),
    };
  });
}
