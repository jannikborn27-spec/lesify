/**
 * Realistischer Beispiel-Content für den Dev-Account (dev@lesify.de) —
 * gedacht für Screenshots (Ads, Website, Store). Anders als `seed.ts`
 * (Prototyp-Dummy-Daten des Demo-Users) ist der Inhalt hier durchgehend
 * fachlich korrekt und wirkt wie eine echte 8.-Klasse-Schülerin mitten im
 * Schuljahr (Stichtag: heute).
 *
 * Aufruf:  pnpm --filter ./api exec tsx prisma/seed-dev-account.ts
 * Idempotent: löscht ALLE Inhalte des Dev-Accounts (Fächer, Chats, Dateien,
 * Klausuren, Lernpläne, Usage, Abo …) und legt sie neu an. Der Login
 * (E-Mail, Passwort, Sessions) bleibt unangetastet.
 *
 * Dateien haben keinen echten Storage-Inhalt (`seed://`-Pfad, wie in seed.ts):
 * Listen/Karten/Zusammenfassungen sind sichtbar, „Öffnen" liefert nichts.
 */
import {
  PrismaClient,
  KiTonfall,
  ChatModus,
  NachrichtRolle,
  DateiTyp,
  DateiStatus,
  AboPaket,
  AboArt,
  AboIntervall,
  AboStatus,
  TestklausurStatus,
  type Ampel,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PLAN_LIMITS, prozentZuNote, noteAmpel } from '@lesify/shared';

const prisma = new PrismaClient();
const DEV_EMAIL = 'dev@lesify.de';

const now = Date.now();
const hoursAgo = (n: number) => new Date(now - n * 3_600_000);
const daysAgo = (n: number) => new Date(now - n * 86_400_000);
const isoDatum = (tageAb: number) => new Date(now + tageAb * 86_400_000).toISOString().slice(0, 10);

const ids: Record<string, string> = {};
const uid = (slug: string): string => (ids[slug] ??= randomUUID());
const F = (s: string) => uid(`fach:${s}`);
const T = (s: string) => uid(`thema:${s}`);

// ---------------------------------------------------------------- Fächer
const FAECHER = [
  ['mathematik', 'Mathematik', 'M', 'blue'],
  ['deutsch', 'Deutsch', 'D', 'rose'],
  ['englisch', 'Englisch', 'E', 'amber'],
  ['biologie', 'Biologie', 'B', 'teal'],
  ['geschichte', 'Geschichte', 'G', 'terracotta'],
] as const;

// [slug, fach, name, beschreibung]
const THEMEN: [string, string, string, string][] = [
  [
    'lineare-funktionen',
    'mathematik',
    'Lineare Funktionen',
    'Steigung, y-Achsenabschnitt und Funktionsgleichung aufstellen, zeichnen und ablesen.',
  ],
  [
    'lineare-gleichungssysteme',
    'mathematik',
    'Lineare Gleichungssysteme',
    'Gleichsetzungs-, Einsetzungs- und Additionsverfahren sicher anwenden.',
  ],
  [
    'prozentrechnung',
    'mathematik',
    'Prozentrechnung',
    'Grundwert, Prozentwert und Prozentsatz im Alltag berechnen.',
  ],
  [
    'gedichtanalyse',
    'deutsch',
    'Gedichtanalyse',
    'Metrum, Reimschema und sprachliche Mittel systematisch untersuchen und deuten.',
  ],
  [
    'eroerterung',
    'deutsch',
    'Erörterung',
    'Argumente sammeln, ordnen und eine schlüssige Erörterung aufbauen.',
  ],
  [
    'kurzgeschichte',
    'deutsch',
    'Kurzgeschichte',
    'Merkmale, Aufbau und Deutung von Kurzgeschichten.',
  ],
  [
    'present-perfect',
    'englisch',
    'Present Perfect vs. Simple Past',
    'Wann welche Zeitform — Signalwörter und typische Fehler.',
  ],
  [
    'conditional-sentences',
    'englisch',
    'Conditional Sentences',
    'If-Sätze Typ 1 und 2 bilden und unterscheiden.',
  ],
  [
    'vocabulary-environment',
    'englisch',
    'Vocabulary: Environment',
    'Wortschatz rund um Klima, Umwelt und Nachhaltigkeit.',
  ],
  ['zellbiologie', 'biologie', 'Zellbiologie', 'Aufbau und Funktion von Tier- und Pflanzenzellen.'],
  [
    'genetik',
    'biologie',
    'Genetik: Vererbung',
    'Mendelsche Regeln, dominante und rezessive Erbgänge, Kreuzungsschemata.',
  ],
  [
    'oekosystem-wald',
    'biologie',
    'Ökosystem Wald',
    'Nahrungsnetze, Stoffkreisläufe und Artenvielfalt im Wald.',
  ],
  [
    'industrialisierung',
    'geschichte',
    'Industrialisierung',
    'Ursachen, Erfindungen und soziale Folgen der Industriellen Revolution.',
  ],
  [
    'kaiserreich',
    'geschichte',
    'Das Kaiserreich',
    'Reichsgründung 1871, Bismarcks Politik und die Gesellschaft im Kaiserreich.',
  ],
  [
    'imperialismus',
    'geschichte',
    'Imperialismus',
    'Kolonialismus, Wettlauf um Afrika und die Folgen für die Welt.',
  ],
];

// ----------------------------------------------------------------- Chats
type Msg = [role: 'user' | 'ai', text: string];
interface ChatSeed {
  slug: string;
  thema: string;
  titel: string;
  modus: keyof typeof ChatModus;
  vorStunden: number;
  messages: Msg[];
}

const CHATS: ChatSeed[] = [
  {
    slug: 'gls-additionsverfahren',
    thema: 'lineare-gleichungssysteme',
    titel: 'Additionsverfahren: Wo liegt mein Fehler?',
    modus: 'hausaufgaben',
    vorStunden: 2,
    messages: [
      [
        'user',
        'Ich soll dieses System lösen: 2x + 3y = 12 und 4x − y = 10. Ich habe die zweite Gleichung mit 3 multipliziert und dann addiert, aber es kommt etwas Komisches heraus.',
      ],
      [
        'ai',
        'Guter Ansatz — die Idee, mit 3 zu multiplizieren, damit das y wegfällt, ist genau richtig! 👍\n\nSo sollte es aussehen:\n\n**II · 3:** 12x − 3y = 30\n\n**I + II:** 2x + 12x = 14x, die y-Terme heben sich auf (3y − 3y = 0), rechts 12 + 30 = 42\n\n→ 14x = 42, also **x = 3**\n\nEinsetzen in I: 2·3 + 3y = 12 → 3y = 6 → **y = 2**\n\nProbe mit II: 4·3 − 2 = 10 ✓\n\nWo genau ist es bei dir „komisch" geworden?',
      ],
      [
        'user',
        'Ich glaube, ich habe bei der Multiplikation die 10 auf der rechten Seite vergessen mitzunehmen.',
      ],
      [
        'ai',
        'Das ist der klassische Fehler beim Additionsverfahren — und gut, dass du ihn selbst gefunden hast.\n\n**Merksatz:** Wenn du eine Gleichung multiplizierst, multiplizierst du *beide* Seiten — sonst veränderst du die Gleichung.\n\nProbier es gleich nochmal mit diesem System:\n\n3x + 2y = 7\n5x − 2y = 9\n\nHier fällt y sogar direkt weg. Schreib mir gern deinen Rechenweg, dann schaue ich drüber.',
      ],
      ['user', 'Also addieren: 8x = 16, x = 2. Dann 3·2 + 2y = 7, also 2y = 1 und y = 0,5.'],
      [
        'ai',
        'Perfekt, beide Werte stimmen: **x = 2, y = 0,5**. 🎉 Probe mit der zweiten Gleichung: 5·2 − 2·0,5 = 10 − 1 = 9 ✓\n\nWenn du magst, üben wir als Nächstes ein System, bei dem du beide Gleichungen anpassen musst.',
      ],
    ],
  },
  {
    slug: 'prozent-begriffe',
    thema: 'prozentrechnung',
    titel: 'Grundwert, Prozentwert, Prozentsatz auseinanderhalten',
    modus: 'erklaeren',
    vorStunden: 7,
    messages: [
      ['user', 'Ich verwechsle immer, was Grundwert und was Prozentwert ist. Gibt es einen Trick?'],
      [
        'ai',
        'Ja! Frag dich immer: **„Wovon wird der Prozentsatz genommen?"**\n\n• **Grundwert (G):** das Ganze — entspricht 100 %\n• **Prozentsatz (p %):** der Anteil in Prozent\n• **Prozentwert (W):** der Teil vom Ganzen, den der Prozentsatz beschreibt\n\n**Beispiel:** Eine Jacke kostet 80 €, es gibt 25 % Rabatt.\n→ Grundwert = 80 € (das Ganze)\n→ Prozentsatz = 25 %\n→ Prozentwert = 80 € · 0,25 = 20 € (der Rabatt)\n\nDie Formel dazu: **W = G · p / 100**.',
      ],
      [
        'user',
        'Und wenn die Jacke nach dem Rabatt 60 € kostet — wie viel Prozent Rabatt waren das?',
      ],
      [
        'ai',
        'Dann drehen wir die Frage um: Der Rabatt beträgt 80 € − 60 € = **20 €** (das ist der Prozentwert), der Grundwert ist weiter der Originalpreis 80 €.\n\np = W / G = 20 / 80 = 0,25 = **25 %**\n\nAchte darauf: Der Grundwert ist immer der Wert *vor* der Änderung, nicht der neue Preis. Wer 20 durch 60 teilt, kommt fälschlich auf 33 %.',
      ],
    ],
  },
  {
    slug: 'funktionen-ueben',
    thema: 'lineare-funktionen',
    titel: 'Übungsaufgaben zu y = mx + b',
    modus: 'ueben',
    vorStunden: 26,
    messages: [
      ['user', 'Gib mir bitte drei Aufgaben zu linearen Funktionen zum Üben, nicht zu leicht.'],
      [
        'ai',
        'Gerne! Hier sind drei Aufgaben mit steigendem Anspruch:\n\n**1.** Eine Gerade verläuft durch P(1 | 3) und Q(4 | 9). Bestimme die Steigung und die Funktionsgleichung.\n\n**2.** Liegt der Punkt R(−2 | −5) auf dem Graphen von f(x) = 2x − 1?\n\n**3.** Berechne die Nullstelle von f(x) = −1,5x + 6.\n\nSchreib mir deine Lösungen — ich korrigiere sie.',
      ],
      [
        'user',
        '1) m = (9 − 3)/(4 − 1) = 2, dann 3 = 2·1 + b, also b = 1 und y = 2x + 1.\n2) f(−2) = 2·(−2) − 1 = −5, also ja.\n3) 0 = −1,5x + 6, x = 4.',
      ],
      [
        'ai',
        'Alle drei richtig, sauber gerechnet! ✅\n\n• Aufgabe 1: m = 2 und b = 1 stimmen — mit Q gegengeprüft: 2·4 + 1 = 9 ✓\n• Aufgabe 2: Punktprobe korrekt.\n• Aufgabe 3: Die Nullstelle ist x = 4, also schneidet der Graph die x-Achse bei N(4 | 0).\n\nWillst du eine Runde mit Textaufgaben (z. B. Handytarife)? Die kommen in Klausuren gern vor.',
      ],
    ],
  },
  {
    slug: 'jambus-trochaeus',
    thema: 'gedichtanalyse',
    titel: 'Jambus oder Trochäus — wie erkenne ich das?',
    modus: 'erklaeren',
    vorStunden: 30,
    messages: [
      ['user', 'Woran erkenne ich, ob ein Gedicht im Jambus oder im Trochäus geschrieben ist?'],
      [
        'ai',
        'Du schaust, **womit** der Vers beginnt:\n\n• **Jambus:** unbetont – betont (x X), z. B. „ge-**BEN**", „ver-**STEHN**", „be-**GINN**"\n• **Trochäus:** betont – unbetont (X x), z. B. „**HIM**-mel", „**MOR**-gen", „**LEI**-se"\n\n**So gehst du vor:**\n1. Vers laut lesen und dabei natürlich betonen (nicht künstlich!)\n2. Betonte Silben mit einem Strich markieren\n3. Prüfen: Beginnt der Vers mit einer betonten oder unbetonten Silbe? Wechselt es regelmäßig ab?\n\nIn der Analyse schreibst du dann z. B.: „Das Gedicht ist im vierhebigen Jambus verfasst, was ihm einen ruhigen, gleichmäßigen Rhythmus verleiht."',
      ],
      ['user', 'Und was, wenn das Metrum an einer Stelle bricht?'],
      [
        'ai',
        'Dann hast du oft einen Hinweis auf die Deutung! 🔍 Ein Metrumbruch hebt eine Stelle hervor — z. B. wenn eine Figur plötzlich in Panik gerät oder sich die Stimmung dreht.\n\nNotiere in der Analyse: **Wo** bricht das Metrum, **wie** (zusätzliche oder fehlende Silbe) und **welche Wirkung** das hat. Genau diese Verbindung von Form und Inhalt bringt in der Klausur die meisten Punkte.',
      ],
    ],
  },
  {
    slug: 'eroerterung-einleitung',
    thema: 'eroerterung',
    titel: 'Feedback zu meiner Einleitung',
    modus: 'hausaufgaben',
    vorStunden: 52,
    messages: [
      [
        'user',
        'Kannst du mal auf meine Einleitung schauen? „Heutzutage nutzen viele Jugendliche ihr Handy den ganzen Tag. Ich möchte in meiner Erörterung klären, ob Smartphones in der Schule erlaubt sein sollten."',
      ],
      [
        'ai',
        'Der Themenbezug ist klar und die Fragestellung am Ende ist gut formuliert — das ist schon die halbe Miete. 👍 Zwei Verbesserungen:\n\n**1. „Heutzutage" streichen.** Das ist eine typische Floskel, die Lehrkräfte oft anstreichen. Beginne stattdessen mit einem konkreten Aufhänger, z. B. einer Alltagsszene („In der großen Pause starrt fast jeder auf sein Display …") oder einer Zahl.\n\n**2. Leitfrage zuspitzen.** „Ob Smartphones erlaubt sein sollten" ist sehr allgemein. Besser: „Sollten Smartphones im Unterricht und in den Pausen an Schulen erlaubt sein?"\n\nSo könnte es klingen:\n> „In der großen Pause starrt fast jeder auf sein Display. Doch gehört das Smartphone deshalb auch in den Schulalltag? Diese Frage soll im Folgenden erörtert werden."',
      ],
      ['user', 'Das klingt besser, danke! Muss ich in der Einleitung schon meine Meinung sagen?'],
      [
        'ai',
        'Nein — in der Einleitung stellst du nur die Frage. Deine eigene Meinung gehört ins **Fazit**, nachdem du die Argumente abgewogen hast. In der Einleitung reicht: Aufhänger → Leitfrage → (optional) ein Satz zum Aufbau.',
      ],
    ],
  },
  {
    slug: 'present-perfect-regeln',
    thema: 'present-perfect',
    titel: 'Wann benutze ich das Present Perfect?',
    modus: 'erklaeren',
    vorStunden: 76,
    messages: [
      [
        'user',
        'Wann benutze ich Present Perfect und wann Simple Past? Ich bringe das immer durcheinander.',
      ],
      [
        'ai',
        'Die Faustregel: **Ist die Zeit genannt oder abgeschlossen → Simple Past. Zählt das Ergebnis für jetzt → Present Perfect.**\n\n**Simple Past** (Signalwörter: yesterday, last week, in 2019, ago)\n• I **visited** London last summer.\n\n**Present Perfect** (Signalwörter: already, yet, ever, never, since, for, just)\n• I **have visited** London three times. (Erfahrung, kein Zeitpunkt)\n• She **has lived** here since 2019. (dauert bis jetzt an)\n\n⚠️ **Typischer Fehler:** ~~I have seen him yesterday.~~ → *I saw him yesterday.* Sobald ein genauer Zeitpunkt dabei ist, kommt das Simple Past.',
      ],
      ['user', 'Ist „I have lived here since 2019" dann richtig?'],
      [
        'ai',
        'Ja, richtig! ✅ „Since 2019" nennt zwar ein Jahr, aber es beschreibt den *Beginn* eines Zustands, der bis jetzt andauert — deshalb Present Perfect. Merke dir: **since + Zeitpunkt** und **for + Zeitspanne** stehen beide mit Present Perfect.\n\nTestest du dich? Setz die richtige Form ein: „We ___ (watch) a film last night." und „They ___ (not finish) their homework yet."',
      ],
    ],
  },
  {
    slug: 'tier-pflanzenzelle',
    thema: 'zellbiologie',
    titel: 'Unterschied Tier- und Pflanzenzelle',
    modus: 'erklaeren',
    vorStunden: 100,
    messages: [
      ['user', 'Was ist der Unterschied zwischen einer Tierzelle und einer Pflanzenzelle?'],
      [
        'ai',
        'Beide Zelltypen haben **Zellkern, Zellmembran, Zellplasma, Mitochondrien und Ribosomen**. Pflanzenzellen besitzen zusätzlich:\n\n• **Zellwand** (aus Cellulose) — gibt Stabilität und Form\n• **Chloroplasten** — hier findet die Fotosynthese statt (Lichtenergie → Traubenzucker)\n• **große Zentralvakuole** — speichert Wasser und Stoffe und sorgt für den Druck, der Pflanzen aufrecht hält\n\nTierzellen haben dagegen nur kleine Vakuolen und keine Zellwand — deshalb sind sie flexibler.',
      ],
      [
        'user',
        'Warum haben Pflanzen dann auch Mitochondrien, wenn sie doch schon Chloroplasten haben?',
      ],
      [
        'ai',
        'Sehr gute Frage! 👏 Die beiden haben unterschiedliche Aufgaben:\n\n• **Chloroplasten** *bauen auf*: Sie stellen aus CO₂ und Wasser mit Licht Traubenzucker her.\n• **Mitochondrien** *verbrennen*: Sie gewinnen aus dem Traubenzucker die Energie, die die Zelle wirklich verwenden kann (Zellatmung).\n\nDazu kommt: Nicht jede Pflanzenzelle hat Chloroplasten (Wurzelzellen z. B. nicht), und nachts gibt es kein Licht. Mitochondrien brauchen aber *alle* Zellen — auch Pflanzenzellen — jederzeit.',
      ],
    ],
  },
  {
    slug: 'mendel-kreuzung',
    thema: 'genetik',
    titel: 'Kreuzungsquadrat bei Erbsenblüten',
    modus: 'hausaufgaben',
    vorStunden: 124,
    messages: [
      [
        'user',
        'Rote Blüten (R) sind dominant über weiße (r). Ich kreuze zwei Pflanzen mit dem Genotyp Rr. Wie viele Nachkommen haben weiße Blüten?',
      ],
      [
        'ai',
        'Das lösen wir mit einem Kreuzungsquadrat. Jede Elternpflanze gibt entweder R oder r weiter:\n\n|   | R  | r  |\n|---|----|----|\n| **R** | RR | Rr |\n| **r** | Rr | rr |\n\n**Genotypen:** 1 RR : 2 Rr : 1 rr\n\n**Phänotypen:** RR, Rr und Rr sehen alle rot aus, denn R ist dominant. Nur **rr** hat weiße Blüten.\n\n→ **25 %** der Nachkommen sind weiß, **75 %** rot (Verhältnis 3 : 1). Das ist die **2. Mendelsche Regel** (Spaltungsregel).',
      ],
      ['user', 'Und wenn ich RR mit rr kreuze?'],
      [
        'ai',
        'Dann greift die **1. Mendelsche Regel** (Uniformitätsregel): Alle Nachkommen der ersten Generation sind **Rr** — also genotypisch gleich. Weil R dominant ist, blühen sie alle **rot**. Die weiße Farbe ist nur „versteckt" und kann in der nächsten Generation wieder auftauchen. 🌸',
      ],
    ],
  },
  {
    slug: 'industrialisierung-ursachen',
    thema: 'industrialisierung',
    titel: 'Ursachen der Industrialisierung zusammengefasst',
    modus: 'zusammenfassen',
    vorStunden: 148,
    messages: [
      [
        'user',
        'Kannst du mir die Ursachen und Folgen der Industrialisierung in Deutschland kurz zusammenfassen?',
      ],
      [
        'ai',
        '**Ursachen**\n• **Dampfmaschine** (James Watt verbesserte sie ab 1769) — Maschinen brauchten keine Wasserkraft mehr\n• **Textilindustrie** als Startbranche: mechanische Webstühle ersetzten Handarbeit\n• **Eisenbahn** — 1835 fuhr die erste deutsche Bahn von Nürnberg nach Fürth; Rohstoffe und Waren wurden schnell transportiert\n• **Bevölkerungswachstum & Landflucht** — viele Arbeitskräfte zogen in die Städte\n\n**Folgen**\n• Entstehung von **Fabriken** und Industriestädten (z. B. im Ruhrgebiet)\n• Neue Klassen: **Fabrikbesitzer** (Bürgertum) und **Arbeiterschaft** (Proletariat)\n• **Soziale Frage:** lange Arbeitszeiten, niedrige Löhne, Kinderarbeit, schlechte Wohnverhältnisse\n• Antworten darauf: Gewerkschaften, Arbeiterparteien, Sozialgesetze unter Bismarck\n\nSoll ich daraus einen Lernzettel machen?',
      ],
    ],
  },
];

// -------------------------------------------------------------- Lernzettel
interface LzSeed {
  slug: string;
  thema: string;
  titel: string;
  vorTagen: number;
  freeMessagesUsed: number;
  content: string;
  revisionen: Msg[];
}

const LERNZETTEL: LzSeed[] = [
  {
    slug: 'gls',
    thema: 'lineare-gleichungssysteme',
    titel: 'Lineare Gleichungssysteme — die drei Verfahren',
    vorTagen: 0.2,
    freeMessagesUsed: 4,
    content: `## Was ist ein lineares Gleichungssystem?
Zwei Gleichungen mit zwei Unbekannten (x und y), die **gleichzeitig** gelten sollen. Die Lösung ist das Zahlenpaar (x | y), das beide Gleichungen erfüllt — grafisch der **Schnittpunkt** zweier Geraden.

## Die drei Verfahren
**1. Gleichsetzungsverfahren** — beide Gleichungen nach y auflösen und gleichsetzen.
Passt, wenn beide Gleichungen schon nach y (oder x) umgestellt sind.

**2. Einsetzungsverfahren** — eine Gleichung nach einer Variablen auflösen und in die andere einsetzen.
Passt, wenn eine Variable ohne Vorfaktor vorkommt (z. B. y = 2x − 1).

**3. Additionsverfahren** — Gleichungen so multiplizieren, dass sich eine Variable beim Addieren aufhebt.
Passt bei Systemen in der Form ax + by = c.

## Beispiel (Additionsverfahren)
2x + 3y = 12 und 4x − y = 10
→ II · 3: 12x − 3y = 30
→ I + II: 14x = 42 → **x = 3**
→ eingesetzt in I: 6 + 3y = 12 → **y = 2**
**Probe:** 4·3 − 2 = 10 ✓

## Sonderfälle
• **Keine Lösung:** Es entsteht eine falsche Aussage (z. B. 0 = 5) — die Geraden sind parallel.
• **Unendlich viele Lösungen:** Es entsteht eine wahre Aussage (z. B. 0 = 0) — die Geraden sind identisch.

## Typische Fehler
⚠️ Beim Multiplizieren die **rechte Seite** vergessen · Vorzeichen beim Subtrahieren · Probe nicht gemacht.`,
    revisionen: [
      ['user', 'Kannst du noch ein Beispiel für das Einsetzungsverfahren ergänzen?'],
      [
        'ai',
        'Klar — ich habe im Abschnitt „Die drei Verfahren" ein Beispiel ergänzt: y = 2x − 1 und 3x + y = 14 → 3x + (2x − 1) = 14 → 5x = 15 → x = 3 → y = 5.',
      ],
    ],
  },
  {
    slug: 'prozent',
    thema: 'prozentrechnung',
    titel: 'Prozentrechnung — Formeln & Alltag',
    vorTagen: 1,
    freeMessagesUsed: 2,
    content: `## Die drei Größen
• **Grundwert G** — das Ganze (entspricht 100 %)
• **Prozentsatz p %** — der Anteil in Prozent
• **Prozentwert W** — der Teil vom Ganzen

## Die Formeln
**W = G · p / 100**
**G = W · 100 / p**
**p = W / G · 100**

## Beispiele aus dem Alltag
**Rabatt:** Jacke 80 €, 25 % Rabatt → W = 80 · 0,25 = 20 € gespart, neuer Preis 60 €.
**Mehrwertsteuer:** Preis netto 50 €, 19 % MwSt. → W = 50 · 0,19 = 9,50 €, brutto 59,50 €.
**Zinsen:** 500 € zu 2 % pro Jahr → W = 500 · 0,02 = 10 € Zinsen.

## Wachstumsfaktor (Abkürzung)
Ein Aufschlag von 20 % entspricht dem Faktor **1,2**, ein Rabatt von 15 % dem Faktor **0,85**.
Neuer Wert = alter Wert · Faktor.

## Typische Fehler
⚠️ Den **neuen** Wert als Grundwert nehmen — der Grundwert ist immer der Wert *vor* der Änderung.
⚠️ „Prozent" und „Prozentpunkte" verwechseln.`,
    revisionen: [],
  },
  {
    slug: 'gedicht',
    thema: 'gedichtanalyse',
    titel: 'Gedichtanalyse — Aufbau und Stilmittel',
    vorTagen: 9,
    freeMessagesUsed: 7,
    content: `## Aufbau einer Gedichtanalyse
1. **Einleitung:** Titel, Autor, Erscheinungsjahr, Gedichtart, Thema in einem Satz
2. **Inhalt:** Was passiert? (Strophe für Strophe, in eigenen Worten, Präsens)
3. **Form:** Strophen, Verse, Reimschema, Metrum, Kadenz
4. **Sprache:** Stilmittel und ihre **Wirkung**
5. **Deutung:** Wie hängen Form, Sprache und Inhalt zusammen? Was will das Gedicht aussagen?

## Wichtige Fachbegriffe
| Begriff | Bedeutung |
|---|---|
| Jambus | unbetont – betont (x X) |
| Trochäus | betont – unbetont (X x) |
| Reimschema | z. B. Paarreim (aabb), Kreuzreim (abab), umarmender Reim (abba) |
| Enjambement | Satz läuft über das Versende hinaus |
| Metapher | Bild ohne „wie" („Wolkenmeer") |
| Personifikation | Dinge handeln wie Menschen |
| Anapher | gleicher Wortanfang in aufeinanderfolgenden Versen |

## Merksatz zur Wirkung
Nie nur *benennen*, immer **belegen und deuten**: Stilmittel → Textstelle (Vers) → Wirkung.

Beispiel: „Die Personifikation ‚der Wind flüstert' (V. 3) erzeugt eine ruhige, geheimnisvolle Stimmung."`,
    revisionen: [
      ['user', 'Füg bitte noch eine Erklärung zum Enjambement hinzu.'],
      [
        'ai',
        'Erledigt: Ein Enjambement (Zeilensprung) liegt vor, wenn ein Satz über das Versende hinausläuft. Wirkung: Der Lesefluss wird beschleunigt oder eine Aussage bekommt Spannung.',
      ],
    ],
  },
  {
    slug: 'pp',
    thema: 'present-perfect',
    titel: 'Present Perfect vs. Simple Past',
    vorTagen: 1,
    freeMessagesUsed: 0,
    content: `## Simple Past — abgeschlossene Handlung in der Vergangenheit
**Signalwörter:** yesterday, last week/year, in 2019, two days ago, when I was …
• I **watched** a film last night.
• She **moved** to Hamburg in 2021.

## Present Perfect — Bezug zur Gegenwart
**Bildung:** have/has + 3. Verbform (I have played, she has gone)
**Signalwörter:** already, yet, ever, never, just, so far, since, for
• I **have never been** to Scotland. (Erfahrung)
• We **have lived** here **since** 2019. (dauert an)
• He **has just finished** his homework. (Ergebnis zählt jetzt)

## since vs. for
• **since** + Zeitpunkt: since Monday, since 2019
• **for** + Zeitspanne: for two hours, for three years

## Typische Fehler
⚠️ ~~I have seen him yesterday.~~ → I **saw** him yesterday.
⚠️ ~~I am here since Monday.~~ → I **have been** here since Monday.`,
    revisionen: [],
  },
  {
    slug: 'zelle',
    thema: 'zellbiologie',
    titel: 'Zellbiologie — Tier- und Pflanzenzelle im Vergleich',
    vorTagen: 4,
    freeMessagesUsed: 1,
    content: `## Bestandteile beider Zelltypen
| Zellbestandteil | Aufgabe |
|---|---|
| Zellkern | enthält die Erbinformation (DNA), steuert die Zelle |
| Zellmembran | umgibt die Zelle, kontrolliert den Stoffaustausch |
| Zellplasma | füllt die Zelle aus, Ort vieler Stoffwechselvorgänge |
| Mitochondrien | „Kraftwerke": Energiegewinnung durch Zellatmung |
| Ribosomen | bauen Proteine auf |

## Nur in Pflanzenzellen
• **Zellwand** (Cellulose): Stabilität und Form
• **Chloroplasten:** Fotosynthese (CO₂ + Wasser + Licht → Traubenzucker + Sauerstoff)
• **Große Zentralvakuole:** Speicher, sorgt für Zelldruck

## Merksatz
Chloroplasten *bauen auf* (Zucker herstellen), Mitochondrien *verbrennen* (Energie freisetzen) — Pflanzen brauchen beides.

## Mikroskopieren
Vergrößerung = Okular · Objektiv (z. B. 10 · 40 = 400-fach).`,
    revisionen: [],
  },
];

// ----------------------------------------------------------------- Dateien
// [slug, thema, name, typ, bytes, vorTagen, zusammenfassung]
const DATEIEN: [string, string, string, keyof typeof DateiTyp, number, number, string][] = [
  [
    'd1',
    'lineare-funktionen',
    'Arbeitsblatt_Lineare_Funktionen.pdf',
    'pdf',
    640_000,
    12,
    'Arbeitsblatt mit 10 Aufgaben zu Steigung, y-Achsenabschnitt und Punktprobe; Aufgaben 7–10 als Textaufgaben (Handytarife).',
  ],
  [
    'd2',
    'lineare-gleichungssysteme',
    'Hefteintrag_Gleichungssysteme.jpg',
    'img',
    2_400_000,
    3,
    'Foto des Hefteintrags zum Additionsverfahren mit zwei durchgerechneten Beispielen und Merkkasten.',
  ],
  [
    'd3',
    'prozentrechnung',
    'Uebungsblatt_Prozentrechnung.pdf',
    'pdf',
    410_000,
    6,
    'Übungsblatt zu Grundwert, Prozentwert und Prozentsatz mit 12 Alltagsaufgaben (Rabatt, Mehrwertsteuer, Zinsen), inkl. Lösungen.',
  ],
  [
    'd4',
    'gedichtanalyse',
    'Balladenanalyse_Beispiel.pdf',
    'pdf',
    380_000,
    10,
    'Musteranalyse einer Ballade mit Gliederung, Metrum-Bestimmung und Deutungshypothese — als Vorlage für die eigene Analyse.',
  ],
  [
    'd5',
    'eroerterung',
    'Eroerterung_Entwurf_Smartphones.docx',
    'doc',
    52_000,
    2,
    'Entwurf einer Erörterung „Smartphones an Schulen": Einleitung, drei Pro- und zwei Contra-Argumente, Fazit noch offen.',
  ],
  [
    'd6',
    'present-perfect',
    'Grammar_Present_Perfect_Worksheet.pdf',
    'pdf',
    290_000,
    5,
    'Grammar-Worksheet mit Lückentexten zu Present Perfect und Simple Past, Signalwörter-Tabelle auf Seite 2.',
  ],
  [
    'd7',
    'zellbiologie',
    'Zelle_Beschriftung.png',
    'img',
    1_800_000,
    8,
    'Beschriftetes Schaubild einer Pflanzenzelle mit Zellwand, Chloroplasten, Vakuole, Zellkern und Mitochondrien.',
  ],
  [
    'd8',
    'genetik',
    'Mendel_Kreuzungsschema.pdf',
    'pdf',
    520_000,
    7,
    'Erklärung der drei Mendelschen Regeln mit Kreuzungsquadraten für Erbsenblüten (rot/weiß) und Zahlenverhältnissen.',
  ],
  [
    'd9',
    'industrialisierung',
    'Industrialisierung_Buchseiten.pdf',
    'pdf',
    1_350_000,
    14,
    'Scan der Buchseiten zur Industrialisierung: Dampfmaschine, Eisenbahn, Fabrikarbeit und die „Soziale Frage".',
  ],
];

// ---------------------------------------------------------------- Klausuren
// [slug, fach, themen, titel, datum (Tage ab heute)]
const KLAUSUREN: [string, string, string[], string, number][] = [
  [
    'kd1',
    'deutsch',
    ['gedichtanalyse', 'kurzgeschichte'],
    'Deutsch Klausur — Gedichtanalyse & Kurzgeschichte',
    -7,
  ],
  [
    'km1',
    'mathematik',
    ['lineare-funktionen', 'lineare-gleichungssysteme', 'prozentrechnung'],
    'Mathe Klausur — Lineare Funktionen, Gleichungssysteme & Prozent',
    7,
  ],
  [
    'ke1',
    'englisch',
    ['present-perfect', 'conditional-sentences'],
    'Englisch Test — Tenses & Conditionals',
    12,
  ],
  ['kb1', 'biologie', ['zellbiologie', 'genetik'], 'Bio Klausur — Zellbiologie & Genetik', 18],
  ['kd2', 'deutsch', ['eroerterung'], 'Deutsch Klausur — Erörterung', 25],
  [
    'kg1',
    'geschichte',
    ['industrialisierung', 'kaiserreich'],
    'Geschichte Klausur — Industrialisierung & Kaiserreich',
    32,
  ],
];

// ------------------------------------------------------------ Testklausuren
interface Ergebnis {
  thema: string;
  prozent: number;
  erklaerung: string;
}
interface TkSeed {
  slug: string;
  klausur: string;
  fach: string;
  themen: string[];
  titel: string;
  vorTagen: number;
  aufgaben: [thema: string, frage: string][];
  ergebnis: Ergebnis[];
}

const TESTKLAUSUREN: TkSeed[] = [
  {
    slug: 'kd1-t1',
    klausur: 'kd1',
    fach: 'deutsch',
    themen: ['gedichtanalyse', 'kurzgeschichte'],
    titel: 'Testklausur 1 — Deutsch Klausur — Gedichtanalyse & Kurzgeschichte',
    vorTagen: 14,
    aufgaben: [
      [
        'gedichtanalyse',
        'Analysiere das Gedicht „Nachts im Park" (Abdruck liegt bei). Gehe auf Aufbau, Metrum, Reimschema und mindestens zwei sprachliche Mittel ein und formuliere eine Deutungshypothese.',
      ],
      [
        'kurzgeschichte',
        'Nenne drei typische Merkmale einer Kurzgeschichte und weise sie an der vorliegenden Geschichte „Der Anruf" nach.',
      ],
    ],
    ergebnis: [
      {
        thema: 'gedichtanalyse',
        prozent: 38,
        erklaerung:
          'Reimschema und Strophenaufbau sind richtig benannt, das Metrum wurde jedoch nicht bestimmt und die sprachlichen Mittel werden nur aufgezählt, ohne ihre Wirkung zu erklären. Eine Deutungshypothese fehlt.',
      },
      {
        thema: 'kurzgeschichte',
        prozent: 74,
        erklaerung:
          'Offener Anfang, Alltagssprache und Wendepunkt sind korrekt erkannt und mit Textbelegen gestützt. Beim offenen Schluss fehlt noch die Deutung.',
      },
    ],
  },
  {
    slug: 'kd1-t2',
    klausur: 'kd1',
    fach: 'deutsch',
    themen: ['gedichtanalyse'],
    titel: 'Testklausur 2 — Deutsch Klausur — Gedichtanalyse & Kurzgeschichte',
    vorTagen: 10,
    aufgaben: [
      [
        'gedichtanalyse',
        'Analysiere das Gedicht „Herbstmorgen" (Abdruck liegt bei). Bestimme das Metrum, benenne das Reimschema und erkläre die Wirkung von drei sprachlichen Mitteln. Schließe mit einer begründeten Deutung.',
      ],
    ],
    ergebnis: [
      {
        thema: 'gedichtanalyse',
        prozent: 81,
        erklaerung:
          'Deutlich verbessert: Jambus und Kreuzreim sind korrekt bestimmt, die Stilmittel werden mit Textstelle und Wirkung erklärt. Die Deutung könnte den Metrumbruch in Vers 7 noch einbeziehen.',
      },
    ],
  },
  {
    slug: 'km1-t1',
    klausur: 'km1',
    fach: 'mathematik',
    themen: ['lineare-funktionen', 'lineare-gleichungssysteme', 'prozentrechnung'],
    titel: 'Testklausur 1 — Mathe Klausur — Lineare Funktionen, Gleichungssysteme & Prozent',
    vorTagen: 4,
    aufgaben: [
      [
        'lineare-funktionen',
        'Eine Gerade verläuft durch A(2 | 1) und B(6 | 9). Bestimme die Funktionsgleichung und prüfe, ob C(4 | 5) auf der Geraden liegt.',
      ],
      [
        'lineare-gleichungssysteme',
        'Löse das Gleichungssystem 3x + 2y = 16 und x − y = 2 mit einem Verfahren deiner Wahl und mache die Probe.',
      ],
      [
        'prozentrechnung',
        'Ein Laptop kostet nach einer Preissenkung von 15 % noch 680 €. Wie teuer war er vorher? Erkläre deinen Rechenweg.',
      ],
    ],
    ergebnis: [
      {
        thema: 'lineare-funktionen',
        prozent: 84,
        erklaerung:
          'Steigung und y-Achsenabschnitt korrekt berechnet, die Punktprobe sauber durchgeführt. Kleiner Flüchtigkeitsfehler beim Aufschreiben der Funktionsgleichung.',
      },
      {
        thema: 'lineare-gleichungssysteme',
        prozent: 46,
        erklaerung:
          'Das Additionsverfahren wurde richtig angesetzt, beim Multiplizieren wurde die rechte Seite der Gleichung vergessen — dadurch stimmt x nicht. Die Probe fehlt.',
      },
      {
        thema: 'prozentrechnung',
        prozent: 27,
        erklaerung:
          '680 € wurden als Grundwert verwendet. Der Grundwert ist aber der Preis vor der Senkung (680 € entsprechen 85 %). Rechenweg neu aufbauen.',
      },
    ],
  },
  {
    slug: 'ke1-t1',
    klausur: 'ke1',
    fach: 'englisch',
    themen: ['present-perfect', 'conditional-sentences'],
    titel: 'Testklausur 1 — Englisch Test — Tenses & Conditionals',
    vorTagen: 1,
    aufgaben: [
      [
        'present-perfect',
        'Complete the sentences with Present Perfect or Simple Past: "I ___ (visit) Berlin three times." / "Yesterday we ___ (go) to the museum." Explain your choice for each sentence.',
      ],
      [
        'conditional-sentences',
        'Write four sentences about your future plans and dreams using if-clauses (two of type 1 and two of type 2).',
      ],
    ],
    ergebnis: [
      {
        thema: 'present-perfect',
        prozent: 52,
        erklaerung:
          'Bei Erfahrungen und „since/for" richtig, aber „yesterday" wurde einmal mit dem Present Perfect kombiniert. Signalwörter noch einmal gezielt wiederholen.',
      },
      {
        thema: 'conditional-sentences',
        prozent: 72,
        erklaerung:
          'Type 1 und Type 2 sind formal richtig gebildet. In einem Satz stand „would" im if-Teil — dort gehört das Simple Past hin.',
      },
    ],
  },
];

// ------------------------------------------------------------------ Lernpläne
interface LpSeed {
  slug: string;
  klausur: string;
  tk1: string;
  tk2: string | null;
  vorTagen: number;
  /** checklist-Keys je Tag (Themen-IDs werden per `T()` eingesetzt) */
  checks: Record<string, string[]>;
  lernzettel: { content: string; vorTagen: number } | null;
}

const alleTage = (t: string): Record<string, string[]> => ({
  '2': [`fehler:${T(t)}`, `beispiel:${T(t)}`, `check:${T(t)}`],
  '3': [`abfragen:${T(t)}`, 'loesungen'],
  '4': [`feynman:${T(t)}`, 'wiederholung', 'transfer'],
  '6': [`frisch:${T(t)}`],
  '7': ['selbsttest'],
});

const LERNPLAENE: LpSeed[] = [
  {
    slug: 'kd1',
    klausur: 'kd1',
    tk1: 'kd1-t1',
    tk2: 'kd1-t2',
    vorTagen: 14,
    checks: alleTage('gedichtanalyse'),
    lernzettel: {
      vorTagen: 9,
      content: `# Lernzettel\n\n### Gedichtanalyse\nErst die **Form** (Strophen, Reimschema, Metrum) sauber bestimmen, dann die Sprache untersuchen und immer schreiben: Stilmittel → Textstelle → Wirkung. Zum Schluss eine Deutung, die Form und Inhalt verbindet.\n\n**Typischer Fehler:** Stilmittel nur aufzählen, ohne zu erklären, was sie bewirken.\n\n**Merksatz:** Benennen, belegen, deuten.`,
    },
  },
  {
    slug: 'km1',
    klausur: 'km1',
    tk1: 'km1-t1',
    tk2: null,
    vorTagen: 4,
    checks: {
      '2': ['prozentrechnung', 'lineare-gleichungssysteme'].flatMap((t) => [
        `fehler:${T(t)}`,
        `beispiel:${T(t)}`,
        `check:${T(t)}`,
      ]),
      '3': [
        `abfragen:${T('prozentrechnung')}`,
        `abfragen:${T('lineare-gleichungssysteme')}`,
        'gemischt',
        'loesungen',
      ],
      '4': [`feynman:${T('prozentrechnung')}`],
    },
    lernzettel: {
      vorTagen: 2,
      content: `# Lernzettel\n\n### Prozentrechnung\nDer **Grundwert** ist immer der Wert *vor* der Änderung (100 %). Bei „nach einer Senkung von 15 %" entsprechen die bekannten 680 € also 85 % — dann ist G = 680 € · 100 / 85 = 800 €.\n\n**Typischer Fehler:** den neuen Preis als Grundwert verwenden.\n\n**Merksatz:** Wovon wird der Prozentsatz genommen? Das ist der Grundwert.\n\n### Lineare Gleichungssysteme\nBeim **Additionsverfahren** so multiplizieren, dass sich eine Variable aufhebt — dabei immer *beide* Seiten der Gleichung mit derselben Zahl multiplizieren. Zum Schluss die Probe in beiden Gleichungen.\n\n**Typischer Fehler:** die rechte Seite beim Multiplizieren vergessen.\n\n**Merksatz:** Was links passiert, passiert rechts auch.`,
    },
  },
  {
    slug: 'ke1',
    klausur: 'ke1',
    tk1: 'ke1-t1',
    tk2: null,
    vorTagen: 1,
    checks: {
      '2': [`fehler:${T('present-perfect')}`, `beispiel:${T('present-perfect')}`],
    },
    lernzettel: null,
  },
];

// ------------------------------------------------------------------- Ablauf
async function main() {
  const dev = await prisma.user.findUnique({ where: { email: DEV_EMAIL } });
  if (!dev) throw new Error(`Dev-Account ${DEV_EMAIL} nicht gefunden.`);
  const U = dev.id;

  // ---- 1) alles Inhaltliche löschen (Reihenfolge wegen FK-Beschränkungen:
  //         Lernplan → Testklausur (NoAction), sonst Cascade über Fach)
  await prisma.$transaction(
    async (tx) => {
      await tx.lernplan.deleteMany({ where: { userId: U } });
      await tx.testklausur.deleteMany({ where: { userId: U } });
      await tx.klausur.deleteMany({ where: { userId: U } });
      await tx.nachricht.deleteMany({ where: { userId: U } });
      await tx.chat.deleteMany({ where: { userId: U } });
      await tx.lernzettelRevision.deleteMany({ where: { userId: U } });
      await tx.lernzettel.deleteMany({ where: { userId: U } });
      await tx.datei.deleteMany({ where: { userId: U } });
      await tx.thema.deleteMany({ where: { userId: U } });
      await tx.fach.deleteMany({ where: { userId: U } });
      await tx.usage.deleteMany({ where: { userId: U } });
      await tx.einstellungen.deleteMany({ where: { userId: U } });
      await tx.user.update({ where: { id: U }, data: { aboId: null } });
      await tx.abo.deleteMany({ where: { ownerUserId: U } });

      // ---- 2) Profil, Einstellungen, Abo, Usage
      const aboId = randomUUID();
      const periodenEnde = new Date(now);
      periodenEnde.setMonth(periodenEnde.getMonth() + 1, 1);
      await tx.user.update({
        where: { id: U },
        data: {
          name: 'Lena M.',
          klassenstufe: '8. Klasse',
          emailVerifiedAt: daysAgo(60),
          createdAt: daysAgo(60),
          trialEndetAm: null,
        },
      });
      await tx.einstellungen.create({
        data: {
          userId: U,
          erinnerungVorKlausuren: true,
          woechentlicheZusammenfassung: true,
          kiTonfall: KiTonfall.freundlich,
        },
      });
      await tx.abo.create({
        data: {
          id: aboId,
          ownerUserId: U,
          paket: AboPaket.premium,
          art: AboArt.einzel,
          sitze: 1,
          intervall: AboIntervall.monatlich,
          status: AboStatus.aktiv,
          aktuellerZeitraumEnde: periodenEnde,
          erstelltAm: daysAgo(45),
        },
      });
      await tx.user.update({ where: { id: U }, data: { aboId } });
      const L = PLAN_LIMITS.premium;
      await tx.usage.create({
        data: {
          userId: U,
          monat: new Date(now).toISOString().slice(0, 7),
          nachrichtenUsed: 96,
          nachrichtenLimit: L.nachrichten,
          dateienUsed: DATEIEN.length,
          dateienLimit: L.dateien,
          lernzettelUsed: LERNZETTEL.length,
          lernzettelLimit: L.lernzettel,
          testklausurenUsed: 3,
          testklausurenLimit: L.testklausuren,
        },
      });

      // ---- 3) Fächer & Themen
      for (const [slug, name, initial, farbe] of FAECHER) {
        await tx.fach.create({
          data: { id: F(slug), userId: U, name, klasse: '8. Klasse', initial, farbe, icon: slug },
        });
      }
      for (const [slug, fach, name, beschreibung] of THEMEN) {
        await tx.thema.create({
          data: { id: T(slug), userId: U, fachId: F(fach), name, beschreibung },
        });
      }
      const fachVon = (themaSlug: string) => THEMEN.find((t) => t[0] === themaSlug)![1];

      // ---- 4) Chats
      for (const c of CHATS) {
        const chatId = uid(`chat:${c.slug}`);
        await tx.chat.create({
          data: {
            id: chatId,
            userId: U,
            fachId: F(fachVon(c.thema)),
            themaId: T(c.thema),
            titel: c.titel,
            modus: ChatModus[c.modus],
            erstelltAm: hoursAgo(c.vorStunden + 1),
            aktualisiertAm: hoursAgo(c.vorStunden),
          },
        });
        await tx.nachricht.createMany({
          data: c.messages.map(([rolle, text], i) => ({
            userId: U,
            chatId,
            rolle: rolle === 'user' ? NachrichtRolle.user : NachrichtRolle.ai,
            text,
            erstelltAm: new Date(hoursAgo(c.vorStunden + 1).getTime() + i * 90_000),
            zaehltGegenLimit: rolle === 'user',
          })),
        });
      }

      // ---- 5) Lernzettel
      for (const lz of LERNZETTEL) {
        const lzId = uid(`lz:${lz.slug}`);
        await tx.lernzettel.create({
          data: {
            id: lzId,
            userId: U,
            fachId: F(fachVon(lz.thema)),
            themaId: T(lz.thema),
            titel: lz.titel,
            content: lz.content,
            freeMessagesUsed: lz.freeMessagesUsed,
            erstelltAm: daysAgo(lz.vorTagen + 0.5),
            aktualisiertAm: daysAgo(lz.vorTagen),
          },
        });
        if (lz.revisionen.length) {
          await tx.lernzettelRevision.createMany({
            data: lz.revisionen.map(([rolle, text], i) => ({
              userId: U,
              lernzettelId: lzId,
              rolle: rolle === 'user' ? NachrichtRolle.user : NachrichtRolle.ai,
              text,
              erstelltAm: new Date(daysAgo(lz.vorTagen + 0.4).getTime() + i * 60_000),
            })),
          });
        }
      }

      // ---- 6) Dateien
      for (const [slug, thema, name, typ, groesseBytes, vorTagen, zusammenfassung] of DATEIEN) {
        await tx.datei.create({
          data: {
            id: uid(`datei:${slug}`),
            userId: U,
            fachId: F(fachVon(thema)),
            themaId: T(thema),
            name,
            typ: DateiTyp[typ],
            mime:
              typ === 'pdf'
                ? 'application/pdf'
                : typ === 'doc'
                  ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                  : name.endsWith('.png')
                    ? 'image/png'
                    : 'image/jpeg',
            groesseBytes,
            speicherPfad: `seed://dev/${slug}/${name}`,
            status: DateiStatus.bereit,
            zusammenfassung,
            erstelltAm: daysAgo(vorTagen),
          },
        });
      }

      // ---- 7) Klausuren
      for (const [slug, fach, themen, titel, tageAb] of KLAUSUREN) {
        await tx.klausur.create({
          data: {
            id: uid(`klausur:${slug}`),
            userId: U,
            fachId: F(fach),
            themaIds: themen.map(T),
            titel,
            datum: new Date(isoDatum(tageAb)),
            erstelltAm: daysAgo(Math.max(20, 20 - tageAb)),
          },
        });
      }

      // ---- 8) Testklausuren (Aufgaben + eingefrorene Ergebnisse/Vorbereitungsstand)
      for (const tk of TESTKLAUSUREN) {
        await tx.testklausur.create({
          data: {
            id: uid(`tk:${tk.slug}`),
            userId: U,
            klausurId: uid(`klausur:${tk.klausur}`),
            fachId: F(tk.fach),
            themaIds: tk.themen.map(T),
            titel: tk.titel,
            status: TestklausurStatus.analysiert,
            erstelltAm: daysAgo(tk.vorTagen),
            aufgaben: {
              create: tk.aufgaben.map(([thema, frage], i) => ({
                userId: U,
                themaId: T(thema),
                frage,
                reihenfolge: i,
              })),
            },
            ergebnisse: {
              create: tk.ergebnis.map((e) => ({
                userId: U,
                themaId: T(e.thema),
                prozent: e.prozent,
                note: prozentZuNote(e.prozent),
                erklaerung: e.erklaerung,
              })),
            },
            vorbereitung: {
              create: tk.ergebnis.map((e) => ({
                userId: U,
                themaId: T(e.thema),
                prozent: e.prozent,
                note: prozentZuNote(e.prozent),
                ampel: noteAmpel(prozentZuNote(e.prozent)) as Ampel,
              })),
            },
          },
        });
      }

      // ---- 9) Lernpläne
      for (const lp of LERNPLAENE) {
        const checklist: Record<string, Record<string, boolean>> = {};
        for (const [tag, keys] of Object.entries(lp.checks)) {
          checklist[tag] = Object.fromEntries(keys.map((k) => [k, true]));
        }
        await tx.lernplan.create({
          data: {
            id: uid(`lp:${lp.slug}`),
            userId: U,
            klausurId: uid(`klausur:${lp.klausur}`),
            testklausur1Id: uid(`tk:${lp.tk1}`),
            testklausur2Id: lp.tk2 ? uid(`tk:${lp.tk2}`) : null,
            checklist,
            tageErledigt: [],
            erstelltAm: daysAgo(lp.vorTagen),
            lernzettel: lp.lernzettel
              ? {
                  content: lp.lernzettel.content,
                  aktualisiertAm: daysAgo(lp.lernzettel.vorTagen).toISOString(),
                }
              : undefined,
          },
        });
      }
    },
    { timeout: 120_000, maxWait: 30_000 },
  );

  const c = await prisma.user.findUnique({
    where: { id: U },
    select: {
      name: true,
      _count: {
        select: {
          faecher: true,
          themen: true,
          chats: true,
          nachrichten: true,
          lernzettel: true,
          dateien: true,
          klausuren: true,
          testklausuren: true,
          lernplaene: true,
        },
      },
    },
  });
  console.log('Dev-Account befüllt:', JSON.stringify(c, null, 1));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
