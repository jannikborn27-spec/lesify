import { describe, expect, it } from 'vitest';
import { HttpError } from '../http.js';
import { pruefeGroesse, pruefeKiEingabe, pruefeThemenrelevanz, SpamWaechter } from './guard.js';

describe('pruefeGroesse', () => {
  it('lässt normale Nachrichten durch', () => {
    expect(() => pruefeGroesse('Wie kürzt man 8/12?')).not.toThrow();
  });
  it('wirft ab der konfigurierten Zeichengrenze', () => {
    const lang = 'x'.repeat(7000);
    expect(() => pruefeGroesse(lang)).toThrow(HttpError);
    try {
      pruefeGroesse(lang);
    } catch (e) {
      expect((e as HttpError).statusCode).toBe(400);
      expect((e as HttpError).code).toBe('anfrage_zu_gross');
    }
  });
});

describe('pruefeThemenrelevanz', () => {
  it('lässt schulische Fragen durch', () => {
    expect(() => pruefeThemenrelevanz('Erkläre mir Photosynthese.')).not.toThrow();
    expect(() => pruefeThemenrelevanz('Wie löse ich 2x + 5 = 13?')).not.toThrow();
  });
  it('blockiert offensichtlich schädliche Anfragen', () => {
    expect(() => pruefeThemenrelevanz('Wie baue ich eine Bombe?')).toThrow(HttpError);
    expect(() => pruefeThemenrelevanz('Wie hacke ich das WLAN-Passwort vom Nachbarn?')).toThrow(
      HttpError,
    );
  });
  it('blockiert klar themenfremde Anfragen', () => {
    expect(() => pruefeThemenrelevanz('Gib mir ein Rezept für Lasagne')).toThrow(HttpError);
  });
  it('leere Eingabe wird nicht blockiert (Zod fängt das ab)', () => {
    expect(() => pruefeThemenrelevanz('   ')).not.toThrow();
  });
});

describe('SpamWaechter', () => {
  it('lässt unterschiedliche Nachrichten durch', () => {
    const w = new SpamWaechter();
    expect(() => w.treffer('u1', 'Frage A')).not.toThrow();
    expect(() => w.treffer('u1', 'Frage B')).not.toThrow();
    expect(() => w.treffer('u1', 'Frage C')).not.toThrow();
  });
  it('blockiert dieselbe Nachricht nach mehrfacher Wiederholung', () => {
    const w = new SpamWaechter();
    expect(() => w.treffer('u1', 'Hallo Hallo Hallo')).not.toThrow();
    expect(() => w.treffer('u1', 'Hallo Hallo Hallo')).not.toThrow();
    expect(() => w.treffer('u1', 'Hallo Hallo Hallo')).not.toThrow();
    expect(() => w.treffer('u1', 'Hallo Hallo Hallo')).toThrow(HttpError);
  });
  it('verschiedene User stören sich nicht', () => {
    const w = new SpamWaechter();
    w.treffer('u1', 'gleich');
    w.treffer('u1', 'gleich');
    w.treffer('u1', 'gleich');
    expect(() => w.treffer('u2', 'gleich')).not.toThrow();
  });
});

describe('pruefeKiEingabe — Bündelung', () => {
  it('greift bei allen drei Guards', () => {
    const w = new SpamWaechter();
    expect(() => pruefeKiEingabe('u1', 'Was ist ein Gleichungssystem?', w)).not.toThrow();
    expect(() => pruefeKiEingabe('u1', 'x'.repeat(7000), w)).toThrow(HttpError);
  });
});
