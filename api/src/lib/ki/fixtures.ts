import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { KiClient, KiFreitextAufruf, KiToolAufruf, KiUsage } from './client.js';

/**
 * Aufgezeichnete echte KI-Antworten (Fixtures) für die Testsuite: realistische
 * Modell-Ausgaben (lange Markdown-Lernzettel, Emoji, Mathe-Symbole, echte
 * Patch-Listen) statt der kurzen Platzhalter des `FakeKiClient` — ohne
 * API-Kosten. Aufnahme: `KI_FIXTURES_AUFNEHMEN=1 pnpm ki:smoke` schreibt
 * `fixtures/ki-antworten.json` neu.
 */
export const FIXTURE_DATEI = join(
  dirname(fileURLToPath(import.meta.url)),
  'fixtures',
  'ki-antworten.json',
);

type Aufnahme = Record<string, unknown>;
const leer: KiUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
};

/** Reicht an einen echten Client durch und merkt sich je Tool/Call-Typ die erste Antwort. */
export class AufnahmeKiClient implements KiClient {
  readonly aufnahme: Aufnahme = {};
  constructor(private readonly echt: KiClient) {}

  async toolAufruf<T>(opts: KiToolAufruf<T>) {
    const erg = await this.echt.toolAufruf(opts);
    this.aufnahme[`tool:${opts.tool.name}`] ??= erg.ausgabe;
    return erg;
  }
  async freitextAufruf(opts: KiFreitextAufruf) {
    const erg = await this.echt.freitextAufruf(opts);
    this.aufnahme[`text:${opts.callTyp}`] ??= erg.text;
    return erg;
  }
  async freitextStream(opts: KiFreitextAufruf, onDelta: (t: string) => void) {
    const erg = this.echt.freitextStream
      ? await this.echt.freitextStream(opts, onDelta)
      : await this.freitextAufruf(opts);
    this.aufnahme[`text:${opts.callTyp}`] ??= erg.text;
    return erg;
  }

  speichern(): void {
    mkdirSync(dirname(FIXTURE_DATEI), { recursive: true });
    writeFileSync(FIXTURE_DATEI, JSON.stringify(this.aufnahme, null, 2) + '\n');
  }
}

/**
 * Spielt die Aufnahme ab. `themaId`s in Tool-Ausgaben stammen aus dem
 * Aufnahme-Lauf und werden auf die aktuellen IDs umgeschrieben
 * (`fakeKontext.themaIds`, in Reihenfolge).
 */
export class FixtureKiClient implements KiClient {
  private readonly aufnahme: Aufnahme;
  constructor(aufnahme?: Aufnahme) {
    this.aufnahme = aufnahme ?? (JSON.parse(readFileSync(FIXTURE_DATEI, 'utf8')) as Aufnahme);
  }
  static verfuegbar(): boolean {
    return existsSync(FIXTURE_DATEI);
  }

  async toolAufruf<T>(opts: KiToolAufruf<T>) {
    const roh = this.aufnahme[`tool:${opts.tool.name}`];
    if (roh === undefined) throw new Error(`Keine Fixture für Tool ${opts.tool.name}`);
    const ids = (opts.fakeKontext as { themaIds?: string[] } | undefined)?.themaIds ?? [];
    return { ausgabe: umschreiben(structuredClone(roh), ids) as T, usage: leer };
  }
  async freitextAufruf(opts: KiFreitextAufruf) {
    const text = this.aufnahme[`text:${opts.callTyp}`] ?? this.aufnahme['text:chat_erklaeren'];
    if (typeof text !== 'string') throw new Error(`Keine Fixture für ${opts.callTyp}`);
    return { text, usage: leer };
  }
}

function umschreiben(wert: unknown, ids: string[]): unknown {
  if (!ids.length || !wert || typeof wert !== 'object') return wert;
  for (const v of Object.values(wert)) {
    if (!Array.isArray(v)) continue;
    v.forEach((eintrag, i) => {
      if (eintrag && typeof eintrag === 'object' && 'themaId' in eintrag) {
        (eintrag as { themaId: string }).themaId = ids[i % ids.length]!;
      }
    });
  }
  return wert;
}
