import Fastify, { type FastifyError, type FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { getPrisma } from './db.js';
import { env } from './env.js';
import { hashToken } from './lib/tokens.js';
import { HttpError } from './lib/http.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { faecherRoutes } from './routes/faecher.js';
import { themenRoutes } from './routes/themen.js';
import { dateienRoutes } from './routes/dateien.js';
import { lernzettelRoutes } from './routes/lernzettel.js';
import { userRoutes } from './routes/user.js';
import { usageRoutes } from './routes/usage.js';
import { sucheRoutes } from './routes/suche.js';
import { kontaktRoutes } from './routes/kontakt.js';
import { chatsRoutes } from './routes/chats.js';
import { klausurenRoutes } from './routes/klausuren.js';
import { lernplaeneRoutes } from './routes/lernplaene.js';
import { testklausurenRoutes } from './routes/testklausuren.js';

export interface BuildOpts {
  /** in Tests durch ein Fake ersetzbar */
  prisma?: PrismaClient;
  logger?: boolean;
}

export function buildApp(opts: BuildOpts = {}): FastifyInstance {
  const prisma = opts.prisma ?? getPrisma();
  const app = Fastify({
    logger: opts.logger ?? env.NODE_ENV !== 'test',
    trustProxy: true,
  });

  app.decorate('prisma', prisma);
  app.decorateRequest('userId', '');

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
  app.register(lernzettelRoutes);
  app.register(userRoutes);
  app.register(usageRoutes);
  app.register(sucheRoutes);
  app.register(kontaktRoutes);
  app.register(chatsRoutes);
  app.register(klausurenRoutes);
  app.register(lernplaeneRoutes);
  app.register(testklausurenRoutes);

  return app;
}
