import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from './app.js';

describe('CORS (§4/Phase 11) — Marketing/App laufen auf anderem Origin', () => {
  const keinPrisma = {} as unknown as PrismaClient;
  const app = buildApp({ prisma: keinPrisma, logger: false, rateLimit: false });

  it('Preflight (OPTIONS) auf einen echten Endpunkt spiegelt den Origin (dev/test)', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/auth/login',
      headers: {
        origin: 'http://localhost:4322',
        'access-control-request-method': 'POST',
      },
    });
    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:4322');
  });

  it('echte Antwort trägt den CORS-Header, egal welcher Origin', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/kontakt',
      headers: { origin: 'http://localhost:4001' },
      payload: { name: 'A', email: 'a@b.de', thema: 'Frage', nachricht: 'Hallo, eine Frage.' },
    });
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:4001');
  });
});
