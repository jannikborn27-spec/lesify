import { describe, expect, it } from 'vitest';
import { FACH_FARBE_HEX, fachFarbeAusHex } from './fachFarbe.js';

describe('fachFarbeAusHex', () => {
  it('leitet helle Fläche und dunklere Schrift ab', () => {
    const f = fachFarbeAusHex('#007DAE');
    expect(f.base).toBe('#007dae');
    expect(f.bg).toMatch(FACH_FARBE_HEX);
    expect(f.ink).toMatch(FACH_FARBE_HEX);
    expect(parseInt(f.bg.slice(1, 3), 16)).toBeGreaterThan(220);
  });

  it('dunkelt auch sehr helle Farben (Gelb) bis zur Lesbarkeit ab', () => {
    const f = fachFarbeAusHex('#ffff00');
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(f.ink.slice(i, i + 2), 16));
    expect(r! + g! + b!).toBeLessThan(300);
  });

  it('erkennt nur #rrggbb', () => {
    expect(FACH_FARBE_HEX.test('#a1b2c3')).toBe(true);
    expect(FACH_FARBE_HEX.test('blue')).toBe(false);
    expect(FACH_FARBE_HEX.test('#abc')).toBe(false);
  });
});
