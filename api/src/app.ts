import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import type { PrismaClient } from '@prisma/client';
import { getPrisma } from './db.js';
import { env } from './env.js';
import { hashToken } from './lib/tokens.js';
import { HttpError } from './lib/http.js';
import { getZahlungsGateway, type ZahlungsGateway } from './lib/zahlung.js';
import { getKiClient, type KiClient } from './lib/ki/client.js';
import { getStorageGateway, type StorageGateway } from './lib/storage.js';
import { RateLimiter } from './lib/ratelimit.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { faecherRoutes } from './routes/faecher.js';
import { themenRoutes } from './routes/themen.js';
import { dateienRoutes, dateiInhaltRoutes } from './routes/dateien.js';
import { lernzettelRoutes } from './routes/lernzettel.js';
import { userRoutes } from './routes/user.js';
import { usageRoutes } from './routes/usage.js';
import { sucheRoutes } from './routes/suche.js';
import { kontaktRoutes } from './routes/kontakt.js';
import { chatsRoutes } from './routes/chats.js';
import { klausurenRoutes } from './routes/klausuren.js';
import { lernplaeneRoutes } from './routes/lernplaene.js';
import { testklausurenRoutes } from './routes/testklausuren.js';
import { aboRoutes } from './routes/abo.js';

export interface BuildOpts {
  /** in Tests durch ein Fake ersetzbar */
  prisma?: PrismaClient;
  zahlung?: ZahlungsGateway;
  ki?: KiClient;
  storage?: StorageGateway;
  logger?: boolean;
  /** Request-Rate-Limiting (§7). Default: aus im Test, sonst an. */
  rateLimit?: boolean;
}

export function buildApp(opts: BuildOpts = {}): FastifyInstance {
  const prisma = opts.prisma ?? getPrisma();
  const loggerAn = opts.logger ?? env.NODE_ENV !== 'test';
  const app = Fastify({
    trustProxy: true,
    // Sensible Header nie ins Log — Token, Cookies, Stripe-Signatur raus.
    // (Bodys loggt Fastify ohnehin nicht → Chat-Texte/Passwörter bleiben draußen.)
    logger: loggerAn
      ? {
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              'req.headers["stripe-signature"]',
            ],
            remove: true,
          },
        }
      : false,
  });

  app.decorate('prisma', prisma);
  app.decorate('zahlung', opts.zahlung ?? getZahlungsGateway());
  app.decorate('ki', opts.ki ?? getKiClient());
  app.decorate('storage', opts.storage ?? getStorageGateway());
  app.decorateRequest('userId', '');
  app.decorateRequest('rawBody', undefined);
  app.register(multipart, { limits: { fileSize: env.DATEI_MAX_BYTES } });

  // Roh-Body mitschneiden, bevor er geparst wird — nur die Stripe-Webhook-
  // Signaturprüfung (`/abo/webhook`) braucht das, alle anderen Routen sehen
  // weiterhin ganz normal den geparsten JSON-Body.
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    function (req, body: Buffer, done) {
      req.rawBody = body;
      if (body.length === 0) return done(null, undefined);
      try {
        done(null, JSON.parse(body.toString('utf8')));
      } catch (err) {
        done(err as Error, undefined);
      }
    },
  );

  // ---- Rate-Limiting (§7, Phase 15) ----
  if (opts.rateLimit ?? env.NODE_ENV !== 'test') {
    const limiter = new RateLimiter();
    const putzer = setInterval(() => limiter.aufraeumen(), 60_000);
    putzer.unref?.();
    app.addHook('onRequest', async (req, reply) => {
      try {
        limiter.treffer(req);
      } catch (err) {
        if (err instanceof HttpError && err.statusCode === 429) {
          const ra = (err.details as { retryAfterSek?: number })?.retryAfterSek ?? 60;
          reply.header('Retry-After', String(ra));
        }
        throw err;
      }
    });
    app.addHook('onClose', async () => clearInterval(putzer));
  }

  app.decorate('requireAuth', async function requireAuth(request, reply) {
    const header = request.headers.authorization;
    const roh = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : undefined;
    if (!roh) {
      await reply.code(401).send({ fehler: 'nicht_angemeldet' });
      return reply;
    }
    const session = await prisma.session.findUnique({ where: { tokenHash: hashToken(roh) } });
    if (!session || session.ablaeuftAm.getTime() < Date.now()) {
      await reply.code(401).send({ fehler: 'nicht_angemeldet' });
      return reply;
    }
    request.userId = session.userId;
  });

  app.setErrorHandler((err: FastifyError, request, reply) => {
    if (err instanceof HttpError) {
      return reply
        .code(err.statusCode)
        .send({ fehler: err.code, ...(err.details ? { details: err.details } : {}) });
    }
    if (err.validation) return reply.code(400).send({ fehler: 'validierung' });
    request.log.error(err);
    return reply.code(500).send({ fehler: 'serverfehler' });
  });

  app.register(healthRoutes);
  app.register(authRoutes, { prefix: '/auth' });
  app.register(faecherRoutes);
  app.register(themenRoutes);
  app.register(dateienRoutes);
  app.register(dateiInhaltRoutes);
  app.register(lernzettelRoutes);
  app.register(userRoutes);
  app.register(usageRoutes);
  app.register(sucheRoutes);
  app.register(kontaktRoutes);
  app.register(chatsRoutes);
  app.register(klausurenRoutes);
  app.register(lernplaeneRoutes);
  app.register(testklausurenRoutes);
  app.register(aboRoutes);

  return app;
}
