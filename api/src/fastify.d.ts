import type { PrismaClient } from '@prisma/client';
import type { preHandlerHookHandler } from 'fastify';
import type { ZahlungsGateway } from './lib/zahlung.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    /** Zahlungsanbieter-Adapter (Phase 9; Fake bis Phase 16). */
    zahlung: ZahlungsGateway;
    /** preHandler: verlangt eine gültige Session, setzt `request.userId`. */
    requireAuth: preHandlerHookHandler;
  }
  interface FastifyRequest {
    /** gesetzt durch `requireAuth` */
    userId: string;
  }
}
