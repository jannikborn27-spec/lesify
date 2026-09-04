import { describe, expect, it } from 'vitest';
import { FakeKiClient } from './client.js';
import {
  chatAntwortErzeugen,
  chatTitelErzeugen,
  lernplanLernzettelErzeugen,
  lernzettelErstellen,
  lernzettelRevisionErzeugen,
  testklausurAnalyseErzeugen,
  testklausurAufgabenErzeugen,
  wendePatchesAn,
} from './calls.js';

const ki = new FakeKiClient();

describe('Call-Funktionen gegen FakeKiClient (deterministisch, kein Netzwerk)', () => {
  it('chatTitelErzeugen liefert einen Titel', async () => {
    const titel = await chatTitelErzeugen(ki, {
      fachName: 'Mathematik',
      themaName: 'Bruchrechnung',
      ersteNachricht: 'Wie kürzt man 8/12?',
    });
    expect(titel).toBeTruthy();
  });

  it('chatAntwortErzeugen liefert Freitext für jeden Modus', async () => {
    for (const modus of ['erklaeren', 'hausaufgaben', 'ueben', 'zusammenfassen', null] as const) {
      const { text } = await chatAntwortErzeugen(ki, {
        modus,
        klassenstufe: '8. Klasse',
        fachName: 'Mathematik',
        themaName: 'Bruchrechnung',
        themenMemory: '## Themen Memory: Bruchrechnung',
        tonfallBaustein: 'Tonfall: freundlich.',
        verlauf: [],
        neueNachricht: 'Wie kürzt man 8/12?',
      });
      expect(text.length).toBeGreaterThan(0);
    }
  });

  it('lernzettelErstellen liefert titel + content', async () => {
    const lz = await lernzettelErstellen(ki, {
      klassenstufe: '8. Klasse',
      fachName: 'Mathematik',
      themaName: 'Bruchrechnung',
      themaBeschreibung: 'Kürzen und Erweitern',
      tonfallBaustein: 'Tonfall: freundlich.',
      chatsUndDateien: '(kein Material)',
    });
    expect(lz.titel).toBeTruthy();
    expect(lz.content).toContain('#');
  });

  it('lernzettelRevisionErzeugen liefert eine Patch-Antwort, die anwendbar ist (leere Patch-Liste bei Fake)', async () => {
    const rev = await lernzettelRevisionErzeugen(ki, {
      klassenstufe: '8. Klasse',
      fachName: 'Mathematik',
      themaName: 'Prozentrechnung',
      tonfallBaustein: 'Tonfall: direkt.',
      lernzettelContent: '## Grundformel\nProzentwert = Grundwert × Prozentsatz / 100',
      revisionsVerlauf: '',
      anweisung: 'Füge ein Beispiel hinzu.',
    });
    expect(rev.art).toBe('patch');
    expect(() => wendePatchesAn('## Grundformel', rev.patches ?? [])).not.toThrow();
  });

  it('wendePatchesAn wendet Such-/Ersetzen-Paare eindeutig an', () => {
    const content = '## Anwendungen\nRabatt, Zinsen, Mehrwertsteuer.';
    const neu = wendePatchesAn(content, [
      {
        suchen: 'Rabatt, Zinsen, Mehrwertsteuer.',
        ersetzen: 'Rabatt, Zinsen, MwSt. — Beispiel: 40€ + 19%.',
      },
    ]);
    expect(neu).toContain('Beispiel: 40€ + 19%');
  });

  it('wendePatchesAn wirft bei nicht eindeutigem Treffer', () => {
    const content = 'a a a';
    expect(() => wendePatchesAn(content, [{ suchen: 'a', ersetzen: 'b' }])).toThrow();
  });

  it('testklausurAufgabenErzeugen liefert eine Aufgabe je Thema mit korrekter themaId', async () => {
    const aufgaben = await testklausurAufgabenErzeugen(ki, {
      klassenstufe: '8. Klasse',
      fachName: 'Mathematik',
      themen: [
        {
          themaId: 't1',
          themaName: 'Bruchrechnung',
          themaBeschreibung: '',
          lernzettelOderChats: '(Material)',
          dateiZusammenfassungen: '(keine)',
        },
        {
          themaId: 't2',
          themaName: 'Prozentrechnung',
          themaBeschreibung: '',
          lernzettelOderChats: '(Material)',
          dateiZusammenfassungen: '(keine)',
        },
      ],
    });
    expect(aufgaben).toHaveLength(2);
    expect(aufgaben.map((a) => a.themaId).sort()).toEqual(['t1', 't2']);
  });

  it('testklausurAnalyseErzeugen liefert ein Ergebnis je Aufgabe', async () => {
    const ergebnisse = await testklausurAnalyseErzeugen(ki, {
      klassenstufe: '8. Klasse',
      fachName: 'Mathematik',
      aufgaben: [
        { themaId: 't1', themaName: 'Bruchrechnung', frage: 'Kürze 8/12.', material: '(Material)' },
      ],
      loesungsText: '8/12 = 2/3',
    });
    expect(ergebnisse).toHaveLength(1);
    expect(ergebnisse[0]?.prozent).toBeGreaterThanOrEqual(0);
    expect(ergebnisse[0]?.prozent).toBeLessThanOrEqual(100);
  });

  it('lernplanLernzettelErzeugen liefert einen Abschnitt je Thema', async () => {
    const eintraege = await lernplanLernzettelErzeugen(ki, {
      klassenstufe: '8. Klasse',
      fachName: 'Mathematik',
      bisherigerLernzettel: null,
      themen: [{ themaId: 't1', themaName: 'Bruchrechnung', material: '(Material)' }],
    });
    expect(eintraege).toHaveLength(1);
    expect(eintraege[0]?.themaId).toBe('t1');
  });
});
