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

  // Regression: @fastify/cors erlaubt ohne explizite `methods`-Option nur
  // GET/HEAD/POST — PATCH (Fächer-Farbe, Checklist, Abo, Einstellungen, …)
  // und DELETE (Kind-Profile) liefen dann lautlos ins Leere (Preflight 204,
  // aber der Browser schickt den eigentlichen Request gar nicht erst ab).
  // Live per curl gefunden (2026-09-12), siehe UMSETZUNGSPLAN.md Phase 11.
  it.each(['PATCH', 'DELETE'])(
    'Preflight erlaubt %s (nicht nur den Plugin-Default GET/HEAD/POST)',
    async (method) => {
      const res = await app.inject({
        method: 'OPTIONS',
        url: '/faecher/irgendeine-id',
        headers: {
          origin: 'http://localhost:4311',
          'access-control-request-method': method,
        },
      });
      expect(res.statusCode).toBe(204);
      const erlaubt = (res.headers['access-control-allow-methods'] as string)
        .split(',')
        .map((m) => m.trim());
      expect(erlaubt).toContain(method);
    },
  );
});

describe('Security-Header (@fastify/helmet, Phase 15/14 Sicherheitsreview)', () => {
  const keinPrisma = {} as unknown as PrismaClient;
  const app = buildApp({ prisma: keinPrisma, logger: false, rateLimit: false });

  it('setzt Standard-Härtungs-Header (nosniff, HSTS, kein Referrer)', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['strict-transport-security']).toBeDefined();
    expect(res.headers['referrer-policy']).toBeDefined();
  });

  it('crossOriginResourcePolicy ist "cross-origin" — Datei-Vorschau wird von app/ eingebettet', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('setzt keine COOP/COEP-Header (nur für Dokument-Kontexte relevant, nicht für eine JSON-API)', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.headers['cross-origin-opener-policy']).toBeUndefined();
    expect(res.headers['cross-origin-embedder-policy']).toBeUndefined();
  });
});
