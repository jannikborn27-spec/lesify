import { describe, expect, it } from 'vitest';
import { hashToken, inTagen, neuesToken, tokenHashGleich } from './tokens.js';

describe('tokens', () => {
  it('neuesToken: roher Wert ist base64url, hash ist 64 hex', () => {
    const t = neuesToken();
    expect(t.roh).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(t.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(t.roh)).toBe(t.hash);
  });

  it('neuesToken: zwei Aufrufe sind verschieden', () => {
    expect(neuesToken().roh).not.toBe(neuesToken().roh);
  });

  it('tokenHashGleich vergleicht korrekt', () => {
    const t = neuesToken();
    expect(tokenHashGleich(t.hash, hashToken(t.roh))).toBe(true);
    expect(tokenHashGleich(t.hash, hashToken('anders'))).toBe(false);
  });

  it('inTagen liegt in der Zukunft', () => {
    const ab = new Date('2026-01-01T00:00:00Z');
    expect(inTagen(14, ab).toISOString()).toBe('2026-01-15T00:00:00.000Z');
  });
});
