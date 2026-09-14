import { describe, expect, it } from 'vitest';
import {
  ABO_ANGEBOT,
  ABO_TRIAL_TAGE,
  aboArtFuerSitze,
  aboPreis,
  istGueltigeSitzzahl,
} from './index.js';

describe('aboArtFuerSitze / istGueltigeSitzzahl', () => {
  it('1 Sitz = einzel, 2–4 = familie', () => {
    expect(aboArtFuerSitze(1)).toBe('einzel');
    expect(aboArtFuerSitze(2)).toBe('familie');
    expect(aboArtFuerSitze(4)).toBe('familie');
  });
  it('gültige Sitzzahlen je Art', () => {
    expect(istGueltigeSitzzahl('einzel', 1)).toBe(true);
    expect(istGueltigeSitzzahl('einzel', 2)).toBe(false);
    expect(istGueltigeSitzzahl('familie', 1)).toBe(false);
    expect(istGueltigeSitzzahl('familie', 3)).toBe(true);
    expect(istGueltigeSitzzahl('familie', 5)).toBe(false);
  });
});

describe('aboPreis — Spiegel stripe-config.js', () => {
  it('Einzelplatz Premium monatlich = 19,99 € (Angebot)', () => {
    const p = aboPreis({ paket: 'premium', art: 'einzel', sitze: 1, intervall: 'monatlich' });
    expect(p.betragCent).toBe(1999);
    expect(p.normalCent).toBe(2499);
    expect(p.angebotKey).toBe(ABO_ANGEBOT.key);
  });
  it('Familie Starter × 3 jährlich = 395,88 € (Angebot), Normalpreis 479,88 €', () => {
    const p = aboPreis({ paket: 'starter', art: 'familie', sitze: 3, intervall: 'jaehrlich' });
    expect(p.betragCent).toBe(39588);
    expect(p.normalCent).toBe(47988);
  });
  it('ungültige Kombination wirft', () => {
    expect(() =>
      aboPreis({ paket: 'premium', art: 'familie', sitze: 1, intervall: 'monatlich' }),
    ).toThrow();
  });
});

it('Trial-Dauer = 14 Tage', () => {
  expect(ABO_TRIAL_TAGE).toBe(14);
});
