import { describe, expect, it } from 'vitest';
import {
  klausurNote,
  lernplanStatus,
  testklausurGesamtNote,
  type LernplanEingabe,
  type TestklausurEingabe,
} from './lernplan.js';

// Fixtures nach den SEED-Szenarien in app/assets/js/data.js (SEED.testklausuren /
// SEED.lernplaene). Die erwarteten Zustände stehen dort als Kommentare.

const tkErstellt: TestklausurEingabe = {
  status: 'erstellt',
  fachId: 'mathematik',
  themaIds: ['lineare-gleichungen'],
  ergebnisNote: null,
  vorbereitungProThema: null,
};

// t1 — k1: bruchrechnung rot, prozentrechnung grün, flaechenberechnung gelb
const t1: TestklausurEingabe = {
  status: 'analysiert',
  fachId: 'mathematik',
  themaIds: ['bruchrechnung', 'prozentrechnung', 'flaechenberechnung'],
  ergebnisNote: testklausurGesamtNote([18, 92, 58]),
  vorbereitungProThema: [
    { themaId: 'bruchrechnung', prozent: 18, note: 5.1, ampel: 'rot' },
    { themaId: 'prozentrechnung', prozent: 92, note: 1.4, ampel: 'gruen' },
    { themaId: 'flaechenberechnung', prozent: 58, note: 3.1, ampel: 'gelb' },
  ],
};

// t5 — k5: alles grün
const t5: TestklausurEingabe = {
  status: 'analysiert',
  fachId: 'biologie',
  themaIds: ['zellbiologie', 'genetik-vererbung'],
  ergebnisNote: testklausurGesamtNote([88, 82]),
  vorbereitungProThema: [
    { themaId: 'zellbiologie', prozent: 88, note: 1.6, ampel: 'gruen' },
    { themaId: 'genetik-vererbung', prozent: 82, note: 1.9, ampel: 'gruen' },
  ],
};

// t3 / t3b — k6: weimarer gelb → grün
const t3: TestklausurEingabe = {
  status: 'analysiert',
  fachId: 'geschichte',
  themaIds: ['weimarer-republik'],
  ergebnisNote: testklausurGesamtNote([55]),
  vorbereitungProThema: [{ themaId: 'weimarer-republik', prozent: 55, note: 3.3, ampel: 'gelb' }],
};
const t3b: TestklausurEingabe = {
  status: 'analysiert',
  fachId: 'geschichte',
  themaIds: ['weimarer-republik'],
  ergebnisNote: testklausurGesamtNote([78]),
  vorbereitungProThema: [{ themaId: 'weimarer-republik', prozent: 78, note: 2.1, ampel: 'gruen' }],
};

const basis = (over: Partial<LernplanEingabe>): LernplanEingabe => ({
  klausurThemaIds: null,
  klausurFachId: null,
  testklausur1: null,
  testklausur2: null,
  tageErledigt: [],
  checklist: null,
  ...over,
});

describe('lernplanStatus', () => {
  it('lp2 — Testklausur 1 nur erstellt → Tag 1', () => {
    const s = lernplanStatus(
      basis({
        klausurThemaIds: ['lineare-gleichungen'],
        klausurFachId: 'mathematik',
        testklausur1: tkErstellt,
      }),
    );
    expect(s.aktuellerTag).toBe(1);
    expect(s.tag1.erledigt).toBe(false);
    expect(s.tag1.schwacheThemen).toEqual([]);
    expect(s.letzteTestNr).toBeNull();
  });

  it('lp1 — mix, Tag 2 erledigt → aktueller Tag 3', () => {
    const s = lernplanStatus(
      basis({
        klausurThemaIds: t1.themaIds,
        klausurFachId: 'mathematik',
        testklausur1: t1,
        tageErledigt: [2],
      }),
    );
    expect(s.tag1.schwacheThemen).toEqual(['bruchrechnung', 'flaechenberechnung']); // rot vor gelb
    expect(s.tag1.fokusThemen).toEqual(['bruchrechnung', 'flaechenberechnung']);
    expect(s.tag1.kurzThemen).toEqual([]);
    expect(s.tag1.intensitaet).toBe('normal');
    expect(s.tag2.erledigt).toBe(true);
    expect(s.tag2.aufgaben).toEqual([
      'fehler:bruchrechnung',
      'beispiel:bruchrechnung',
      'check:bruchrechnung',
      'fehler:flaechenberechnung',
      'beispiel:flaechenberechnung',
      'check:flaechenberechnung',
    ]);
    expect(s.tag3.aufgaben).toEqual([
      'abfragen:bruchrechnung',
      'abfragen:flaechenberechnung',
      'gemischt',
      'loesungen',
    ]);
    expect(s.tag3.erledigt).toBe(false);
    expect(s.aktuellerTag).toBe(3);
    expect(s.letzteTestNr).toBe(1);
    expect(s.letzteTestNote).toBe(3.2);
  });

  it('lp5 — Testklausur 1 komplett stark → Kurzschluss, Tag 7 offen', () => {
    const s = lernplanStatus(
      basis({ klausurThemaIds: t5.themaIds, klausurFachId: 'biologie', testklausur1: t5 }),
    );
    expect(s.tag1.schwacheThemen).toEqual([]);
    expect(s.tag1.intensitaet).toBeNull();
    expect(s.tag2.erledigt).toBe(true); // Kurzschluss
    expect(s.tag5.erledigt).toBe(true);
    expect(s.tag5.noetig).toBe(false);
    expect(s.tag7.aufgaben).toEqual(['selbsttest']);
    expect(s.aktuellerTag).toBe(7);
    expect(s.letzteTestNote).toBe(1.8);
  });

  it('lp6 — beide Testklausuren analysiert, alle Tage erledigt → fertig', () => {
    const s = lernplanStatus(
      basis({
        klausurThemaIds: t3.themaIds,
        klausurFachId: 'geschichte',
        testklausur1: t3,
        testklausur2: t3b,
        tageErledigt: [2, 3, 4, 6, 7],
      }),
    );
    expect(s.tag1.intensitaet).toBe('tief');
    expect(s.tag6.stubborn).toEqual([]);
    expect(s.tag6.aufgefrischt).toEqual(['weimarer-republik']);
    expect(s.tag6.aufgaben).toEqual(['frisch:weimarer-republik']);
    expect(s.tag6.erledigt).toBe(true);
    expect(s.tag7.erledigt).toBe(true);
    expect(s.aktuellerTag).toBe('fertig');
    expect(s.letzteTestNr).toBe(2);
    expect(s.letzteTestNote).toBe(2.1);
  });

  it('lp4 — Testklausur 2 noch wackelig → aktueller Tag 6', () => {
    const t2: TestklausurEingabe = {
      status: 'analysiert',
      fachId: 'englisch',
      themaIds: ['vocabulary-environment', 'simple-past-present-perfect'],
      ergebnisNote: testklausurGesamtNote([94, 38]),
      vorbereitungProThema: [
        { themaId: 'vocabulary-environment', prozent: 94, note: 1.3, ampel: 'gruen' },
        { themaId: 'simple-past-present-perfect', prozent: 38, note: 4.1, ampel: 'rot' },
      ],
    };
    const t2b: TestklausurEingabe = {
      status: 'analysiert',
      fachId: 'englisch',
      themaIds: ['simple-past-present-perfect'],
      ergebnisNote: testklausurGesamtNote([61]),
      vorbereitungProThema: [
        { themaId: 'simple-past-present-perfect', prozent: 61, note: 3.0, ampel: 'gelb' },
      ],
    };
    const s = lernplanStatus(
      basis({
        klausurThemaIds: t2.themaIds,
        klausurFachId: 'englisch',
        testklausur1: t2,
        testklausur2: t2b,
        tageErledigt: [2, 3, 4],
      }),
    );
    expect(s.tag1.schwacheThemen).toEqual(['simple-past-present-perfect']);
    expect(s.tag6.stubborn).toEqual(['simple-past-present-perfect']);
    expect(s.tag6.aufgefrischt).toEqual([]);
    expect(s.tag6.erledigt).toBe(false);
    expect(s.aktuellerTag).toBe(6);
    expect(s.letzteTestNote).toBe(3.0);
  });

  it('checklist (einzelne Haken) übersteuert tageErledigt', () => {
    const s = lernplanStatus(
      basis({
        klausurThemaIds: t1.themaIds,
        klausurFachId: 'mathematik',
        testklausur1: t1,
        checklist: {
          '3': {
            'abfragen:bruchrechnung': true,
            'abfragen:flaechenberechnung': true,
            gemischt: true,
            loesungen: true,
          },
        },
      }),
    );
    expect(s.tag3.erledigt).toBe(true);
    expect(s.tag2.erledigt).toBe(false);
    expect(s.aktuellerTag).toBe(2);
  });
});

describe('klausurNote — zuletzt analysierte Testklausur', () => {
  it('nimmt Testklausur 2, sobald analysiert', () => {
    expect(
      klausurNote([
        { status: 'analysiert', ergebnisNote: 3.2 },
        { status: 'analysiert', ergebnisNote: 2.1 },
      ]),
    ).toEqual({ note: 2.1, testNr: 2 });
  });
  it('fällt auf Testklausur 1 zurück', () => {
    expect(
      klausurNote([
        { status: 'analysiert', ergebnisNote: 3.2 },
        { status: 'geloest', ergebnisNote: null },
      ]),
    ).toEqual({ note: 3.2, testNr: 1 });
  });
  it('null, wenn keine analysiert', () => {
    expect(klausurNote([{ status: 'erstellt', ergebnisNote: null }])).toBeNull();
  });
});
