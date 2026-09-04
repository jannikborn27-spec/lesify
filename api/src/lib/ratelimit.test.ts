import { describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../app.js';
import { regelFuer } from './ratelimit.js';

describe('regelFuer — Endpunkt-Klassen (§7)', () => {
  it('Auth-Pfade → Klasse auth (IP), Limit 10', () => {
    expect(regelFuer('POST', '/auth/login')).toMatchObject({ klasse: 'auth', schluessel: 'ip' });
    expect(regelFuer('POST', '/auth/registrieren')?.limit).toBe(10);
  });
  it('teure KI-Pfade → Klasse ki (User), Limit 20', () => {
    expect(regelFuer('POST', '/chats/abc/nachrichten')).toMatchObject({ klasse: 'ki', limit: 20 });
    expect(regelFuer('POST', '/themen/x/dateien')?.klasse).toBe('ki');
    expect(regelFuer('POST', '/lernzettel/x/revisionen')?.klasse).toBe('ki');
    expect(regelFuer('POST', '/testklausuren')?.klasse).toBe('ki');
  });
  it('Kontakt → Klasse kontakt, Limit 3', () => {
    expect(regelFuer('POST', '/kontakt')).toMatchObject({ klasse: 'kontakt', limit: 3 });
  });
  it('Lesen → Klasse io, Limit 120', () => {
    expect(regelFuer('GET', '/faecher')).toMatchObject({ klasse: 'io', limit: 120 });
  });
  it('health + webhook sind ausgenommen', () => {
    expect(regelFuer('GET', '/health')).toBeNull();
    expect(regelFuer('GET', '/health/live')).toBeNull();
    expect(regelFuer('POST', '/abo/webhook')).toBeNull();
  });
});

describe('Rate-Limiting greift im HTTP-Pfad', () => {
  const keinPrisma = {} as unknown as PrismaClient;
  const app = buildApp({ prisma: keinPrisma, logger: false, rateLimit: true });

  it('4. /kontakt in Folge → 429 + Retry-After', async () => {
    const payload = {
      name: 'A',
      email: 'a@b.de',
      thema: 'Frage',
      nachricht: 'Hallo, ich habe eine Frage.',
    };
    const codes: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const res = await app.inject({ method: 'POST', url: '/kontakt', payload });
      codes.push(res.statusCode);
      if (res.statusCode === 429) {
        expect(res.headers['retry-after']).toBeDefined();
        expect(res.json().fehler).toBe('rate_limit');
      }
    }
    expect(codes.slice(0, 3).every((c) => c !== 429)).toBe(true);
    expect(codes[3]).toBe(429);
  });

  it('ohne rateLimit-Flag kein Limit', async () => {
    const frei = buildApp({ prisma: keinPrisma, logger: false, rateLimit: false });
    const payload = {
      name: 'A',
      email: 'a@b.de',
      thema: 'Frage',
      nachricht: 'Hallo nochmal.',
    };
    for (let i = 0; i < 6; i += 1) {
      const res = await frei.inject({ method: 'POST', url: '/kontakt', payload });
      expect(res.statusCode).not.toBe(429);
    }
  });
});
