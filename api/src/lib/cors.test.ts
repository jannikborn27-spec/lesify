import { describe, expect, it } from 'vitest';
import { corsOriginOption, parseCorsOrigins } from './cors.js';

describe('parseCorsOrigins', () => {
  it('kommagetrennt, trimmt und wirft leere Einträge raus', () => {
    expect(parseCorsOrigins('https://lesify.de, https://www.lesify.de,')).toEqual([
      'https://lesify.de',
      'https://www.lesify.de',
    ]);
  });
  it('undefined → leere Liste', () => {
    expect(parseCorsOrigins(undefined)).toEqual([]);
  });
});

describe('corsOriginOption', () => {
  it('dev/test: jeder Origin erlaubt, unabhängig von CORS_ORIGINS', () => {
    expect(corsOriginOption(false, undefined)).toBe(true);
    expect(corsOriginOption(false, 'https://lesify.de')).toBe(true);
  });
  it('production mit CORS_ORIGINS: genau die gelistete Liste', () => {
    expect(corsOriginOption(true, 'https://lesify.de,https://www.lesify.de')).toEqual([
      'https://lesify.de',
      'https://www.lesify.de',
    ]);
  });
  it('production ohne CORS_ORIGINS: fail-closed (leere Liste)', () => {
    expect(corsOriginOption(true, undefined)).toEqual([]);
  });
});
