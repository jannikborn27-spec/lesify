import type { PrismaClient } from '@prisma/client';
import type { preHandlerHookHandler } from 'fastify';
import type { ZahlungsGateway } from './lib/zahlung.js';
import type { KiClient } from './lib/ki/client.js';
import type { StorageGateway } from './lib/storage.js';

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
    /** Zahlungsanbieter-Adapter (Phase 9; Fake bis Phase 16). */
    zahlung: ZahlungsGateway;
    /** Claude-Client (Phase 6; Fake ohne ANTHROPIC_API_KEY). */
    ki: KiClient;
    /** Objektspeicher-Adapter (Phase 5; Fake ohne SUPABASE_URL/SERVICE_KEY). */
    storage: StorageGateway;
    /** preHandler: verlangt eine gültige Session, setzt `request.userId`. */
    requireAuth: preHandlerHookHandler;
  }
  interface FastifyRequest {
    /** gesetzt durch `requireAuth` */
    userId: string;
    /**
     * Roh-Body als Buffer, gesetzt vom `application/json`-Content-Type-Parser
     * in `app.ts` — nötig für die Stripe-Webhook-Signaturprüfung (HMAC über
     * exakt die empfangenen Bytes, nicht über einen neu serialisierten
     * JSON-String).
     */
    rawBody?: Buffer;
  }
}
