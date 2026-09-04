import Fastify, { type FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { getPrisma } from './db.js';
import { env } from './env.js';
import { hashToken } from './lib/tokens.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';

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

  app.register(healthRoutes);
  app.register(authRoutes, { prefix: '/auth' });

  return app;
}
