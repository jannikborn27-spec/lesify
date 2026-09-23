import { describe, expect, it } from 'vitest';
import { strictSchema } from './client.js';

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
    }) as Record<string, any>;
    expect(aus.additionalProperties).toBe(false);
    expect(aus.properties.eintraege.items.additionalProperties).toBe(false);
    expect(aus.properties.eintraege.additionalProperties).toBeUndefined();
  });

  it('verschiebt minimum/maximum (im Strict-Modus nicht erlaubt) in die Beschreibung', () => {
    const aus = strictSchema({
      type: 'object',
      properties: { prozent: { type: 'integer', minimum: 0, maximum: 100 } },
    }) as Record<string, any>;
    expect(aus.properties.prozent).toEqual({ type: 'integer', description: 'Bereich 0–100' });
  });

  it('lässt ein Property namens "type" in properties unangetastet', () => {
    const aus = strictSchema({
      type: 'object',
      properties: { type: { type: 'string' } },
    }) as Record<string, any>;
    expect(aus.properties.type).toEqual({ type: 'string' });
  });
});
