import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { oder404 } from '../lib/scope.js';
import { hashToken } from '../lib/tokens.js';
import { HttpError } from '../lib/http.js';
import { pruefeUsageLimit, inkrementiereUsage } from '../lib/usage.js';
import { typAusMime } from '../lib/dateiExtraktion.js';
import { themenDateiVerarbeiten } from '../lib/dateiVerarbeitung.js';
import { liesDateiTeil } from '../lib/upload.js';

const dateiDTO = (d: {
  id: string;
  fachId: string;
  themaId: string;
  name: string;
  typ: string;
  groesseBytes: number;
  status: string;
  zusammenfassung: string | null;
  erstelltAm: Date;
  fach?: { name: string } | null;
}) => ({
  id: d.id,
  fachId: d.fachId,
  themaId: d.themaId,
  name: d.name,
  typ: d.typ,
  groesseBytes: d.groesseBytes,
  status: d.status,
  zusammenfassung: d.zusammenfassung,
  erstelltAm: d.erstelltAm,
  ...(d.fach ? { fachName: d.fach.name } : {}),
});

export async function dateienRoutes(app: FastifyInstance): Promise<void> {
  const { prisma, ki, storage } = app;
  app.addHook('preHandler', app.requireAuth);

  // GET /dateien?themaId= — nur Themen-Dateien, keine Testklausur-Lösungen (§6).
  app.get('/dateien', async (req) => {
    const { themaId } = parse(z.object({ themaId: z.string().uuid().optional() }), req.query);
    const dateien = await prisma.datei.findMany({
      where: { userId: req.userId, zweck: 'thema', ...(themaId ? { themaId } : {}) },
      orderBy: { erstelltAm: 'desc' },
      include: { fach: { select: { name: true } } },
    });
    return dateien.map(dateiDTO);
  });

  // GET /dateien/:id
  app.get<{ Params: { id: string } }>('/dateien/:id', async (req) => {
    const datei = oder404(
      await prisma.datei.findFirst({
        where: { id: req.params.id, userId: req.userId },
        include: { fach: { select: { name: true } } },
      }),
    );
    return dateiDTO(datei);
  });

  // POST /themen/:id/dateien — multipart Upload, 5-MB-Limit hart, Call 01 async.
  app.post<{ Params: { id: string } }>('/themen/:id/dateien', async (req, reply) => {
    const thema = oder404(
      await prisma.thema.findFirst({ where: { id: req.params.id, userId: req.userId } }),
    );
    await pruefeUsageLimit(prisma, req.userId, 'dateien');

    const teil = await req.file();
    if (!teil) throw new HttpError(400, 'validierung', { grund: 'keine_datei' });

    const typ = typAusMime(teil.mimetype);
    if (!typ) throw new HttpError(400, 'dateityp_nicht_unterstuetzt', { mime: teil.mimetype });

    const buffer = await liesDateiTeil(teil);

    const key = `${req.userId}/${thema.id}/${randomUUID()}-${teil.filename}`;
    await storage.hochladen(key, buffer, teil.mimetype);

    const datei = await prisma.datei.create({
      data: {
        userId: req.userId,
        fachId: thema.fachId,
        themaId: thema.id,
        name: teil.filename,
        typ,
        mime: teil.mimetype,
        groesseBytes: buffer.byteLength,
        speicherPfad: key,
        status: 'verarbeitung',
        zweck: 'thema',
      },
      include: { fach: { select: { name: true } } },
    });
    await inkrementiereUsage(prisma, req.userId, 'dateien');

    // Fire-and-forget (§6 „Verarbeitungs-Queue"): Client pollt GET /dateien/:id.
    void themenDateiVerarbeiten(prisma, ki, storage, datei.id);

    return reply.code(201).send(dateiDTO(datei));
  });

  // GET /dateien/:id/inhalt — Bridge s.u. (kein `requireAuth`-Hook nötig).
}

/**
 * Eigener Plugin-Scope **ohne** `requireAuth`: `dateiInhaltUrl()` wird als
 * direkte URL in `<a href>`/`<img src>` verwendet, kann also keinen
 * `Authorization`-Header mitschicken — Auth läuft hier wahlweise über den
 * Header (fetch) oder `?token=` (direkte Navigation). Redirect (302) auf eine
 * kurzlebige signierte URL, nie ein öffentlicher Link (§6).
 */
export async function dateiInhaltRoutes(app: FastifyInstance): Promise<void> {
  const { prisma, storage } = app;

  app.get<{ Params: { id: string }; Querystring: { token?: string } }>(
    '/dateien/:id/inhalt',
    async (req, reply) => {
      const roh =
        (req.headers.authorization?.startsWith('Bearer ')
          ? req.headers.authorization.slice('Bearer '.length).trim()
          : undefined) ?? req.query.token;
      if (!roh) throw new HttpError(401, 'nicht_angemeldet');
      const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(roh) } });
      if (!session || session.ablaeuftAm.getTime() < Date.now()) {
        throw new HttpError(401, 'nicht_angemeldet');
      }

      const datei = oder404(
        await prisma.datei.findFirst({ where: { id: req.params.id, userId: session.userId } }),
      );
      const url = await storage.signierteUrl(datei.speicherPfad, 60);
      return reply.redirect(url, 302);
    },
  );
}
