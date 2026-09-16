import { describe, expect, it } from 'vitest';
import { HttpError } from '../http.js';
import {
  MissbrauchsWaechter,
  pruefeGroesse,
  pruefeKiEingabe,
  pruefeThemenrelevanz,
  SpamWaechter,
} from './guard.js';

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

describe('MissbrauchsWaechter', () => {
  it('meldet Treffer, sperrt aber erst ab der Schwelle', () => {
    const m = new MissbrauchsWaechter();
    let t = 0;
    for (let i = 0; i < 4; i++) {
      m.melden('u1', 'nicht_schulrelevant', t);
      expect(() => m.pruefeGesperrt('u1', t)).not.toThrow();
    }
    m.melden('u1', 'nicht_schulrelevant', t); // 5. Treffer → Schwelle erreicht
    expect(() => m.pruefeGesperrt('u1', t)).toThrow(HttpError);
    try {
      m.pruefeGesperrt('u1', t);
    } catch (e) {
      expect((e as HttpError).statusCode).toBe(429);
      expect((e as HttpError).code).toBe('missbrauch_gesperrt');
    }
  });

  it('Sperre läuft nach der Fensterzeit wieder ab', () => {
    const m = new MissbrauchsWaechter();
    let t = 0;
    for (let i = 0; i < 5; i++) m.melden('u1', 'spam_erkannt', t);
    expect(() => m.pruefeGesperrt('u1', t)).toThrow(HttpError);
    t += 31 * 60 * 1000; // 31 Minuten später — Sperre (30 Min.) ist abgelaufen
    expect(() => m.pruefeGesperrt('u1', t)).not.toThrow();
  });

  it('alte Treffer außerhalb des Fensters zählen nicht mit', () => {
    const m = new MissbrauchsWaechter();
    let t = 0;
    for (let i = 0; i < 4; i++) m.melden('u1', 'nicht_schulrelevant', t);
    t += 61 * 60 * 1000; // 61 Minuten später — Fenster (1h) ist abgelaufen
    m.melden('u1', 'nicht_schulrelevant', t); // nur 1 Treffer im aktuellen Fenster
    expect(() => m.pruefeGesperrt('u1', t)).not.toThrow();
  });

  it('verschiedene User stören sich nicht', () => {
    const m = new MissbrauchsWaechter();
    for (let i = 0; i < 5; i++) m.melden('u1', 'anfrage_zu_gross', 0);
    expect(() => m.pruefeGesperrt('u2', 0)).not.toThrow();
  });

  it('pruefeKiEingabe sperrt einen Nutzer nach wiederholten Guard-Treffern', () => {
    const spam = new SpamWaechter();
    const missbrauch = new MissbrauchsWaechter();
    for (let i = 0; i < 5; i++) {
      expect(() => pruefeKiEingabe('u1', 'x'.repeat(7000), spam, missbrauch)).toThrow(HttpError);
    }
    // Ein an sich unauffälliger Text scheitert jetzt an der Sperre, nicht an der Größe.
    try {
      pruefeKiEingabe('u1', 'Erkläre mir Bruchrechnung.', spam, missbrauch);
      expect.unreachable();
    } catch (e) {
      expect((e as HttpError).code).toBe('missbrauch_gesperrt');
    }
  });
});
