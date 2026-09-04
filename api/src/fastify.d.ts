import type { PrismaClient } from '@prisma/client';
import type { preHandlerHookHandler } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    /** preHandler: verlangt eine gültige Session, setzt `request.userId`. */
    requireAuth: preHandlerHookHandler;
  }
  interface FastifyRequest {
    /** gesetzt durch `requireAuth` */
    userId: string;
  }
}
