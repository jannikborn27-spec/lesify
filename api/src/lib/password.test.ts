import { describe, expect, it } from 'vitest';
import { hashPasswort, pruefePasswort } from './password.js';

describe('password', () => {
  it('hasht und verifiziert dasselbe Passwort', async () => {
    const h = await hashPasswort('korrekt-pferd-batterie-heftklammer');
    expect(h).toMatch(/^\$argon2id\$/);
    expect(await pruefePasswort(h, 'korrekt-pferd-batterie-heftklammer')).toBe(true);
  });

  it('lehnt ein falsches Passwort ab', async () => {
    const h = await hashPasswort('richtig123');
    expect(await pruefePasswort(h, 'falsch123')).toBe(false);
  });

  it('gibt bei kaputtem Hash false zurück statt zu werfen', async () => {
    expect(await pruefePasswort('kein-gueltiger-hash', 'egal')).toBe(false);
  });

  it('erzeugt pro Aufruf unterschiedliche Hashes (Salt)', async () => {
    const a = await hashPasswort('gleich');
    const b = await hashPasswort('gleich');
    expect(a).not.toBe(b);
  });
});
