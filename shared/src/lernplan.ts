/**
 * Lernplan-Statusberechnung — bit-genauer Port von `Lesify.lernplanStatus` /
 * `aufgabenKeys` / `klausurNote` aus app/assets/js/data.js.
 *
 * Die Checklist-Keys je Lerntag MÜSSEN mit `lpTagAufgaben()` in
 * app/assets/js/app.js übereinstimmen (die Key-Liste wird an beiden Stellen
 * gepflegt). Paritäts-Tests: shared/src/lernplan.test.ts.
 */
import { prozentZuNote, type Ampel } from './noten.js';

export const LERNPLAN_FOKUS_LIMIT = 3;

export interface ProThemaVorbereitung {
  themaId: string;
  ampel: Ampel;
  note: number;
  prozent: number;
}

export interface TestklausurEingabe {
  status: 'erstellt' | 'geloest' | 'analysiert';
  fachId: string;
  themaIds: string[];
  /** ergebnis.note — Gesamtnote der Testklausur; null solange nicht analysiert */
  ergebnisNote: number | null;
  /** vorbereitung.proThema — null solange nicht analysiert */
  vorbereitungProThema: ProThemaVorbereitung[] | null;
}

export interface LernplanEingabe {
  klausurThemaIds: string[] | null;
  klausurFachId: string | null;
  testklausur1: TestklausurEingabe | null;
  testklausur2: TestklausurEingabe | null;
  tageErledigt: number[];
  checklist: Record<string, Record<string, boolean>> | null;
}

export type Intensitaet = null | 'tief' | 'normal' | 'triagiert';

/**
 * Gesamtnote einer Testklausur = `prozentZuNote(round(avg(prozent je Thema)))`
 * (data.js `analysiereTestklausur`). Null bei keinen Ergebnissen.
 */
export function testklausurGesamtNote(ergebnisProzente: number[]): number | null {
  if (ergebnisProzente.length === 0) return null;
  const gesamtProzent = Math.round(
    ergebnisProzente.reduce((a, b) => a + b, 0) / ergebnisProzente.length,
  );
  return prozentZuNote(gesamtProzent);
}

/**
 * „Die" Note einer Klausur für Karten/Übersichten: Note der zuletzt
 * **analysierten** Testklausur (2, sonst 1). `testNr` ∈ {1, 2}.
 * `tks` in Erstellungsreihenfolge (älteste zuerst).
 */
export function klausurNote(
  tks: { status: string; ergebnisNote: number | null }[],
): { note: number; testNr: 1 | 2 } | null {
  for (let i = tks.length - 1; i >= 0; i--) {
    const t = tks[i]!;
    if (t.status === 'analysiert' && t.ergebnisNote != null) {
      return { note: t.ergebnisNote, testNr: Math.min(i + 1, 2) as 1 | 2 };
    }
  }
  return null;
}

export interface Lerntag {
  erledigt: boolean;
  fokusThemen: string[];
  kurzThemen: string[];
  relevantThemen: string[];
  aufgaben: string[];
  checks: Record<string, boolean>;
}

export interface LernplanStatus {
  tag1: {
    erledigt: boolean;
    schwacheThemen: string[];
    fokusThemen: string[];
    kurzThemen: string[];
    intensitaet: Intensitaet;
    proThema: ProThemaVorbereitung[];
  };
  tag2: Lerntag;
  tag3: Lerntag;
  tag4: Lerntag;
  tag5: { erledigt: boolean; noetig: boolean; verfuegbar: boolean };
  tag6: {
    erledigt: boolean;
    stubborn: string[];
    aufgefrischt: string[];
    aufgaben: string[];
    checks: Record<string, boolean>;
  };
  tag7: { erledigt: boolean; aufgaben: string[]; checks: Record<string, boolean> };
  aktuellerTag: number | 'fertig';
  letzteTestNote: number | null;
  letzteTestNr: 1 | 2 | null;
  gesamtnoteAktuell: number | null;
}

export function lernplanStatus(inp: LernplanEingabe): LernplanStatus {
  const { testklausur1, testklausur2 } = inp;
  const tageErledigt = inp.tageErledigt ?? [];
  const istErledigt = (tag: number) => tageErledigt.indexOf(tag) !== -1;

  const tk1Analysiert = !!(
    testklausur1 &&
    testklausur1.status === 'analysiert' &&
    testklausur1.vorbereitungProThema
  );
  const klausurThemen = inp.klausurThemaIds ?? (testklausur1 ? testklausur1.themaIds : []);

  const proThema1: ProThemaVorbereitung[] =
    tk1Analysiert && testklausur1?.vorbereitungProThema
      ? testklausur1.vorbereitungProThema.map((p) => ({
          themaId: p.themaId,
          ampel: p.ampel,
          note: p.note,
          prozent: p.prozent,
        }))
      : [];

  const rang: Record<Ampel, number> = { rot: 0, gelb: 1, gruen: 2 };
  const schwacheThemen = proThema1
    .filter((p) => p.ampel !== 'gruen')
    .sort((a, b) => {
      if (rang[a.ampel] !== rang[b.ampel]) return rang[a.ampel] - rang[b.ampel];
      return b.note - a.note;
    })
    .map((p) => p.themaId);

  const fokusThemen = schwacheThemen.slice(0, LERNPLAN_FOKUS_LIMIT);
  const kurzThemen = schwacheThemen.slice(LERNPLAN_FOKUS_LIMIT);

  const intensitaet: Intensitaet =
    schwacheThemen.length === 0
      ? null
      : schwacheThemen.length === 1
        ? 'tief'
        : schwacheThemen.length <= LERNPLAN_FOKUS_LIMIT
          ? 'normal'
          : 'triagiert';

  const kurzschluss = tk1Analysiert && schwacheThemen.length === 0;

  const tk2Analysiert = !!(
    testklausur2 &&
    testklausur2.status === 'analysiert' &&
    testklausur2.vorbereitungProThema
  );
  const stubborn: string[] = [];
  const aufgefrischt: string[] = [];
  if (tk2Analysiert && testklausur2?.vorbereitungProThema) {
    for (const p of testklausur2.vorbereitungProThema) {
      if (p.ampel !== 'gruen') stubborn.push(p.themaId);
      else if (schwacheThemen.indexOf(p.themaId) !== -1) aufgefrischt.push(p.themaId);
    }
  }
  const tag6NichtsZuTun =
    kurzschluss || (tk2Analysiert && stubborn.length === 0 && aufgefrischt.length === 0);
  const ankerThema7 = schwacheThemen[0] ?? klausurThemen[0] ?? null;
  const fachId7 = testklausur1?.fachId ?? inp.klausurFachId ?? null;

  const aufgabenKeys = (n: number): string[] => {
    const K: string[] = [];
    if (n === 2) {
      for (const id of fokusThemen) K.push(`fehler:${id}`, `beispiel:${id}`, `check:${id}`);
      if (kurzThemen.length) K.push('kurz');
    } else if (n === 3) {
      for (const id of fokusThemen) K.push(`abfragen:${id}`);
      if (fokusThemen.length >= 2) K.push('gemischt');
      if (fokusThemen.length) K.push('loesungen');
      if (kurzThemen.length) K.push('kurzabfragen');
    } else if (n === 4) {
      for (const id of fokusThemen) K.push(`feynman:${id}`);
      if (fokusThemen.length) K.push('wiederholung');
      if (intensitaet === 'tief') K.push('transfer');
    } else if (n === 6) {
      for (const id of stubborn) K.push(`luecke:${id}`);
      for (const id of aufgefrischt) K.push(`frisch:${id}`);
    } else if (n === 7) {
      if (ankerThema7 && fachId7) K.push('selbsttest');
    }
    return K;
  };

  const rawChecks = inp.checklist ?? {};
  const checksFuer = (n: number): Record<string, boolean> => {
    const raw = rawChecks[String(n)];
    if (raw) return raw;
    if (istErledigt(n)) {
      const all: Record<string, boolean> = {};
      for (const k of aufgabenKeys(n)) all[k] = true;
      return all;
    }
    return {};
  };
  const aufgabenErledigt = (n: number): boolean => {
    const keys = aufgabenKeys(n);
    if (!keys.length) return false;
    const ch = checksFuer(n);
    return keys.every((k) => ch[k] === true);
  };

  const tag1 = {
    erledigt: tk1Analysiert,
    schwacheThemen,
    fokusThemen,
    kurzThemen,
    intensitaet,
    proThema: proThema1,
  };
  const lerntag = (tag: number): Lerntag => ({
    erledigt: kurzschluss || aufgabenErledigt(tag),
    fokusThemen: fokusThemen.slice(),
    kurzThemen: tag === 4 ? [] : kurzThemen.slice(),
    relevantThemen: fokusThemen.slice(),
    aufgaben: aufgabenKeys(tag),
    checks: checksFuer(tag),
  });
  const tag2 = lerntag(2);
  const tag3 = lerntag(3);
  const tag4 = lerntag(4);

  const tag5 = {
    erledigt: tk2Analysiert || kurzschluss,
    noetig: tk1Analysiert && schwacheThemen.length > 0,
    verfuegbar: tk1Analysiert,
  };
  const tag6 = {
    erledigt: tag6NichtsZuTun || aufgabenErledigt(6),
    stubborn,
    aufgefrischt,
    aufgaben: aufgabenKeys(6),
    checks: checksFuer(6),
  };
  const tag7 = {
    erledigt: aufgabenErledigt(7),
    aufgaben: aufgabenKeys(7),
    checks: checksFuer(7),
  };

  let aktuellerTag: number | 'fertig';
  if (!tk1Analysiert) {
    aktuellerTag = 1;
  } else if (kurzschluss) {
    aktuellerTag = tag7.erledigt ? 'fertig' : 7;
  } else {
    const offeneLerntage = [2, 3, 4].filter((tag) => !(kurzschluss || aufgabenErledigt(tag)));
    if (!tk2Analysiert && offeneLerntage.length > 0) aktuellerTag = offeneLerntage[0]!;
    else if (!tk2Analysiert) aktuellerTag = 5;
    else if (!tag6.erledigt) aktuellerTag = 6;
    else if (!tag7.erledigt) aktuellerTag = 7;
    else aktuellerTag = 'fertig';
  }

  const letzteTestNr: 1 | 2 | null = tk2Analysiert ? 2 : tk1Analysiert ? 1 : null;
  const letzteTestNote = tk2Analysiert
    ? (testklausur2?.ergebnisNote ?? null)
    : tk1Analysiert
      ? (testklausur1?.ergebnisNote ?? null)
      : null;

  return {
    tag1,
    tag2,
    tag3,
    tag4,
    tag5,
    tag6,
    tag7,
    aktuellerTag,
    letzteTestNote,
    letzteTestNr,
    gesamtnoteAktuell: letzteTestNote,
  };
}
