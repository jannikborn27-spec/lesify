import { describe, expect, it } from 'vitest';
import { strictSchema } from './client.js';

/** Beliebig tief indexierbares JSON-Schema — nur für die Zugriffe im Test. */
interface Knoten {
  [k: string]: Knoten;
}
describe('strictSchema', () => {
  it('setzt additionalProperties: false auf jedes Objekt, auch verschachtelt', () => {
    const aus = strictSchema({
      type: 'object',
      properties: {
        eintraege: {
          type: 'array',
          items: { type: 'object', properties: { themaId: { type: 'string' } } },
        },
      },
    }) as unknown as Knoten;
    expect(aus.additionalProperties).toBe(false);
    expect(aus.properties?.eintraege?.items?.additionalProperties).toBe(false);
    expect(aus.properties?.eintraege?.additionalProperties).toBeUndefined();
  });

  it('verschiebt minimum/maximum (im Strict-Modus nicht erlaubt) in die Beschreibung', () => {
    const aus = strictSchema({
      type: 'object',
      properties: { prozent: { type: 'integer', minimum: 0, maximum: 100 } },
    }) as unknown as Knoten;
    expect(aus.properties?.prozent).toEqual({ type: 'integer', description: 'Bereich 0–100' });
  });

  it('lässt ein Property namens "type" in properties unangetastet', () => {
    const aus = strictSchema({
      type: 'object',
      properties: { type: { type: 'string' } },
    }) as unknown as Knoten;
    expect(aus.properties?.type).toEqual({ type: 'string' });
  });
});
