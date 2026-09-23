import { describe, expect, it } from 'vitest';
import { LesifyVorlage } from './basis.js';

const vorlage = () =>
  new LesifyVorlage({
    dokumentTyp: 'TEST',
    titel: 'Test',
    fachName: 'Mathe',
    fachFarbeKey: 'blue',
  });

describe('PDF-Schriften: Mathe-/Box-Zeichen', () => {
  it('behält Mathe-Zeichen (früher wurden √ π Δ ∞ still gelöscht)', () => {
    expect(vorlage().bereinige('√16 = 4, π, Δx → ∞, 2/3 ≈ 0,67 ≤ 1', 'body')).toBe(
      '√16 = 4, π, Δx → ∞, 2/3 ≈ 0,67 ≤ 1',
    );
  });

  it('setzt fehlende Glyphen in die DejaVu-Fallback-Schrift, Rest bleibt in der Hausschrift', () => {
    expect(vorlage().laeufeMitFallback('Wurzel √16', 'body')).toEqual([
      { text: 'Wurzel ', schrift: 'body' },
      { text: '√', schrift: 'symbol' },
      { text: '16', schrift: 'body' },
    ]);
    expect(vorlage().laeufeMitFallback('→', 'bodyFett')[0]!.schrift).toBe('symbolFett');
  });

  it('Codeblöcke (mono) behalten Box-Zeichen statt „?"', () => {
    expect(vorlage().bereinige('┌──┐\n│½ │', 'mono')).toBe('┌──┐\n│½ │');
  });

  it('Labels (nurPrimaer) enthalten nur Zeichen der Hausschrift', () => {
    expect(vorlage().bereinige('Wurzeln √', 'bodyFett', true)).toBe('Wurzeln ');
  });
});
