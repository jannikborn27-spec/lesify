import { env } from '../../env.js';
import type { KiBild, KiClient, KiNachricht } from './client.js';

/**
 * Die zwölf KI-Calls aus `Konzept-texts/prompts/00-overview.md`–`12-*.md`,
 * jeweils System-Prompt (mit den dort festgelegten Textbausteinen) + feste
 * Tool-Schemas für alles, was in ein DB-Feld läuft. Nur die vier
 * Chat-Antworten (03–06/frei) und `antwortText` der Lernzettel-Revision (09)
 * bleiben Freitext.
 *
 * Modellwahl ist Config, nicht fest verdrahtet (§3 Prinzip 2): zwei Stufen,
 * `env.KI_MODELL_GUENSTIG` (Titel, Datei-Zusammenfassung, Verdichtung) und
 * `env.KI_MODELL_STANDARD` (alles mit echtem Reasoning) — beide Stufen zeigen
 * per Default auf Haiku 4.5 (siehe Kostenschätzung in `00-overview.md` §7),
 * einzeln auf ein stärkeres Modell umstellbar, ohne Call-Sites anzufassen.
 */
const MODELL_GUENSTIG = env.KI_MODELL_GUENSTIG;
const MODELL_STANDARD = env.KI_MODELL_STANDARD;

export type ChatModus = 'erklaeren' | 'hausaufgaben' | 'ueben' | 'zusammenfassen' | null;

const SCHULRELEVANZ_RIEGEL = `Wichtig: Bleibe bei schulischen Themen im Rahmen von Lesify (das Fach, das
Thema oder unmittelbar angrenzender Lernstoff). Bei Anfragen ohne
erkennbaren Schulbezug (z. B. private Beratung, Alltagsthemen ohne
Lernbezug) lehne freundlich ab und lenke zurück auf das Fach.`;

// ============================================================================
// Call 07 — Chat-Titel
// ============================================================================

export interface ChatTitelKontext {
  fachName: string;
  themaName: string;
  ersteNachricht: string;
}

export async function chatTitelErzeugen(ki: KiClient, ctx: ChatTitelKontext): Promise<string> {
  const system = `Du erzeugst aus der ersten Nachricht eines Schülers/einer Schülerin in
einem Lern-Chat einen kurzen, sprechenden Titel für die Chat-Liste.

Kontext: Fach ${ctx.fachName}, Thema ${ctx.themaName}.

Regeln:
1. Maximal 6 Wörter, keine Satzzeichen am Ende, keine Anführungszeichen.
2. Der Titel muss den konkreten Inhalt der Nachricht widerspiegeln (nicht
   nur "Frage zu ${ctx.themaName}" — außer die Nachricht ist tatsächlich so
   unspezifisch).
3. Kein Chat-Modus im Titel wiederholen (der wird separat angezeigt).
4. Deutsch, außer die Nachricht selbst ist in einer Fremdsprache verfasst
   (z. B. Englisch-Übung) — dann darf der Titel diese Sprache aufgreifen.

Antworte ausschließlich über das bereitgestellte Tool.`;

  const { ausgabe } = await ki.toolAufruf<{ titel: string }>({
    callTyp: 'chat_titel',
    system,
    messages: [{ rolle: 'user', text: ctx.ersteNachricht }],
    tool: {
      name: 'chat_titel',
      beschreibung: 'Kurzer Titel für einen neuen Chat, abgeleitet aus der ersten Nutzer-Nachricht',
      schema: {
        type: 'object',
        properties: {
          titel: { type: 'string', description: 'Max. 6 Wörter, ohne Satzzeichen am Ende' },
        },
        required: ['titel'],
      },
    },
    model: MODELL_GUENSTIG,
    maxTokens: 20,
    temperature: 0.25,
  });
  return ausgabe.titel;
}

// ============================================================================
// Calls 03–06 + neutraler „freie Frage"-Modus — Chat-Antworten
// ============================================================================

const MODUS_LABEL: Record<Exclude<ChatModus, null>, string> = {
  erklaeren: 'Erklären',
  hausaufgaben: 'Hausaufgabenhilfe',
  ueben: 'Üben / Abfragen',
  zusammenfassen: 'Zusammenfassen',
};

function modusAnweisung(modus: ChatModus): string {
  switch (modus) {
    case 'erklaeren':
      return `Deine Aufgabe: den angefragten Sachverhalt so erklären, dass er wirklich
verstanden wird — nicht nur eine Definition herunterrasseln.

Vorgehen:
1. Baue die Erklärung an einem konkreten Beispiel oder einer Beispielaufgabe
   auf (siehe Themen Memory für passende Beispiele aus Dateien/Lernzetteln),
   statt die fertige Regel/Definition direkt hinzuwerfen.
2. Geh Schritt für Schritt vor: erst kurz einordnen, dann die Herleitung
   entlang des Beispiels, erst am Ende die kompakte Regel/Zusammenfassung.
3. Knüpfe an bereits Bekanntes aus dem Themen Memory an, statt bei null
   anzufangen.
4. Ist die Anfrage sehr breit, wähle selbst einen sinnvollen Einstieg statt
   nur mit einer Rückfrage zu antworten.
5. Biete am Ende proaktiv eine weitere Beispielaufgabe oder Vertiefung an.
6. Sei prägnant: erkläre so knapp wie möglich, ohne fachlich zu kürzen.`;
    case 'hausaufgaben':
      return `WICHTIGSTE REGEL: Gib niemals im ersten Antwortschritt die fertige Lösung.
Der Schüler soll die Aufgabe selbst lösen — du führst ihn dorthin.

Vorgehen:
1. Verstehe zuerst, was genau die Aufgabe ist und wo der Schüler aktuell
   steht. Frag nach, falls unklar.
2. Gib einen gezielten Hinweis oder eine Rückfrage für den nächsten kleinen
   Schritt — keinen kompletten Lösungsweg auf einmal.
3. Lass den Schüler selbst rechnen/formulieren und reagiere darauf.
4. Nur nach einem ernsthaften eigenen Versuch, der weiterhin feststeckt,
   oder auf explizite Bitte: gib die vollständige Lösung mit Herleitung.
5. Bleib freundlich, auch bei mehrfachem Nachfragen oder Fehlern.
6. Sei so knapp wie möglich: ein guter Hinweis ist oft ein bis zwei Sätze.`;
    case 'ueben':
      return `WICHTIGSTE REGEL: Gib niemals direkt Lösungen vor, wenn du selbst eine
Übungsfrage gestellt hast. Der Schüler soll aktiv rechnen/antworten.

Vorgehen:
1. Ohne laufende Übungsfrage: stelle eine konkrete, klar beantwortbare
   Frage/Aufgabe zum Thema, orientiert am Themen Memory.
2. Antwortet der Schüler: bewerte fachlich korrekt. Richtig → kurz
   bestätigen, nächste (leicht anspruchsvollere) Frage. Falsch/unvollständig
   → gezielter Hinweis, zweiter Versuch.
3. Erst nach einem ernsthaften zweiten Versuch oder auf explizite Bitte:
   löse die Aufgabe vollständig mit Herleitung vor.
4. Ein Rhythmus: eine Frage/ein Hinweis pro Antwort.
5. Sei knapp: eine Übungsfrage oder ein Hinweis braucht selten mehr als
   zwei bis drei Sätze.`;
    case 'zusammenfassen':
      return `Deine Aufgabe: eine kompakte, direkte Zusammenfassung liefern — kein
Dialog, keine Rückfragen, kein sokratisches Vorgehen.

Vorgehen:
1. Fasse genau das zusammen, wonach gefragt wird — nutze in erster Linie
   den Themen-Memory-Kontext und ggf. die angehängte Datei-Zusammenfassung.
2. Priorisiere: zentrale Begriffe/Regeln zuerst, Details danach.
3. Stichpunkte/kurze Absätze statt langer Fließtext-Abschnitte.
4. Erfinde keine Inhalte, die nicht aus dem Themen Memory hervorgehen.
5. Keine Zwischenfragen wie „Willst du, dass ich …?" — liefere direkt das
   Ergebnis.
6. Kürzer ist besser als vollständiger.`;
    default:
      return `Deine Aufgabe: die Frage des Schülers hilfreich beantworten — es ist noch
kein bestimmter Chat-Modus gewählt (freie Frage).

Vorgehen:
1. Beantworte die Frage direkt und fachlich korrekt, orientiert am Themen
   Memory, sofern es dazu passt.
2. Ist die Frage eigentlich eine Hausaufgabe/Übungsaufgabe, biete an, in den
   passenden Modus zu wechseln (Erklären/Hausaufgabenhilfe/Üben), statt
   ungefragt die volle Lösung vorzugeben.
3. Sei prägnant und antworte in Markdown.`;
  }
}

export interface ChatAntwortKontext {
  modus: ChatModus;
  klassenstufe: string;
  fachName: string;
  themaName: string;
  themenMemory: string;
  tonfallBaustein: string;
  verlauf: KiNachricht[];
  neueNachricht: string;
  anhang?: { name: string; zusammenfassung: string };
}

export function chatSystemPrompt(ctx: ChatAntwortKontext): string {
  const label = ctx.modus ? MODUS_LABEL[ctx.modus] : 'freie Frage';
  return `Du bist Lesifys KI-Lernpartner im Modus „${label}" für einen
Schüler/eine Schülerin der ${ctx.klassenstufe}. Fach: ${ctx.fachName}. Thema: ${ctx.themaName}.

${ctx.themenMemory}

${ctx.tonfallBaustein}

${modusAnweisung(ctx.modus)}

Formatierung: Markdown, kurze Absätze, Formeln in Inline-Code oder
Codeblock, keine tief verschachtelten Listen.

${SCHULRELEVANZ_RIEGEL}`;
}

export async function chatAntwortErzeugen(
  ki: KiClient,
  ctx: ChatAntwortKontext,
): Promise<{ text: string; usage: import('./client.js').KiUsage }> {
  const system = chatSystemPrompt(ctx);
  const anhangZeile = ctx.anhang
    ? `\n\n[Anhang: ${ctx.anhang.name}] ${ctx.anhang.zusammenfassung}`
    : '';
  const messages: KiNachricht[] = [
    ...ctx.verlauf,
    { rolle: 'user', text: ctx.neueNachricht + anhangZeile },
  ];
  return ki.freitextAufruf({
    callTyp: `chat_${ctx.modus ?? 'frei'}`,
    system,
    messages,
    model: MODELL_STANDARD,
    maxTokens: ctx.modus === 'hausaufgaben' || ctx.modus === 'ueben' ? 500 : 900,
    temperature: 0.6,
    cache: true,
  });
}

// ============================================================================
// Call 08 — Lernzettel-Erstellung
// ============================================================================

export interface LernzettelErstellenKontext {
  klassenstufe: string;
  fachName: string;
  themaName: string;
  themaBeschreibung: string;
  tonfallBaustein: string;
  chatsUndDateien: string;
}

export async function lernzettelErstellen(
  ki: KiClient,
  ctx: LernzettelErstellenKontext,
): Promise<{ titel: string; content: string }> {
  const system = `Du erstellst für einen Schüler/eine Schülerin der ${ctx.klassenstufe} einen
vollständigen Lernzettel zum Thema „${ctx.themaName}" (Fach ${ctx.fachName}).

${ctx.themaBeschreibung}

${ctx.tonfallBaustein}

Dir liegt der gesamte bisherige Lern-Content zu diesem Thema vor: alle
Chatverläufe (verschiedene Modi: Erklären, Hausaufgabenhilfe, Üben,
Zusammenfassen) und alle Datei-Zusammenfassungen.

${ctx.chatsUndDateien}

Regeln:
1. Erstelle ein eigenständiges Lerndokument in Markdown — Überschriften,
   Stichpunkte, Formeln in Code-Notation wo passend.
2. Verdichte und dedupliziere: derselbe Sachverhalt erscheint nur einmal.
3. Gliedere didaktisch: Grundbegriffe/Regeln zuerst, dann Anwendung/
   Beispiele, dann Sonderfälle/häufige Fehler.
4. Nutze nur Inhalte, die tatsächlich aus den Chats/Dateien hervorgehen.
5. Ist nur ein Teilaspekt des Themas belegt, ist das in Ordnung.
6. Schlage einen prägnanten Titel für den Lernzettel vor.

Antworte ausschließlich über das bereitgestellte Tool.`;

  const { ausgabe } = await ki.toolAufruf<{ titel: string; content: string }>({
    callTyp: 'lernzettel_erstellen',
    system,
    messages: [{ rolle: 'user', text: 'Erstelle den Lernzettel.' }],
    tool: {
      name: 'lernzettel_erstellen',
      beschreibung:
        'Vollautomatisch generierter Lernzettel aus allen Chats und Dateien eines Themas',
      schema: {
        type: 'object',
        properties: {
          titel: { type: 'string', description: 'Prägnanter Titel des Lernzettels' },
          content: { type: 'string', description: 'Vollständiger Lernzettel-Inhalt in Markdown' },
        },
        required: ['titel', 'content'],
      },
    },
    model: MODELL_STANDARD,
    maxTokens: 2200,
    temperature: 0.35,
  });
  return ausgabe;
}

// ============================================================================
// Call 09 — Lernzettel-Revision
// ============================================================================

export interface LernzettelPatch {
  suchen: string;
  ersetzen: string;
}
export interface LernzettelRevisionAusgabe {
  antwortText: string;
  art: 'patch' | 'vollersatz';
  patches?: LernzettelPatch[];
  neuerContent?: string;
}

export interface LernzettelRevisionKontext {
  klassenstufe: string;
  fachName: string;
  themaName: string;
  tonfallBaustein: string;
  lernzettelContent: string;
  revisionsVerlauf: string;
  anweisung: string;
}

export async function lernzettelRevisionErzeugen(
  ki: KiClient,
  ctx: LernzettelRevisionKontext,
): Promise<LernzettelRevisionAusgabe> {
  const system = `Du überarbeitest im Gespräch mit einem Schüler/einer Schülerin der
${ctx.klassenstufe} einen bestehenden Lernzettel zum Thema „${ctx.themaName}"
(Fach ${ctx.fachName}).

${ctx.tonfallBaustein}

Aktueller Lernzettel-Inhalt:
${ctx.lernzettelContent}

Bisheriger Revisionsverlauf:
${ctx.revisionsVerlauf || '(noch keiner)'}

Regeln:
1. Setze die aktuelle Anweisung des Schülers präzise um.
2. Verändere den Rest des Dokuments nicht, außer die Anweisung erfordert
   es explizit.
3. Erhalte die bestehende Markdown-Struktur, wenn nichts anderes verlangt.
4. Ist die Anweisung unklar oder im Konflikt mit dem Inhalt: frag kurz
   nach, statt zu raten.
5. Gib zusätzlich eine kurze Bestätigung, was du geändert hast.
6. Gib deine Änderung standardmäßig als Patch-Liste zurück (art: "patch"):
   pro Änderung ein Paar aus exakt im aktuellen Content vorkommendem
   Ausschnitt (suchen) und Ersatztext (ersetzen). "suchen" muss
   eindeutig genug sein, um nur genau einmal vorzukommen. Nutze
   art: "vollersatz" mit neuerContent nur bei einer Neugliederung, die
   sich nicht als lokale Patches ausdrücken lässt.

Antworte ausschließlich über das bereitgestellte Tool.`;

  const { ausgabe } = await ki.toolAufruf<LernzettelRevisionAusgabe>({
    callTyp: 'lernzettel_revision',
    system,
    messages: [{ rolle: 'user', text: ctx.anweisung }],
    tool: {
      name: 'lernzettel_revision',
      beschreibung: 'Änderung am Lernzettel nach einer Revisionsanweisung',
      schema: {
        type: 'object',
        properties: {
          antwortText: { type: 'string', description: 'Kurze Bestätigung an den Schüler' },
          art: { type: 'string', enum: ['patch', 'vollersatz'] },
          patches: {
            type: 'array',
            items: {
              type: 'object',
              properties: { suchen: { type: 'string' }, ersetzen: { type: 'string' } },
              required: ['suchen', 'ersetzen'],
            },
          },
          neuerContent: { type: 'string' },
        },
        required: ['antwortText', 'art'],
      },
    },
    model: MODELL_STANDARD,
    maxTokens: 700,
    temperature: 0.3,
  });
  return ausgabe;
}

/**
 * Wendet Such-/Ersetzen-Patches der Reihe nach an. Wirft, wenn ein
 * `suchen`-Ausschnitt nicht genau einmal vorkommt (Backend-Verantwortung
 * laut `09-lernzettel-revision.md` §6).
 */
export function wendePatchesAn(content: string, patches: LernzettelPatch[]): string {
  let ergebnis = content;
  for (const p of patches) {
    const treffer = ergebnis.split(p.suchen).length - 1;
    if (treffer !== 1) {
      throw new Error(
        `Patch nicht eindeutig anwendbar (${treffer} Treffer): "${p.suchen.slice(0, 60)}…"`,
      );
    }
    ergebnis = ergebnis.replace(p.suchen, p.ersetzen);
  }
  return ergebnis;
}

// ============================================================================
// Call 10 — Testklausur-Erstellung
// ============================================================================

export interface TestklausurThemaInput {
  themaId: string;
  themaName: string;
  themaBeschreibung: string;
  lernzettelOderChats: string;
  dateiZusammenfassungen: string;
}

export async function testklausurAufgabenErzeugen(
  ki: KiClient,
  ctx: { klassenstufe: string; fachName: string; themen: TestklausurThemaInput[] },
): Promise<{ themaId: string; frage: string }[]> {
  const themenBlock = ctx.themen
    .map(
      (t) => `### Thema: ${t.themaName} (themaId: ${t.themaId})
${t.themaBeschreibung}

Verfügbares Material:
${t.lernzettelOderChats}

Datei-Zusammenfassungen:
${t.dateiZusammenfassungen}`,
    )
    .join('\n\n');

  const system = `Du erstellst Aufgaben für eine Testklausur, mit der ein Schüler/eine
Schülerin der ${ctx.klassenstufe} seine/ihre Klausurvorbereitung testet.
Fach: ${ctx.fachName}.

Für jedes der folgenden Themen erstellst du genau EINE Aufgabe:

${themenBlock}

Regeln:
1. Pro Thema genau eine Aufgabe — keine Multiple-Choice, keine
   Wahr/Falsch-Fragen. Die Aufgabe muss eine ausformulierte Antwort,
   Rechnung oder Herleitung verlangen.
2. Die Aufgabe muss ausschließlich mit dem bereitgestellten Material zu
   diesem Thema lösbar sein.
3. Angemessenes Niveau für ${ctx.klassenstufe}: fordernd, aber nicht über
   den behandelten Stoff hinaus.
4. Eindeutig und ohne Interpretationsspielraum bewertbar.
5. Keine Lösung/Musterlösung ausgeben — nur die Aufgabenstellung selbst.
6. Gib in themaId exakt die oben angegebene themaId zurück.

Antworte ausschließlich über das bereitgestellte Tool.`;

  const { ausgabe } = await ki.toolAufruf<{ aufgaben: { themaId: string; frage: string }[] }>({
    callTyp: 'testklausur_aufgaben',
    system,
    messages: [{ rolle: 'user', text: 'Erstelle die Aufgaben.' }],
    tool: {
      name: 'testklausur_aufgaben',
      beschreibung: 'Eine Aufgabe pro Thema für eine neue Testklausur',
      schema: {
        type: 'object',
        properties: {
          aufgaben: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                themaId: { type: 'string' },
                frage: {
                  type: 'string',
                  description: 'Vollständige Aufgabenstellung, keine Lösung',
                },
              },
              required: ['themaId', 'frage'],
            },
          },
        },
        required: ['aufgaben'],
      },
    },
    model: MODELL_STANDARD,
    maxTokens: ctx.themen.length * 200 + 200,
    temperature: 0.45,
    fakeKontext: { themaIds: ctx.themen.map((t) => t.themaId) },
  });
  return ausgabe.aufgaben;
}

// ============================================================================
// Call 11 — Testklausur-Analyse
// ============================================================================

export interface TestklausurAufgabeMitMaterial {
  themaId: string;
  themaName: string;
  frage: string;
  material: string;
}

export async function testklausurAnalyseErzeugen(
  ki: KiClient,
  ctx: {
    klassenstufe: string;
    fachName: string;
    aufgaben: TestklausurAufgabeMitMaterial[];
    loesungsText: string;
  },
): Promise<{ themaId: string; prozent: number; erklaerung: string }[]> {
  const aufgabenBlock = ctx.aufgaben
    .map(
      (a) => `### Aufgabe zu Thema „${a.themaName}" (themaId: ${a.themaId})
${a.frage}
Verfügbares Material zu diesem Thema:
${a.material}`,
    )
    .join('\n\n');

  const system = `Du wertest die Testklausur eines Schülers/einer Schülerin der
${ctx.klassenstufe} aus. Fach: ${ctx.fachName}. Der Schüler hat die komplette
Klausur eigenständig gelöst und als ein zusammenhängendes Dokument
hochgeladen — du liest es einmal vollständig und wertest alle Aufgaben in
diesem einen Durchgang aus.

Aufgaben dieser Testklausur (in Reihenfolge):
${aufgabenBlock}

Hochgeladene Lösung:
${ctx.loesungsText}

Vorgehen pro Aufgabe:
1. Ordne den passenden Abschnitt der hochgeladenen Lösung der Aufgabe zu.
   Fehlt eine Antwort komplett, werte sie als 0 % (nicht raten).
2. Bewerte die Antwort fachlich korrekt anhand des bereitgestellten
   Materials zu diesem Thema.
3. Vergib eine Prozentzahl (0–100) für die Qualität der Antwort.
4. Schreibe eine Erklärung: bei richtiger Antwort kurz bestätigen/loben.
   Bei Fehlern IMMER herleiten, warum die Antwort falsch/unvollständig war
   und wie man richtig hinkommt. 2–4 Sätze.

Wichtig: Gib für jede Aufgabe nur die Prozentzahl zurück, nicht die daraus
abgeleitete Schulnote oder Ampel-Stufe — die werden vom Backend nach fester
Formel abgeleitet. Gib in themaId exakt die oben angegebene themaId zurück.

Antworte ausschließlich über das bereitgestellte Tool.`;

  const { ausgabe } = await ki.toolAufruf<{
    ergebnisse: { themaId: string; prozent: number; erklaerung: string }[];
  }>({
    callTyp: 'testklausur_analyse',
    system,
    messages: [{ rolle: 'user', text: 'Werte die Klausur aus.' }],
    tool: {
      name: 'testklausur_analyse',
      beschreibung: 'Bewertung aller Aufgaben einer Testklausur inkl. Erklärung',
      schema: {
        type: 'object',
        properties: {
          ergebnisse: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                themaId: { type: 'string' },
                prozent: { type: 'integer', minimum: 0, maximum: 100 },
                erklaerung: { type: 'string' },
              },
              required: ['themaId', 'prozent', 'erklaerung'],
            },
          },
        },
        required: ['ergebnisse'],
      },
    },
    model: MODELL_STANDARD,
    maxTokens: ctx.aufgaben.length * 250 + 200,
    temperature: 0.25,
    fakeKontext: { themaIds: ctx.aufgaben.map((a) => a.themaId) },
  });
  return ausgabe.ergebnisse;
}

// ============================================================================
// Call 12 — Lernplan-Lernzettel (Tag 3/4/6)
// ============================================================================

export interface LernplanThemaInput {
  themaId: string;
  themaName: string;
  material: string;
  fehlerHinweis?: string;
}

export async function lernplanLernzettelErzeugen(
  ki: KiClient,
  ctx: {
    klassenstufe: string;
    fachName: string;
    bisherigerLernzettel: string | null;
    themen: LernplanThemaInput[];
  },
): Promise<{ themaId: string; abschnitt: string }[]> {
  const themenBlock = ctx.themen
    .map(
      (t) => `### Thema: ${t.themaName} (themaId: ${t.themaId})
Verfügbares Material:
${t.material}
Typischer Fehler des Schülers (aus der Testklausur-Auswertung, falls vorhanden):
${t.fehlerHinweis ?? '(keiner bekannt)'}`,
    )
    .join('\n\n');

  const system = `Du pflegst den Lernzettel eines Schülers/einer Schülerin der ${ctx.klassenstufe}
für die anstehende Klausur im Fach ${ctx.fachName}. Der Lernzettel ist ein
kompaktes „das muss ich mir merken"-Dokument — das Nötigste zum
kurzfristigen Abrufen.

${ctx.bisherigerLernzettel ? `Bisheriger Lernzettel (NICHT wiederholen, nur ergänzen):\n${ctx.bisherigerLernzettel}` : ''}

Für jedes der folgenden Themen schreibst du GENAU EINEN kurzen Markdown-Abschnitt:

${themenBlock}

Regeln pro Abschnitt:
1. Überschrift „### <Themenname>".
2. Danach höchstens 3 kurze Zeilen: die wichtigste Regel/Formel, der
   typische Fehler (bevorzugt der oben genannte), und ein Merksatz.
3. So knapp wie möglich — Stichpunkte, keine ausformulierten Absätze,
   keine Wiederholung von Inhalten aus dem bisherigen Lernzettel.
4. Nur Inhalte aus dem bereitgestellten Material.
5. Gib NUR die neuen Abschnitte zurück, nicht den ganzen Lernzettel.

Antworte ausschließlich über das bereitgestellte Tool.`;

  const { ausgabe } = await ki.toolAufruf<{ eintraege: { themaId: string; abschnitt: string }[] }>({
    callTyp: 'lernzettel_abschnitte',
    system,
    messages: [{ rolle: 'user', text: 'Erzeuge die Abschnitte.' }],
    tool: {
      name: 'lernzettel_abschnitte',
      beschreibung: 'Je Thema ein kurzer Markdown-Abschnitt zum Anhängen an den Lernzettel',
      schema: {
        type: 'object',
        properties: {
          eintraege: {
            type: 'array',
            items: {
              type: 'object',
              properties: { themaId: { type: 'string' }, abschnitt: { type: 'string' } },
              required: ['themaId', 'abschnitt'],
            },
          },
        },
        required: ['eintraege'],
      },
    },
    model: MODELL_GUENSTIG,
    maxTokens: ctx.themen.length * 130 + 60,
    temperature: 0.3,
    fakeKontext: { themaIds: ctx.themen.map((t) => t.themaId) },
  });
  return ausgabe.eintraege;
}

// ============================================================================
// Call 01 — Datei-Zusammenfassung (Phase 5)
// ============================================================================

export async function dateiZusammenfassungErzeugen(
  ki: KiClient,
  ctx: {
    fachName: string;
    themaName: string;
    dateiTyp: string;
    /** Extrahierter Text (pdf/doc). `null` bei Bildern — dann ist `bild` gesetzt (Vision). */
    dateiInhalt: string | null;
    bild?: KiBild;
  },
): Promise<{ vorgeschlagenerTitel: string; zusammenfassung: string }> {
  const system = `Du bist ein Assistenzsystem für Lesify, eine Lern-App für Schülerinnen und
Schüler ab der 5. Klasse. Deine einzige Aufgabe: den Inhalt einer
hochgeladenen Datei kurz und präzise zusammenzufassen, damit spätere
KI-Funktionen (Chat, Lernzettel, Testklausuren) den Inhalt nutzen können,
ohne die Originaldatei erneut zu lesen.

Kontext:
- Fach: ${ctx.fachName}
- Thema: ${ctx.themaName}
- Dateityp: ${ctx.dateiTyp}

Regeln:
1. Fasse ausschließlich zusammen, was tatsächlich in der Datei steht.
2. Schreibe für ein Schulpublikum ab der 5. Klasse verständlich.
3. Die Zusammenfassung muss eigenständig verwendbar sein — konkrete
   Begriffe, Formeln, Namen, Daten statt vager Umschreibungen.
4. Schlage einen kurzen, sprechenden Titel vor (max. 8 Wörter).
5. Enthält die Datei kaum lesbaren/irrelevanten Inhalt: das ehrlich angeben.

Antworte ausschließlich über das bereitgestellte Tool.`;

  const nachrichtText = ctx.dateiInhalt ?? 'Siehe angehängtes Bild.';

  const { ausgabe } = await ki.toolAufruf<{
    vorgeschlagenerTitel: string;
    zusammenfassung: string;
  }>({
    callTyp: 'datei_zusammenfassung',
    system,
    messages: [{ rolle: 'user', text: nachrichtText }],
    bilder: ctx.bild ? [ctx.bild] : undefined,
    tool: {
      name: 'datei_zusammenfassung',
      beschreibung: 'Titel-Vorschlag und Zusammenfassung einer hochgeladenen Datei',
      schema: {
        type: 'object',
        properties: {
          vorgeschlagenerTitel: { type: 'string' },
          zusammenfassung: { type: 'string' },
        },
        required: ['vorgeschlagenerTitel', 'zusammenfassung'],
      },
    },
    model: MODELL_GUENSTIG,
    maxTokens: 250,
    temperature: 0.25,
  });
  return ausgabe;
}

// ============================================================================
// Testklausur-Lösungs-Transkription aus einem Bild (Phase 5)
// ============================================================================

/**
 * Transkribiert eine fotografierte/gescannte Lösung wörtlich in Klartext —
 * Grundlage für `Testklausur.loesungsText` (Call 11 braucht Text, kein Bild).
 * Kein Tool-Call: Freitext, da die Ausgabe selbst der Zieltext ist.
 */
export async function loesungTextAusBildErzeugen(ki: KiClient, bild: KiBild): Promise<string> {
  const system = `Du transkribierst die handschriftliche oder gedruckte Lösung einer Schul-
Testklausur aus einem Foto/Scan wörtlich in Klartext. Gib **ausschließlich**
den transkribierten Text zurück — keine Einleitung, keine Kommentare, keine
Bewertung. Ist die Aufnahme unleserlich oder leer, gib „(nicht lesbar)" zurück.`;

  const { text } = await ki.freitextAufruf({
    callTyp: 'testklausur_loesung_transkription',
    system,
    messages: [{ rolle: 'user', text: 'Transkribiere die Lösung aus dem angehängten Bild.' }],
    bilder: [bild],
    model: MODELL_GUENSTIG,
    maxTokens: 2000,
    temperature: 0,
  });
  return text.trim();
}
