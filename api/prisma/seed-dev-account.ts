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
import { readFileSync } from 'node:fs';
import { PLAN_LIMITS, prozentZuNote, noteAmpel } from '@lesify/shared';

const prisma = new PrismaClient();

/** Echt KI-generierter Lernzettel (siehe `_herkunft` in der JSON-Datei). */
const LZ_CONDITIONALS = JSON.parse(
  readFileSync(new URL('./seed-data/lernzettel-conditionals.json', import.meta.url), 'utf8'),
) as { titel: string; content: string };
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
  [
    'pythagoras',
    'mathematik',
    'Satz des Pythagoras',
    'Seitenlängen im rechtwinkligen Dreieck berechnen und im Alltag anwenden.',
  ],
  [
    'terme-binome',
    'mathematik',
    'Terme & Binomische Formeln',
    'Terme vereinfachen, ausmultiplizieren und die drei binomischen Formeln anwenden.',
  ],
  [
    'zinsrechnung',
    'mathematik',
    'Zinsrechnung',
    'Jahres- und Monatszinsen sowie Zinseszins und Kapitalentwicklung berechnen.',
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
  // ---- Gedichtanalyse: bewusst das materialreichste Thema (4 Chats) ----
  {
    slug: 'herbstgedicht-analyse',
    thema: 'gedichtanalyse',
    titel: 'Analyse „Herbstmorgen" Schritt für Schritt',
    modus: 'ueben',
    vorStunden: 9,
    messages: [
      [
        'user',
        `Ich soll für die Klausur üben und habe mir eine Strophe aus einem Herbstgedicht rausgesucht. Kannst du mit mir die Analyse durchgehen?

Der Nebel liegt auf stillem Feld,
die Bäume stehn im gelben Kleid,
der Wind, der durch die Zweige fällt,
erzählt von der vergangnen Zeit.`,
      ],
      [
        'ai',
        `Gern — wir gehen es in der Reihenfolge einer Klausur durch. Fangen wir mit der **Form** an. Versuch zuerst selbst: Wie viele Verse hat die Strophe, und welches Reimschema erkennst du?`,
      ],
      ['user', 'Vier Verse. Feld – Kleid – fällt – Zeit, also abab?'],
      [
        'ai',
        `Genau, das ist ein **Kreuzreim (abab)**. 👍 Ein Detail für volle Punkte: „Feld" und „fällt" reimen sich nicht ganz sauber (e ↔ ä, d ↔ t). Das nennt man einen **unreinen Reim**. Kleid und Zeit dagegen sind ein reiner Reim.

Jetzt das **Metrum**. Lies Vers 1 laut und markiere die betonten Silben.`,
      ],
      ['user', 'Der NE-bel LIEGT auf STIL-lem FELD — das wäre Jambus, oder?'],
      [
        'ai',
        `Richtig, ein **Jambus** (unbetont – betont). Alle vier Verse haben acht Silben und vier Hebungen, also ein **vierhebiger Jambus**. Alle Verse enden auf einer betonten Silbe — das ist eine **männliche Kadenz**.

So könntest du es in der Klausur zusammenfassen:

| Merkmal | Befund |
|---|---|
| Strophe | 1 Strophe, 4 Verse |
| Reimschema | Kreuzreim (abab), Vers 1/3 unrein |
| Metrum | vierhebiger Jambus |
| Kadenz | durchgehend männlich |

Nun zur **Sprache**: Welche sprachlichen Mittel fallen dir auf?`,
      ],
      [
        'user',
        'Der Wind „erzählt" — das ist eine Personifikation. Und „im gelben Kleid" ist eine Metapher für die Blätter?',
      ],
      [
        'ai',
        `Beides stimmt! ✅ Und jetzt kommt der wichtigste Schritt, den viele vergessen — die **Wirkung**:

• **Personifikation** („Der Wind … erzählt"): Die Natur wird lebendig, fast wie eine Erzählerin. Das erzeugt eine ruhige, wehmütige Stimmung.
• **Metapher** („im gelben Kleid"): Die Bäume erscheinen festlich geschmückt — der Herbst wirkt schön, aber auch wie ein letzter Auftritt vor dem Winter.
• Zusätzlich das Adjektiv **„vergangnen"** im letzten Vers: Es lenkt den Blick auf Vergänglichkeit.

Formulier daraus jetzt eine **Deutungshypothese** in ein bis zwei Sätzen — dann korrigiere ich sie.`,
      ],
      [
        'user',
        'Das Gedicht zeigt den Herbst als schöne, aber wehmütige Zeit und steht damit für die Vergänglichkeit.',
      ],
      [
        'ai',
        `Sehr gut, das ist eine tragfähige Deutungshypothese. Noch stärker wird sie, wenn du **Form und Inhalt verbindest**:

> „Der gleichmäßige Jambus und der Kreuzreim unterstreichen die ruhige, fast resignierte Stimmung: Der Wechsel der Jahreszeiten geschieht regelmäßig und unaufhaltsam."

Das ist genau die Verbindung, die in der Klausur die meisten Punkte bringt. Wenn du magst, üben wir als Nächstes den **Einleitungssatz** (Titel, Textsorte, Thema).`,
      ],
    ],
  },
  {
    slug: 'stilmittel-uebersicht-chat',
    thema: 'gedichtanalyse',
    titel: 'Wichtigste Stilmittel für die Klausur',
    modus: 'zusammenfassen',
    vorStunden: 54,
    messages: [
      [
        'user',
        'Kannst du mir die wichtigsten Stilmittel kompakt zusammenfassen, mit Wirkung? Für die Deutschklausur.',
      ],
      [
        'ai',
        `Hier die Stilmittel, die in Gedichtanalysen am häufigsten vorkommen:

| Stilmittel | Erklärung | Typische Wirkung |
|---|---|---|
| **Metapher** | Bild ohne „wie" („Wolkenmeer") | macht abstrakte Dinge anschaulich |
| **Vergleich** | Bild mit „wie" („leise wie Schnee") | veranschaulicht, verstärkt |
| **Personifikation** | Dinge handeln wie Menschen | belebt die Natur, schafft Nähe |
| **Anapher** | gleicher Wortanfang in mehreren Versen | betont, erzeugt Rhythmus |
| **Alliteration** | gleicher Anlaut nah beieinander („Wind und Wellen") | Klangwirkung, Einprägsamkeit |
| **Enjambement** | Satz läuft über das Versende hinaus | Lesefluss, Spannung |
| **Antithese** | Gegensatz („Licht und Schatten") | Spannung, Konflikt |
| **Klimax** | Steigerung | Dramatik |

Wichtig: Nie nur nennen — immer **Beleg + Wirkung** dazuschreiben.`,
      ],
      ['user', 'Wie formuliere ich die Wirkung, ohne dass es immer gleich klingt?'],
      [
        'ai',
        `Mit Formulierungsbausteinen, die du abwechseln kannst:

• Dadurch wirkt … / Dies erzeugt den Eindruck von …
• Der Leser erhält den Eindruck, dass …
• Das Stilmittel hebt … hervor / unterstreicht …
• So entsteht eine … Stimmung (z. B. düstere, ruhige, bedrohliche).
• Auffällig ist … — das verdeutlicht, dass …

**Beispiel:** „Die Anapher ‚Es war … es war …' (V. 1–2) betont die Wiederholung und erzeugt einen eintönigen, beklemmenden Rhythmus."`,
      ],
    ],
  },
  {
    slug: 'reimschema-bestimmen',
    thema: 'gedichtanalyse',
    titel: 'Reimschema bestimmen: abba oder abab?',
    modus: 'hausaufgaben',
    vorStunden: 80,
    messages: [
      [
        'user',
        'In der Hausaufgabe steht ein Gedicht mit den Reimwörtern Nacht – Tag – Wacht – Klag. Ist das abab oder abba?',
      ],
      [
        'ai',
        `Schreib die Reimwörter untereinander und gib jedem Klang einen Buchstaben:

• Nacht → **a**
• Tag → **b**
• Wacht → **a** (reimt auf Nacht)
• Klag → **b** (reimt auf Tag)

Das ergibt **abab** — einen **Kreuzreim**. Bei **abba** würde der zweite Reim in der Mitte „umarmt" werden (z. B. Nacht – Tag – Klag – Wacht).`,
      ],
      ['user', 'Ah, verstehe. Und wie heißt aabb?'],
      [
        'ai',
        `**aabb** heißt **Paarreim** — immer zwei aufeinanderfolgende Verse reimen sich. Die drei Klassiker zum Auswendiglernen:

• Paarreim: aabb
• Kreuzreim: abab
• Umarmender Reim: abba`,
      ],
    ],
  },
  {
    slug: 'enjambement-deuten',
    thema: 'gedichtanalyse',
    titel: 'Enjambement erkennen und deuten',
    modus: 'erklaeren',
    vorStunden: 40,
    messages: [
      ['user', 'Ich erkenne ein Enjambement nie sicher. Woran sehe ich das?'],
      [
        'ai',
        `Ein **Enjambement** (Zeilensprung) liegt vor, wenn ein Satz oder eine Wortgruppe **nicht am Versende endet**, sondern in der nächsten Zeile weiterläuft.

**So prüfst du es:** Lies das Gedicht laut und achte darauf, ob am Ende des Verses eine natürliche Pause (Punkt, Komma) steht. Wenn nicht, sondern du „mitten im Satz" in die nächste Zeile springst, ist es ein Enjambement.

**Beispiel:**
> Der Mond steht still und schaut herab auf
> die Stadt, die schläft.

Hier bricht der Vers nach „auf" ab — der Satz läuft in der nächsten Zeile weiter.`,
      ],
      ['user', 'Und was schreibe ich dann zur Wirkung?'],
      [
        'ai',
        `Die Wirkung hängt vom Inhalt ab. Typische Deutungen:

• **Fließender Rhythmus:** Der Lesefluss wird nicht unterbrochen, das Gedicht wirkt ruhig oder dahinströmend.
• **Spannung:** Die Pause am Versende lässt auf die Fortsetzung warten.
• **Betonung:** Das Wort am Anfang der nächsten Zeile wird hervorgehoben.

**Musterformulierung:** „Das Enjambement in V. 1–2 lässt den Satz über das Versende hinausfließen und erzeugt so einen ruhigen, fast schwebenden Lesefluss, der zur nächtlichen Stimmung passt."`,
      ],
      ['user', 'Verstanden. Was ist dann der Gegensatz, wenn der Satz am Versende endet?'],
      [
        'ai',
        `Das nennt man **Zeilenstil** (oder Zeilenstil-Vers): Vers- und Satzende fallen zusammen. Er wirkt geordnet, klar, manchmal streng oder feierlich.

**Faustregel für die Klausur:** Beobachte, was im Gedicht *überwiegt* — und begründe, warum das zur Aussage passt. Wenn Enjambements bei einer Stelle auffallend **gehäuft** auftreten, lohnt sich eine eigene Deutung.`,
      ],
    ],
  },
  {
    slug: 'einleitung-formulieren',
    thema: 'gedichtanalyse',
    titel: 'Einleitung zur Gedichtanalyse formulieren',
    modus: 'hausaufgaben',
    vorStunden: 66,
    messages: [
      [
        'user',
        'Ich muss eine Einleitung für die Analyse von „Herbstmorgen" schreiben, aber ich weiß nie, wie ich anfangen soll.',
      ],
      [
        'ai',
        `Eine Einleitung besteht immer aus **fünf Bausteinen** — dann kann fast nichts schiefgehen:

1. **Textsorte:** Gedicht
2. **Titel**
3. **Autor:in**
4. **Erscheinungsjahr** (falls bekannt)
5. **Thema** in einem Satz

**Vorlage:** „Das Gedicht ‚Titel' von *Autor:in*, erschienen im Jahr …, thematisiert …"

Was weißt du über das Gedicht? Dann bauen wir sie zusammen.`,
      ],
      [
        'user',
        'Es heißt „Herbstmorgen", der Autor ist unbekannt, es geht um den Herbst und dass alles vergeht.',
      ],
      [
        'ai',
        `Dann so, wenn Autor:in und Jahr unbekannt sind — einfach weglassen:

> „Das Gedicht ‚Herbstmorgen' thematisiert den Herbst als Zeit des Abschieds und der Vergänglichkeit."

**Noch besser:** eine kurze **Deutungsvorwegnahme**, die zum Hauptteil hinführt:

> „Das Gedicht ‚Herbstmorgen' thematisiert die Vergänglichkeit der Natur. Im Folgenden wird untersucht, wie Form und Sprache diese wehmütige Stimmung erzeugen."

Der zweite Satz zeigt der Lehrkraft direkt, dass du **einen Plan** hast.`,
      ],
      ['user', 'Darf ich Ich-Formulierungen benutzen, zum Beispiel „Ich finde"?'],
      [
        'ai',
        `In der Analyse besser **nicht**. Schreib sachlich und im **Präsens**:

✗ „Ich finde, der Autor will sagen …"
✓ „Der Sprecher des Gedichts bringt zum Ausdruck, dass …"

Deine eigene Meinung ist in der Analyse nur als **begründete Deutung** gefragt („Dies lässt darauf schließen, dass …"). Achte außerdem darauf, „lyrisches Ich" oder „Sprecher" zu schreiben — nicht „der Autor", denn das Ich im Gedicht ist nicht automatisch der Dichter.`,
      ],
    ],
  },
  {
    slug: 'stilmittel-quiz',
    thema: 'gedichtanalyse',
    titel: 'Quiz: Stilmittel erkennen',
    modus: 'ueben',
    vorStunden: 100,
    messages: [
      ['user', 'Kannst du mich zu Stilmitteln abfragen? Am besten mit kurzen Beispielversen.'],
      [
        'ai',
        `Klar! Bestimme das Stilmittel in jedem Beispiel:

**1.** „Die Sonne lacht vom Himmelszelt."
**2.** „Er war stark wie ein Bär."
**3.** „Milch und Mehl macht Mädchen munter."
**4.** „Ich sah dich, ich hörte dich, ich vermisste dich."

Schreib mir deine Zuordnungen.`,
      ],
      [
        'user',
        '1) Personifikation\n2) Vergleich\n3) Alliteration\n4) Anapher — weil es dreimal mit „Ich" beginnt',
      ],
      [
        'ai',
        `Alle vier richtig! 🎉

**1.** ✅ Personifikation — die Sonne „lacht" wie ein Mensch.
**2.** ✅ Vergleich — erkennbar an „wie".
**3.** ✅ Alliteration — viermal der Anlaut M.
**4.** ✅ Anapher. Zusätzlich liegt hier eine **Klimax** vor, weil die Aussagen sich steigern (sehen → hören → vermissen).

Noch eine Runde, diesmal schwerer? Dann gebe ich dir Verse, in denen zwei Stilmittel gleichzeitig stecken.`,
      ],
      ['user', 'Ja, bitte.'],
      [
        'ai',
        `Hier deine Runde 2 — nenne je zwei Stilmittel:

**1.** „Der Wind flüstert leise Lieder in das lange Gras."
**2.** „Es ist Tag und es ist Nacht — beides zugleich in mir."
**3.** „Wie ein Vogel im Käfig, so sitzt die Zeit in meinem Zimmer."

*(Tipp zu 1: Achte auf Bewegung **und** Klang.)*`,
      ],
    ],
  },
  // ---- Lernplan Mathe (Pythagoras, Terme & Zinsen): Chats je Lerntag ----
  {
    slug: 'lp-t2-terme-erkl',
    thema: 'terme-binome',
    titel: 'Fehler klären: Binomische Formeln',
    modus: 'erklaeren',
    vorStunden: 168,
    messages: [
      [
        'user',
        'Ich habe bei Testklausur 1 diese Aufgabe zu Terme & Binomische Formeln nicht richtig gelöst: „Multipliziere aus: (x + 3)²". Ich hatte x² + 9. Erklär mir die binomischen Formeln nochmal von Grund auf.',
      ],
      [
        'ai',
        `Dein Fehler ist einer der häufigsten überhaupt — und er lässt sich leicht beheben. 👍

**Warum x² + 9 nicht stimmt:** (x + 3)² bedeutet (x + 3) · (x + 3). Wenn du jeden Summanden mit jedem multiplizierst, entstehen **vier** Produkte:

(x + 3)(x + 3) = x·x + x·3 + 3·x + 3·3 = x² + **6x** + 9

Du hast den **Mittelteil 6x** vergessen. Genau dafür gibt es die binomischen Formeln:

| Formel | Ergebnis |
|---|---|
| 1. (a + b)² | a² + **2ab** + b² |
| 2. (a − b)² | a² − **2ab** + b² |
| 3. (a + b)(a − b) | a² − b² |

**Merkregel:** Bei der 1. und 2. Formel gibt es immer einen **doppelten Mittelteil** (2ab). Nur bei der 3. Formel fällt er weg.`,
      ],
      ['user', 'Also ist bei (x + 3)² der Mittelteil 2 · x · 3 = 6x?'],
      [
        'ai',
        `Genau! ✅ Mit a = x und b = 3 wird aus 2ab: 2 · x · 3 = **6x**. Das Ergebnis lautet also **x² + 6x + 9**.

Probe mit x = 1: (1 + 3)² = 16 und 1 + 6 + 9 = 16 ✓

Versuch es jetzt mit der 2. Formel: **(x − 5)²**.`,
      ],
      ['user', 'x² − 10x + 25'],
      [
        'ai',
        'Perfekt: a² = x², 2ab = 2·x·5 = 10x (mit Minus), b² = 25. Auf die Vorzeichen zu achten ist hier der Schlüssel — der Mittelteil bekommt das Vorzeichen aus der Klammer, das letzte Glied ist **immer plus**, weil b² nie negativ ist.',
      ],
      [
        'user',
        'Gib mir bitte ein Alltagsbeispiel oder eine Analogie dazu, damit ich es mir merken kann.',
      ],
      [
        'ai',
        `Stell dir einen **quadratischen Garten** mit der Seitenlänge x + 3 vor (in Metern). Seine Fläche ist (x + 3)².

Teile ihn in vier Stücke:
• ein großes Quadrat: x · x = **x²**
• zwei Rechtecke: je x · 3 = **3x** (zusammen **6x**)
• ein kleines Eckquadrat: 3 · 3 = **9**

Zusammen: x² + 6x + 9. Die „6x" sind also keine Rechenlaune, sondern die **beiden Rechtecke** an den Seiten. Wer sie vergisst, „verliert" Fläche. 🌱`,
      ],
    ],
  },
  {
    slug: 'lp-t2-terme-check',
    thema: 'terme-binome',
    titel: 'Verständnis-Check: Binomische Formeln',
    modus: 'ueben',
    vorStunden: 167,
    messages: [
      [
        'user',
        'Stell mir 3 kurze Verständnisfragen zu Terme & Binomische Formeln, um zu prüfen, ob die Erklärung angekommen ist.',
      ],
      [
        'ai',
        `Hier deine drei Fragen:

**1.** Multipliziere aus: (a + 4)²
**2.** Multipliziere aus: (2x − 1)²
**3.** Faktorisiere: x² − 49`,
      ],
      ['user', '1) a² + 8a + 16\n2) 4x² − 4x + 1\n3) (x + 7)(x − 7)'],
      [
        'ai',
        `Alle drei richtig! 🎉

**1.** a² + 8a + 16 ✅ (2 · a · 4 = 8a)
**2.** 4x² − 4x + 1 ✅ — sehr gut, dass du (2x)² = 4x² beachtet hast.
**3.** (x + 7)(x − 7) ✅ — 49 = 7², also 3. binomische Formel rückwärts.

Die Erklärung ist angekommen. Morgen üben wir das mit gemischten Aufgaben.`,
      ],
    ],
  },
  {
    slug: 'lp-t2-zins-erkl',
    thema: 'zinsrechnung',
    titel: 'Fehler klären: Zinsrechnung',
    modus: 'erklaeren',
    vorStunden: 166,
    messages: [
      [
        'user',
        'Ich habe bei Testklausur 1 diese Aufgabe zu Zinsrechnung nicht richtig gelöst: „Berechne die Zinsen für 2.400 € bei 2,5 % Jahreszins nach 8 Monaten." Ich hatte 60 €. Erklär mir Zinsrechnung nochmal von Grund auf.',
      ],
      [
        'ai',
        `Du hast die **Jahreszinsen** ausgerechnet (2.400 € · 2,5 % = 60 €) — das wären die Zinsen für ein *ganzes* Jahr. Die Aufgabe fragt aber nach **8 Monaten**.

**Die Grundformel:**

Z = K · p/100 · t

• **K** = Kapital (2.400 €)
• **p** = Zinssatz in Prozent pro Jahr (2,5)
• **t** = Zeit **in Jahren**

Für Monate rechnest du: **t = Monate / 12**

Z = 2.400 · 0,025 · 8/12 = 60 · 8/12 = **40 €**

**Merksatz:** Der Zinssatz gilt immer *pro Jahr* — für kürzere Zeiträume nimmst du nur den passenden Bruchteil davon.`,
      ],
      ['user', 'Ah, ich hab die 8 Monate komplett ignoriert. Und bei 45 Tagen?'],
      [
        'ai',
        `Dann sind es 45/360 Jahre — in der Bankrechnung zählt man üblicherweise **30 Tage pro Monat**, also **360 Tage pro Jahr**.

Z = 2.400 · 0,025 · 45/360 = 60 · 0,125 = **7,50 €**

Die Formel bleibt gleich, nur der Zeitfaktor ändert sich.`,
      ],
      ['user', 'Gib mir bitte ein Alltagsbeispiel dazu.'],
      [
        'ai',
        `Du hast durch einen Ferienjob **800 €** auf dein Sparkonto gelegt, der Zinssatz beträgt **1,5 %** pro Jahr.

• Nach **1 Jahr:** 800 · 0,015 = **12 €**
• Nach **6 Monaten:** die Hälfte, also **6 €**
• Nach **3 Monaten:** ein Viertel, also **3 €**

So siehst du: Je kürzer das Geld angelegt ist, desto weniger Zinsen bekommst du — proportional zur Zeit. 🐷`,
      ],
    ],
  },
  {
    slug: 'lp-t2-zins-check',
    thema: 'zinsrechnung',
    titel: 'Verständnis-Check: Zinsrechnung',
    modus: 'ueben',
    vorStunden: 165,
    messages: [
      [
        'user',
        'Stell mir 3 kurze Verständnisfragen zu Zinsrechnung, um zu prüfen, ob die Erklärung angekommen ist.',
      ],
      [
        'ai',
        `Los geht's:

**1.** Wie viel Zinsen bringen 1.500 € bei 2 % in einem Jahr?
**2.** Auf 2.000 € gibt es in einem Jahr 60 € Zinsen. Wie hoch ist der Zinssatz?
**3.** Bei 1,5 % Zinssatz erhältst du 45 € Zinsen in einem Jahr. Welches Kapital ist angelegt?`,
      ],
      ['user', '1) 30 €\n2) 3 %\n3) 300 €'],
      [
        'ai',
        `Zwei von drei richtig — gut gemacht! 👏

**1.** ✅ 1.500 · 0,02 = 30 €
**2.** ✅ 60 / 2.000 = 0,03 = 3 %
**3.** ❌ Hier musst du die Formel nach K umstellen:
K = Z / (p/100) = 45 / 0,015 = **3.000 €**

Probe: 3.000 · 0,015 = 45 ✓. Du hattest wohl 45 / 0,15 gerechnet — bei Prozenten immer durch **100 teilen**: 1,5 % = 0,015.`,
      ],
    ],
  },
  {
    slug: 'lp-t3-terme',
    thema: 'terme-binome',
    titel: 'Abfragen: Terme & Binomische Formeln',
    modus: 'ueben',
    vorStunden: 144,
    messages: [
      ['user', 'Gib mir 3 Übungsaufgaben zu Terme & Binomische Formeln, erst ohne Lösung.'],
      [
        'ai',
        `Hier deine Aufgaben:

**1.** (3y + 2)² = ?
**2.** (m − 6)(m + 6) = ?
**3.** Vereinfache: (x + 2)² − (x − 2)²

Schreib mir deine Lösungswege — ich sage dir nach jeder Antwort, ob sie stimmt.`,
      ],
      ['user', '1) 9y² + 12y + 4\n2) m² − 36\n3) (x² + 4x + 4) − (x² − 4x + 4) = 8x'],
      [
        'ai',
        `Volltreffer, alle drei richtig! ✅

**1.** 9y² + 12y + 4 — (3y)² = 9y², 2·3y·2 = 12y ✓
**2.** m² − 36 ✓
**3.** 8x ✓ — und den Trick hast du toll gelöst: erst beide Klammern ausmultiplizieren, dann fallen x² und 4 weg.

Jetzt **gemischt**: Ich frage abwechselnd zu Binomen und Zinsen.`,
      ],
      [
        'user',
        'Frag mich abwechselnd, gemischt, Fragen zu Terme & Binomische Formeln und Zinsrechnung.',
      ],
      [
        'ai',
        `**A.** Multipliziere aus: (5 − 2a)²
**B.** Wie hoch sind die Zinsen für 900 € bei 4 % in 3 Monaten?
**C.** Faktorisiere: 25x² − 9
**D.** Auf einem Konto liegen 1.200 €. Nach einem Jahr sind es 1.236 €. Wie hoch war der Zinssatz?`,
      ],
      [
        'user',
        'A) 25 − 20a + 4a²\nB) 900 · 0,04 · 3/12 = 9 €\nC) (5x + 3)(5x − 3)\nD) 36 / 1200 = 3 %',
      ],
      [
        'ai',
        `Alle vier richtig — sehr sauber! 🎉 Ich habe kurz nachgerechnet:

**A.** 25 − 20a + 4a² ✅ (2·5·2a = 20a)
**B.** 9 € ✅ (36 · 3/12)
**C.** (5x + 3)(5x − 3) ✅ — 25x² = (5x)², 9 = 3²
**D.** 3 % ✅

Die Lösungen für deine Aufgaben von vorhin waren bereits alle korrekt — dieser Tag ist damit im Kasten.`,
      ],
    ],
  },
  {
    slug: 'lp-t3-zins',
    thema: 'zinsrechnung',
    titel: 'Abfragen: Zinsrechnung',
    modus: 'ueben',
    vorStunden: 143,
    messages: [
      ['user', 'Gib mir 3 Übungsaufgaben zu Zinsrechnung, erst ohne Lösung.'],
      [
        'ai',
        `**1.** Wie viel Zinsen bringen 3.200 € bei 1,25 % in einem Jahr?
**2.** Wie viel Zinsen bringen 2.000 € bei 3 % in 4 Monaten?
**3.** 1.000 € werden 2 Jahre lang mit 3 % Zinseszins angelegt. Wie hoch ist das Endkapital?`,
      ],
      [
        'user',
        '1) 3200 · 0,0125 = 40 €\n2) 2000 · 0,03 · 4/12 = 20 €\n3) 1000 · 1,03 · 1,03 = 1060,90 €',
      ],
      [
        'ai',
        `Alle drei stimmen! ✅

**1.** 40 € ✓
**2.** 20 € ✓ — sehr gut, dass du die Monate als Bruchteil eines Jahres gerechnet hast.
**3.** 1.060,90 € ✓ — beim Zinseszins wird jedes Jahr auf das **neue** Kapital verzinst: 1.000 → 1.030 → 1.060,90.

Kurzschreibweise: K₂ = 1.000 · 1,03² = 1.060,90 €.`,
      ],
    ],
  },
  {
    slug: 'lp-t4-terme-feynman',
    thema: 'terme-binome',
    titel: 'Feynman: Binomische Formeln erklärt',
    modus: 'erklaeren',
    vorStunden: 120,
    messages: [
      [
        'user',
        'Erklär mir jetzt Terme & Binomische Formeln in eigenen Worten, so einfach wie möglich — oder besser: ich erkläre es dir, und du sagst mir, ob es stimmt.',
      ],
      [
        'ai',
        'Sehr gern! Stell dir vor, du erklärst es einem jüngeren Geschwisterkind. Wie würdest du die binomischen Formeln erklären?',
      ],
      [
        'user',
        'Wenn man eine Summe oder Differenz hoch 2 rechnet, muss man nicht alles einzeln ausmultiplizieren. Man rechnet das erste zum Quadrat, das zweite zum Quadrat und in der Mitte das Doppelte vom Produkt. Bei plus und minus zusammen fällt die Mitte weg.',
      ],
      [
        'ai',
        `Das ist eine **sehr gute** Erklärung — inhaltlich vollständig! ✅

Zwei kleine Ergänzungen, dann ist sie perfekt:
• Bei der **2. Formel** (a − b)² steht in der Mitte ein **Minus** (−2ab), das letzte Glied bleibt +b².
• Bei der **3. Formel** (a + b)(a − b) sind die Klammern **unterschiedlich** (einmal plus, einmal minus) — nur dann fällt die Mitte weg.

Ein tolles Beispiel für dein Geschwisterkind: „(10 + 1)² ist 121. Und 10² + 2·10·1 + 1² = 100 + 20 + 1 = 121."`,
      ],
    ],
  },
  {
    slug: 'lp-t4-zins-feynman',
    thema: 'zinsrechnung',
    titel: 'Feynman: Zinsrechnung erklärt',
    modus: 'erklaeren',
    vorStunden: 119,
    messages: [
      [
        'user',
        'Erklär mir jetzt Zinsrechnung in eigenen Worten — ich versuche es zuerst selbst, sag mir, ob es stimmt.',
      ],
      ['ai', 'Klar! Wie würdest du erklären, wie man Zinsen berechnet?'],
      [
        'user',
        'Zinsen sind das Geld, das man von der Bank für sein angelegtes Kapital bekommt. Man rechnet Kapital mal Zinssatz durch 100 mal die Zeit in Jahren. Bei Monaten teilt man durch 12.',
      ],
      [
        'ai',
        `Sehr gut, das stimmt komplett! ✅ Noch ein Hinweis für die Klausur: Schreibe die Formel immer **hin** (Z = K · p/100 · t), setze dann die Werte ein und beschrifte die Einheiten. So bekommst du auch bei kleinen Rechenfehlern Teilpunkte.

Was du bisher noch nicht erwähnt hast: den **Zinseszins**. Möchtest du den auch kurz erklären?`,
      ],
    ],
  },
  {
    slug: 'lp-t4-terme-wdh',
    thema: 'terme-binome',
    titel: 'Wiederholung Tag 2: Binome & Zinsen',
    modus: 'ueben',
    vorStunden: 118,
    messages: [
      [
        'user',
        'Frag mich kurz 3 Fragen zu dem, was wir an Tag 2 zu Terme & Binomische Formeln und Zinsrechnung geklärt haben, um zu checken, ob es noch sitzt.',
      ],
      [
        'ai',
        `**1.** Was ist der häufigste Fehler bei (x + 3)²?
**2.** Wie rechnest du 5 Monate in einen Zeitfaktor für die Zinsformel um?
**3.** Multipliziere aus: (x − 4)²`,
      ],
      ['user', '1) Man vergisst den Mittelteil 2·x·3.\n2) 5/12 Jahre.\n3) x² − 8x + 16'],
      [
        'ai',
        'Alles richtig — 3 von 3! ✅ Es sitzt sichtbar. Der Fehler vom Anfang ist verschwunden, und beim Zinsfaktor denkst du jetzt automatisch an den Bruch. Morgen steht Testklausur 2 an — du bist gut vorbereitet. 💪',
      ],
    ],
  },
  {
    slug: 'lp-t6-zins-luecke',
    thema: 'zinsrechnung',
    titel: 'Lücke schließen: Zinseszins',
    modus: 'erklaeren',
    vorStunden: 72,
    messages: [
      [
        'user',
        'Das sitzt bei Zinsrechnung immer noch nicht ganz — in Testklausur 2 habe ich bei der Zinseszins-Aufgabe (1.500 € · 3 Jahre · 2 %) den falschen Wert. Lass uns die Lücke gezielt angehen.',
      ],
      ['ai', `Klar. Erzähl mir kurz, wie du gerechnet hast — dann sehe ich, wo es hakt.`],
      ['user', '1500 · 0,02 · 3 = 90, also 1590 €.'],
      [
        'ai',
        `Du hast **einfache Zinsen** über drei Jahre gerechnet: 3 · 30 € = 90 €. Das ist eine gute Näherung, aber beim **Zinseszins** wird jedes Jahr auf das *neue* Kapital verzinst — die Zinsen bringen selbst wieder Zinsen.

**Jahr für Jahr:**

| Jahr | Kapital am Anfang | Zinsen (2 %) | Kapital am Ende |
|---|---|---|---|
| 1 | 1.500,00 € | 30,00 € | 1.530,00 € |
| 2 | 1.530,00 € | 30,60 € | 1.560,60 € |
| 3 | 1.560,60 € | 31,21 € | 1.591,81 € |

Also **1.591,81 €** — du warst mit 1.590 € sehr nah dran, aber die Klausur verlangt den genauen Wert.`,
      ],
      ['user', 'Gibt es eine Abkürzung, damit ich nicht jedes Jahr einzeln rechnen muss?'],
      [
        'ai',
        `Ja! Jedes Jahr wird das Kapital mit dem **Zinsfaktor q = 1 + p/100** multipliziert — hier q = 1,02.

**Formel:** Kₙ = K₀ · qⁿ

K₃ = 1.500 · 1,02³ = 1.500 · 1,061208 = **1.591,81 €** ✅

**Merksatz:** *Zinseszins = Anfangskapital · Zinsfaktor hoch Jahre.* Auf dem Taschenrechner: 1,02 → Potenztaste → 3.`,
      ],
      ['user', 'Verstanden! Also bei 4 Jahren wäre es 1500 · 1,02⁴?'],
      [
        'ai',
        'Genau: 1.500 · 1,02⁴ = 1.500 · 1,08243… ≈ **1.623,65 €**. Du hast die Lücke damit geschlossen — der entscheidende Schritt war, den Zinsfaktor als Multiplikator zu sehen. 🎉',
      ],
    ],
  },
  {
    slug: 'lp-t6-terme-frisch',
    thema: 'terme-binome',
    titel: 'Auffrischen: Binomische Formeln',
    modus: 'ueben',
    vorStunden: 71,
    messages: [
      [
        'user',
        'Frag mich kurz ein paar Fragen zu Terme & Binomische Formeln zum Auffrischen — das saß schon mal, soll aber nicht wieder abrutschen.',
      ],
      [
        'ai',
        `Klar, drei Blitzfragen:

**1.** (x + 9)² = ?
**2.** (2a − 3b)² = ?
**3.** Faktorisiere: 16 − y²`,
      ],
      ['user', '1) x² + 18x + 81\n2) 4a² − 12ab + 9b²\n3) (4 + y)(4 − y)'],
      [
        'ai',
        'Alle richtig — das sitzt! ✅ Besonders die zweite Aufgabe mit zwei Variablen war nicht einfach. Deine Testklausur-2-Note in diesem Thema zeigt: Das Fundament ist jetzt fest. Für Tag 7 musst du nur noch alles einmal gemischt durchgehen.',
      ],
    ],
  },
  // ---- Ökosystem Wald: langer Chat (Frontend-Showcase) ----
  {
    slug: 'wald-lernsession',
    thema: 'oekosystem-wald',
    titel: 'Ökosystem Wald — komplette Lernsession vor der Klausur',
    modus: 'erklaeren',
    vorStunden: 14,
    messages: [
      [
        'user',
        'Ich schreibe bald eine Klausur zum Ökosystem Wald und habe den Stoff kaum verstanden. Kannst du mir erst mal einen Überblick geben?',
      ],
      [
        'ai',
        `Klar, wir gehen das Schritt für Schritt durch. Zuerst der **Überblick** — danach vertiefen wir, was dir unklar ist. 🌲

## Was ist ein Ökosystem?
Ein Ökosystem besteht aus zwei Teilen:

• **Biotop** — der Lebensraum mit seinen unbelebten Bedingungen (Boden, Licht, Wasser, Temperatur)
• **Biozönose** — die Lebensgemeinschaft aller Pflanzen, Tiere und Kleinstlebewesen darin

## Die Stockwerke des Waldes
Ein Wald ist in Schichten aufgebaut, jede mit eigenen Bedingungen und Bewohnern:

1. **Baumschicht** (ab ca. 5 m): Buchen, Eichen, Fichten — Lebensraum von Vögeln, Eichhörnchen
2. **Strauchschicht** (ca. 1–5 m): Holunder, Haselnuss, junge Bäume
3. **Krautschicht** (bis ca. 1 m): Farne, Gräser, Blumen wie das Buschwindröschen
4. **Moosschicht:** Moose direkt am Boden
5. **Bodenschicht / Wurzelschicht:** Laubstreu, Humus, Wurzeln, Regenwürmer, Pilze

Das Licht nimmt von oben nach unten stark ab — deshalb blühen viele Frühjahrsblüher, **bevor** die Bäume ihr Laub austreiben.

Wo möchtest du anfangen?`,
      ],
      [
        'user',
        'Was ist der Unterschied zwischen abiotischen und biotischen Faktoren? Das habe ich im Heft, aber nicht kapiert.',
      ],
      [
        'ai',
        `Ganz einfach: **a-biotisch** = „nicht lebendig", **biotisch** = „lebendig".

| | Abiotische Faktoren | Biotische Faktoren |
|---|---|---|
| **Bedeutung** | unbelebte Umweltbedingungen | Einflüsse durch andere Lebewesen |
| **Beispiele** | Licht, Temperatur, Wasser, Bodenart, pH-Wert, Wind | Konkurrenz, Fressfeinde, Nahrung, Symbiose, Parasiten |
| **Im Wald** | Schatten unter dem Blätterdach, Feuchtigkeit im Boden | Rehe fressen Jungpflanzen, Pilze versorgen Baumwurzeln |

**Merkhilfe:** Kannst du dir vorstellen, dass ein *Stein* den Faktor verursacht? Dann ist er abiotisch. Geht der Einfluss von *Lebewesen* aus, ist er biotisch.

Wichtig für die Klausur: Beide Faktoren wirken **gleichzeitig** und beeinflussen sich gegenseitig — Bäume (biotisch) verändern zum Beispiel das Licht am Boden (abiotisch).`,
      ],
      ['user', 'Okay, das hilft. Wie sieht ein Nahrungsnetz im Wald aus?'],
      [
        'ai',
        `Fangen wir mit einer **Nahrungskette** an und bauen daraus das Netz:

**Eichenblatt → Raupe → Kohlmeise → Sperber**

Jedes Glied hat eine Rolle:

• **Produzenten** (Erzeuger): Pflanzen — sie bauen mit Fotosynthese aus Licht, Wasser und CO₂ energiereiche Stoffe auf (z. B. Eiche)
• **Konsumenten 1. Ordnung** (Pflanzenfresser): Raupe, Reh, Maus
• **Konsumenten 2. Ordnung** (Fleischfresser): Kohlmeise (frisst Raupen), Fuchs (frisst Mäuse)
• **Konsumenten 3. Ordnung** (Endkonsumenten): Sperber, Habicht
• **Destruenten** (Zersetzer): Bakterien und Pilze — sie verwerten totes Material

Im **Nahrungsnetz** sind viele Ketten miteinander verbunden, denn fast kein Tier frisst nur eine Sache: Die Maus frisst Samen *und* Insekten, der Fuchs frisst Mäuse *und* Beeren. Dadurch ist das Netz stabiler — fällt eine Art aus, springen andere ein.`,
      ],
      [
        'user',
        'Und was machen Destruenten genau? Warum sind die so wichtig? Ich dachte, die ganze Energie kommt von der Sonne.',
      ],
      [
        'ai',
        `Gute Frage — du hast beides richtig verstanden. Die **Energie** kommt von der Sonne und fließt in eine Richtung (durch die Nahrungskette, am Ende als Wärme verloren). Die **Stoffe** dagegen (Kohlenstoff, Stickstoff, Mineralstoffe) werden im **Kreislauf** immer wieder verwendet — und hier sind die Destruenten unverzichtbar.

**Wer zersetzt was?**
• **Zersetzer** (Bodentiere): Regenwurm, Assel, Springschwanz — zerkleinern Laub und Totholz
• **Destruenten** (Bakterien, Pilze): bauen die Reste vollständig ab bis zu **Mineralstoffen, Wasser und CO₂** (Mineralisierung)

**Warum wichtig?** Ohne sie würde sich das Laub einfach immer weiter stapeln, und die Bäume hätten keine Nährstoffe mehr. Die Mineralstoffe, die die Destruenten freisetzen, nehmen die Pflanzenwurzeln wieder auf — und der Kreislauf beginnt von vorn.`,
      ],
      ['user', 'Kannst du den Stoffkreislauf bitte nochmal Schritt für Schritt erklären?'],
      [
        'ai',
        `Klar — am Beispiel einer Buche:

1. **Aufbau:** Die Buche nimmt CO₂ aus der Luft, Wasser und Mineralstoffe aus dem Boden auf und stellt per **Fotosynthese** Traubenzucker her.
2. **Weitergabe:** Ein Reh frisst Buchenblätter, ein Fuchs frisst das Reh — die Stoffe wandern durch die Nahrungskette.
3. **Abfall:** Laub fällt im Herbst zu Boden, Tiere sterben, Ausscheidungen bleiben liegen.
4. **Zerkleinerung:** Regenwürmer und Asseln zerkleinern das Material, es entsteht **Humus**.
5. **Mineralisierung:** Pilze und Bakterien zersetzen den Humus zu **Mineralstoffen**, Wasser und CO₂.
6. **Wiederaufnahme:** Die Wurzeln der Buche nehmen die Mineralstoffe wieder auf — der Kreislauf ist geschlossen.

**Merksatz:** *Energie fließt durch (Einbahnstraße), Stoffe kreisen (Kreislauf).*`,
      ],
      ['user', 'Was bedeutet nochmal Biotop und Biozönose? Ich verwechsle die immer.'],
      [
        'ai',
        `Eine Eselsbrücke aus dem Griechischen:

• **Biotop** = *bios* (Leben) + *topos* (Ort) → der **Ort**, an dem gelebt wird, also der Lebensraum
• **Biozönose** = *bios* (Leben) + *koinos* (gemeinsam) → die **Gemeinschaft** aller Lebewesen

**Ökosystem = Biotop + Biozönose**

Am Beispiel Wald: Der Boden, das Klima und das Licht im Buchenwald sind das Biotop. Alle Buchen, Rehe, Meisen, Pilze und Regenwürmer zusammen sind die Biozönose.`,
      ],
      ['user', 'Was würde passieren, wenn alle Füchse im Wald verschwinden würden?'],
      [
        'ai',
        `Das ist eine typische Transferfrage! Denk in **Ketten von Folgen**:

1. Füchse fressen Mäuse → **ohne Füchse nimmt die Mäusepopulation zu** (zunächst).
2. Mehr Mäuse fressen mehr Samen und Jungpflanzen → **die Verjüngung des Waldes leidet**.
3. Andere Beutegreifer (Eulen, Greifvögel) profitieren vom größeren Angebot und vermehren sich.
4. Irgendwann fehlt den Mäusen die Nahrung → die Population **bricht wieder ein**.

Das Zusammenspiel von Räuber und Beute führt normalerweise zu **regelmäßigen Schwankungen** um einen Mittelwert. Fällt ein Glied aus, gerät das **biologische Gleichgewicht** durcheinander.

Ein bekanntes Beispiel für so eine Kettenreaktion ist die Wiederansiedlung der Wölfe im Yellowstone-Nationalpark: Die Wölfe beeinflussten die Hirschbestände, und dadurch erholte sich an vielen Stellen die Vegetation.`,
      ],
      [
        'user',
        'Das war richtig gut erklärt. Kannst du mir zum Schluss drei Klausurfragen stellen?',
      ],
      [
        'ai',
        `Sehr gern, hier deine Übungsfragen — vom Einfachen zum Schwierigen:

**1.** Nenne je zwei abiotische und zwei biotische Faktoren im Wald und erkläre, wie sich ein Faktor aus jeder Gruppe gegenseitig beeinflusst.

**2.** Stelle eine Nahrungskette mit vier Gliedern aus dem Wald auf und ordne jedem Glied seine Rolle zu (Produzent, Konsument, Destruent).

**3.** Erkläre, warum man sagt „Energie fließt, Stoffe kreisen", und begründe die Rolle der Destruenten.

Schreib deine Antworten gern in ganzen Sätzen — ich gebe dir Feedback wie ein Lehrer.`,
      ],
      [
        'user',
        `1) Abiotisch: Licht und Temperatur. Biotisch: Konkurrenz und Fressfeinde. Die Bäume (biotisch) machen Schatten, dadurch wird es am Boden dunkler (Licht).
2) Eichenblatt (Produzent) → Raupe (Konsument 1) → Kohlmeise (Konsument 2) → Sperber (Konsument 3). Destruenten zersetzen alles Tote.
3) Energie kommt von der Sonne und geht am Ende verloren, Stoffe werden wieder verwendet weil Destruenten alles zu Mineralstoffen abbauen.`,
      ],
      [
        'ai',
        `Das sind schon sehr gute Antworten! Mein Feedback:

**Aufgabe 1 — 3/4 Punkte** ✅
Faktoren richtig zugeordnet, und das Beispiel mit dem Schatten ist genau die geforderte gegenseitige Beeinflussung. *Verbesserung:* Nenne auch die Richtung zurück — z. B. „Wenig Licht beschränkt außerdem das Wachstum der Krautschicht".

**Aufgabe 2 — 4/4 Punkte** ✅
Kette und Rollen stimmen. Der Hinweis auf die Destruenten ist ein Pluspunkt.

**Aufgabe 3 — 3/4 Punkte** ✅
Inhaltlich richtig. Damit es volle Punkte gibt, ergänze noch: Energie geht als **Wärme** verloren (jede Stufe „verbraucht" Energie durch Stoffwechsel). Außerdem: Die Mineralstoffe werden von den **Produzenten** wieder aufgenommen — so schließt sich der Kreislauf.

**Gesamt: 10/12 Punkte** — das entspricht ungefähr einer 2. Nur an der Formulierung feilen, dann bist du bereit. 💪`,
      ],
      ['user', 'Danke! Kannst du mir noch die wichtigsten Punkte kurz zum Lernen zusammenfassen?'],
      [
        'ai',
        `## Ökosystem Wald — das musst du wissen

• **Ökosystem** = Biotop (Lebensraum) + Biozönose (Lebensgemeinschaft)
• **Stockwerke:** Baum-, Strauch-, Kraut-, Moos-, Bodenschicht — Licht nimmt nach unten ab
• **Abiotisch** (Licht, Temperatur, Wasser, Boden) und **biotisch** (Konkurrenz, Fressfeinde, Symbiose) wirken zusammen
• **Nahrungskette:** Produzent → Konsument 1. Ordnung → 2. Ordnung → Endkonsument; **Destruenten** bauen alles Tote ab
• **Nahrungsnetz** = vernetzte Ketten → stabiler als eine Kette
• **Energie fließt** (Sonne → Wärme), **Stoffe kreisen** (Mineralisierung durch Destruenten)
• **Gleichgewicht:** Räuber und Beute schwanken regelmäßig; fällt ein Glied aus, gerät das System durcheinander

Viel Erfolg bei der Klausur! Wenn du willst, machen wir morgen noch eine Runde mit neuen Übungsfragen. 🌲`,
      ],
    ],
  },
  // ---- Conditional Sentences: Material für den generierten Lernzettel ----
  {
    slug: 'conditionals-erklaert',
    thema: 'conditional-sentences',
    titel: 'If-Sätze Typ 1 und 2 verstehen',
    modus: 'erklaeren',
    vorStunden: 34,
    messages: [
      [
        'user',
        'Ich verstehe den Unterschied zwischen If-Sätzen Typ 1 und Typ 2 nicht. Wann benutze ich was?',
      ],
      [
        'ai',
        `Der Unterschied liegt darin, **wie wahrscheinlich** die Bedingung ist.

**Type 1 — real / möglich**
If + Simple Present, **will** + Infinitiv
• If it **rains** tomorrow, we **will stay** at home.
→ Es kann wirklich passieren.

**Type 2 — unreal / unwahrscheinlich**
If + Simple Past, **would** + Infinitiv
• If I **had** a million euros, I **would buy** a house.
→ Ich habe die Million nicht, es ist nur ein Gedankenspiel.

**Wichtig:** Im Type 2 steht im If-Teil das *Simple Past*, obwohl es um Gegenwart oder Zukunft geht — die Vergangenheitsform zeigt hier nur „das ist nicht wirklich".`,
      ],
      ['user', 'Und wo kommt das Komma hin? Und was ist mit „were"?'],
      [
        'ai',
        `**Komma:** Steht der If-Satz vorne, kommt nach ihm ein Komma. Steht er hinten, gibt es **keins**.
• If I **were** you, I would apologise.
• I would apologise if I **were** you.

**„were" bei allen Personen:** Im Type 2 benutzt man in der Regel **were** statt was — also *If I were, if he were, if she were*. Umgangssprachlich hört man auch „If I was …", aber in der Schule schreibst du **were**.

**Extra-Tipp:** Statt „if … not" kann man in Type 1 auch **unless** verwenden:
• *Unless* you hurry, you will miss the bus. (= If you don't hurry, …)`,
      ],
      ['user', 'Kann ich in Type 1 auch was anderes als will benutzen?'],
      [
        'ai',
        `Ja! Im Hauptsatz von Type 1 sind auch **Modalverben** möglich (can, must, may) und sogar der **Imperativ**:
• If you **can** come, **call** me.
• If she feels sick, she **must** stay in bed.

Nur im **If-Teil** selbst steht nie *will* oder *would* — dazu gleich noch eine Übung, wenn du magst.`,
      ],
    ],
  },
  {
    slug: 'conditionals-ueben',
    thema: 'conditional-sentences',
    titel: 'Übungssätze zu Conditionals',
    modus: 'ueben',
    vorStunden: 30,
    messages: [
      ['user', 'Gib mir bitte vier Lückensätze zu If-Sätzen zum Üben.'],
      [
        'ai',
        `Setze jeweils die richtige Form ein:

**1.** If it ___ (rain) this weekend, we ___ (cancel) the barbecue.
**2.** If I ___ (be) you, I ___ (talk) to my teacher.
**3.** If she ___ (study) harder, she ___ (pass) the test.
**4.** We ___ (go) to the beach if the weather ___ (be) nice.

Tipp: Überlege bei jedem Satz zuerst, ob die Bedingung *möglich* (Type 1) oder *unwahrscheinlich* (Type 2) ist.`,
      ],
      [
        'user',
        '1) rains, will cancel\n2) were, would talk\n3) would study, would pass\n4) will go, is',
      ],
      [
        'ai',
        `Fast alles richtig — drei von vier! 👏

**1.** ✅ rains / will cancel (Type 1)
**2.** ✅ were / would talk (Type 2)
**3.** ❌ Hier ist ein klassischer Fehler: Im **If-Teil** steht nie *would*. Richtig: *If she **studied** harder, she **would pass** the test.* (Type 2)
**4.** ✅ will go / is (Type 1)

**Merksatz:** *Would* gehört in den **Hauptsatz**, niemals in den if-Satz. Im if-Teil steht bei Type 1 Simple Present, bei Type 2 Simple Past.`,
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
  content: string;
  revisionen: Msg[];
}

const LERNZETTEL: LzSeed[] = [
  {
    slug: 'gls',
    thema: 'lineare-gleichungssysteme',
    titel: 'Lineare Gleichungssysteme — die drei Verfahren',
    vorTagen: 0.2,
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
  {
    slug: 'stilmittel',
    thema: 'gedichtanalyse',
    titel: 'Stilmittel im Überblick — mit Wirkung',
    vorTagen: 2,
    content: `## Stilmittel bestimmen und deuten
Ein Stilmittel zu **nennen** reicht nie. Für volle Punkte gehört immer dazu: **Beleg (Vers) + Wirkung**.

## Bilder und Vergleiche
| Stilmittel | Erklärung | Beispiel |
|---|---|---|
| Metapher | Bild ohne „wie" | „im gelben Kleid" (Blätter) |
| Vergleich | Bild mit „wie" | „leise wie Schnee" |
| Personifikation | Dinge handeln wie Menschen | „der Wind erzählt" |
| Symbol | Ding steht für einen größeren Gedanken | Herbst = Vergänglichkeit |

## Klang und Rhythmus
• **Alliteration:** gleicher Anlaut, z. B. „Wind und Wellen" — Klangwirkung
• **Anapher:** gleicher Versanfang in mehreren Versen — Betonung, Rhythmus
• **Enjambement:** Satz läuft über das Versende — Lesefluss oder Spannung
• **Refrain:** wiederkehrende Zeile — Einprägsamkeit

## Aufbau und Spannung
• **Antithese:** Gegensatz („Licht und Schatten") — Spannung, Konflikt
• **Klimax:** Steigerung — Dramatik
• **Parallelismus:** gleich gebaute Sätze — Nachdruck

## Formulierungsbausteine für die Wirkung
> Dadurch wirkt … / Dies erzeugt den Eindruck von … / Das hebt … hervor.

**Beispiel:** „Die Personifikation ‚der Wind erzählt' (V. 3–4) macht die Natur lebendig und erzeugt eine ruhige, wehmütige Stimmung."

## Häufige Fehler
⚠️ Stilmittel nur aufzählen, ohne Wirkung · Metapher und Vergleich verwechseln · Zitat ohne Versangabe`,
    revisionen: [
      ['user', 'Kannst du die Tabelle um Symbol ergänzen?'],
      [
        'ai',
        'Erledigt — ich habe in der Tabelle „Bilder und Vergleiche" eine Zeile zum **Symbol** mit dem Beispiel „Herbst = Vergänglichkeit" ergänzt.',
      ],
      ['user', 'Und schreib bitte noch Formulierungsbausteine für die Wirkung dazu.'],
      [
        'ai',
        'Habe ich ergänzt: Am Ende gibt es jetzt den Abschnitt „Formulierungsbausteine für die Wirkung" mit drei Satzanfängen und einem Musterbeispiel.',
      ],
      ['user', 'Super, danke. Und die häufigsten Fehler bitte auch.'],
      [
        'ai',
        'Klar — der Abschnitt „Häufige Fehler" steht jetzt unten: Stilmittel ohne Wirkung, Metapher/Vergleich verwechseln und fehlende Versangaben beim Zitieren.',
      ],
    ],
  },
  {
    slug: 'conditionals',
    thema: 'conditional-sentences',
    titel: LZ_CONDITIONALS.titel,
    vorTagen: 0.3,
    content: LZ_CONDITIONALS.content,
    revisionen: [
      [
        'user',
        'Ich verwechsle „unless" ständig mit „if". Kannst du dazu einen eigenen Abschnitt ergänzen?',
      ],
      [
        'ai',
        'Habe ich ergänzt: Abschnitt **6. Unless — Alternative zu „If … not"** erklärt, dass *unless* dasselbe bedeutet wie *if … not*. Dazu gibt es zwei Beispiele und den Hinweis, dass im Hauptsatz **keine** zusätzliche Verneinung stehen darf.',
      ],
      [
        'user',
        'Mach bitte noch eine Übersichts-Tabelle, in der Type 1 und Type 2 nebeneinander stehen.',
      ],
      [
        'ai',
        'Die Tabelle steht jetzt als **Abschnitt 8. Übersichts-Tabelle**. Sie vergleicht Type 1 und Type 2 nach Bedingung, Tempus im If-Teil, Form im Hauptsatz und Beispielsatz.',
      ],
      [
        'user',
        'Und wie gehe ich Schritt für Schritt vor, wenn ich selbst einen If-Satz bilden muss?',
      ],
      [
        'ai',
        'Dafür gibt es jetzt **Abschnitt 9**: In vier Schritten prüfst du, ob die Bedingung möglich ist, wählst das Tempus im If-Teil, dann die Form im Hauptsatz und setzt am Ende das Komma, wenn der If-Satz vorne steht.',
      ],
      [
        'user',
        'Super. Ganz am Ende noch eine Checkliste zum Abhaken, bevor ich die Klausur schreibe.',
      ],
      [
        'ai',
        'Erledigt — **Abschnitt 10** ist eine Checkliste mit den wichtigsten Punkten (Komma, *were*, kein *will/would* im If-Teil, *unless*). Darunter steht noch einmal das Wichtigste in Kurzform.',
      ],
    ],
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
  [
    'd10',
    'gedichtanalyse',
    'Herbstmorgen_Gedicht_Kopie.jpg',
    'img',
    1_650_000,
    4,
    'Foto der Kopie des Gedichts „Herbstmorgen" mit handschriftlich markierten Betonungen und Reimwörtern.',
  ],
  [
    'd11',
    'gedichtanalyse',
    'Stilmittel_Uebersicht_Klasse8.pdf',
    'pdf',
    470_000,
    9,
    'Zweiseitige Übersicht der wichtigsten Stilmittel mit Definition, Beispielvers und Wirkung sowie Tipps zur Formulierung.',
  ],
  [
    'd13',
    'gedichtanalyse',
    'Checkliste_Gedichtanalyse.pdf',
    'pdf',
    210_000,
    1,
    'Einseitige Checkliste für die Klausur: Einleitung, Form, Sprache und Deutung Punkt für Punkt, mit Formulierungshilfen für Einleitung und Fazit.',
  ],
  [
    'd14',
    'terme-binome',
    'Formelsammlung_Binomische_Formeln.pdf',
    'pdf',
    260_000,
    9,
    'Formelsammlung mit den drei binomischen Formeln, Rechenbeispielen, geometrischer Herleitung am Quadrat und Faktorisieren als Umkehrung.',
  ],
  [
    'd15',
    'zinsrechnung',
    'Zinsrechnung_Uebungsblatt.pdf',
    'pdf',
    380_000,
    8,
    'Übungsblatt zu Jahres-, Monats- und Tageszinsen sowie Zinseszins, 14 Aufgaben mit Lösungen und Musterrechnung.',
  ],
  [
    'd12',
    'conditional-sentences',
    'Conditionals_Uebungsblatt.pdf',
    'pdf',
    350_000,
    6,
    'Übungsblatt zu If-Sätzen Type 1 und 2: Lückentexte, Satzumformungen und Fehlersuche, inkl. Lösungen.',
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
  [
    'km2',
    'mathematik',
    ['pythagoras', 'terme-binome', 'zinsrechnung'],
    'Mathe Klausur — Pythagoras, Terme & Zinsrechnung',
    21,
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
  {
    slug: 'kd2-t1',
    klausur: 'kd2',
    fach: 'deutsch',
    themen: ['eroerterung'],
    titel: 'Testklausur 1 — Deutsch Klausur — Erörterung',
    vorTagen: 2,
    aufgaben: [
      [
        'eroerterung',
        'Erörtere die Frage „Sollten Smartphones im Unterricht erlaubt sein?" Formuliere eine Einleitung mit Leitfrage, entwickle mindestens zwei Pro- und zwei Contra-Argumente mit Beispielen und schließe mit einem begründeten Fazit.',
      ],
    ],
    ergebnis: [
      {
        thema: 'eroerterung',
        prozent: 74,
        erklaerung:
          'Aufbau und Leitfrage sind klar, die Argumente sind mit Beispielen belegt und sinnvoll geordnet. Kleine Abzüge: Ein Contra-Argument bleibt oberflächlich, und das Fazit greift die Argumente nicht alle wieder auf.',
      },
    ],
  },
  {
    slug: 'km2-t1',
    klausur: 'km2',
    fach: 'mathematik',
    themen: ['pythagoras', 'terme-binome', 'zinsrechnung'],
    titel: 'Testklausur 1 — Mathe Klausur — Pythagoras, Terme & Zinsrechnung',
    vorTagen: 8,
    aufgaben: [
      [
        'pythagoras',
        'Eine 5 m lange Leiter lehnt an einer Hauswand. Ihr Fußpunkt ist 3 m von der Wand entfernt. In welcher Höhe berührt die Leiter die Wand? Zeichne eine Skizze und begründe deinen Ansatz.',
      ],
      [
        'terme-binome',
        'Multipliziere aus: (x + 3)². Faktorisiere anschließend x² − 16 und erkläre, welche binomische Formel du verwendest.',
      ],
      [
        'zinsrechnung',
        'Berechne die Zinsen für ein Kapital von 2.400 € bei einem Zinssatz von 2,5 % nach 8 Monaten. Schreibe die verwendete Formel auf.',
      ],
    ],
    ergebnis: [
      {
        thema: 'pythagoras',
        prozent: 82,
        erklaerung:
          'Der Satz des Pythagoras wurde korrekt angesetzt und die Höhe (4 m) richtig berechnet. Die Skizze war vorhanden; es fehlte nur die Einheit im Antwortsatz.',
      },
      {
        thema: 'terme-binome',
        prozent: 34,
        erklaerung:
          'Bei (x + 3)² wurde der Mittelteil vergessen (x² + 9 statt x² + 6x + 9). Die dritte binomische Formel beim Faktorisieren wurde erkannt, aber nicht sauber angewendet.',
      },
      {
        thema: 'zinsrechnung',
        prozent: 56,
        erklaerung:
          'Die Formel Z = K · p/100 · t ist bekannt, aber die 8 Monate wurden nicht als Bruchteil eines Jahres (8/12) eingesetzt — es wurden die Jahreszinsen berechnet.',
      },
    ],
  },
  {
    slug: 'km2-t2',
    klausur: 'km2',
    fach: 'mathematik',
    themen: ['terme-binome', 'zinsrechnung'],
    titel: 'Testklausur 2 — Mathe Klausur — Pythagoras, Terme & Zinsrechnung',
    vorTagen: 4,
    aufgaben: [
      [
        'terme-binome',
        'Multipliziere aus: (2a − 5)². Vereinfache außerdem (y + 4)(y − 4) und begründe kurz, welche Formel du verwendest.',
      ],
      [
        'zinsrechnung',
        'Ein Guthaben von 1.500 € wird 3 Jahre lang mit 2 % Zinseszins verzinst. Berechne das Endkapital und erkläre deinen Rechenweg.',
      ],
    ],
    ergebnis: [
      {
        thema: 'terme-binome',
        prozent: 79,
        erklaerung:
          'Deutlich verbessert: Mittelteil und Vorzeichen sind jetzt korrekt, auch bei (2a − 5)². Ein kleiner Rechenfehler beim Quadrieren von 2a (statt 4a² stand 2a²).',
      },
      {
        thema: 'zinsrechnung',
        prozent: 63,
        erklaerung:
          'Der Zinsfaktor 1,02 wurde erkannt, aber es wurde mit einfachen Zinsen (3 · 30 €) gerechnet statt mit 1,02³. Das Ergebnis liegt nah dran, ist aber nicht exakt (1.591,81 €).',
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
  /** chatMap: "<tag>|<modus>|<themaSlug>" → Chat-Slug (Chat muss in CHATS existieren) */
  chatMap?: Record<string, string>;
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
  {
    slug: 'kd2',
    klausur: 'kd2',
    tk1: 'kd2-t1',
    tk2: null,
    vorTagen: 3,
    checks: {},
    lernzettel: null,
  },
  {
    slug: 'km2',
    klausur: 'km2',
    tk1: 'km2-t1',
    tk2: 'km2-t2',
    vorTagen: 8,
    checks: {
      '2': ['terme-binome', 'zinsrechnung'].flatMap((t) => [
        `fehler:${T(t)}`,
        `beispiel:${T(t)}`,
        `check:${T(t)}`,
      ]),
      '3': [
        `abfragen:${T('terme-binome')}`,
        `abfragen:${T('zinsrechnung')}`,
        'gemischt',
        'loesungen',
      ],
      '4': [`feynman:${T('terme-binome')}`, `feynman:${T('zinsrechnung')}`, 'wiederholung'],
      '6': [`luecke:${T('zinsrechnung')}`, `frisch:${T('terme-binome')}`],
      '7': ['selbsttest'],
    },
    chatMap: {
      '2|erklaeren|terme-binome': 'lp-t2-terme-erkl',
      '2|ueben|terme-binome': 'lp-t2-terme-check',
      '2|erklaeren|zinsrechnung': 'lp-t2-zins-erkl',
      '2|ueben|zinsrechnung': 'lp-t2-zins-check',
      '3|ueben|terme-binome': 'lp-t3-terme',
      '3|ueben|zinsrechnung': 'lp-t3-zins',
      '4|erklaeren|terme-binome': 'lp-t4-terme-feynman',
      '4|erklaeren|zinsrechnung': 'lp-t4-zins-feynman',
      '4|ueben|terme-binome': 'lp-t4-terme-wdh',
      '6|erklaeren|zinsrechnung': 'lp-t6-zins-luecke',
      '6|ueben|terme-binome': 'lp-t6-terme-frisch',
    },
    lernzettel: {
      vorTagen: 3,
      content: `# Lernzettel

### Terme & Binomische Formeln
Die drei binomischen Formeln: **(a + b)² = a² + 2ab + b²**, **(a − b)² = a² − 2ab + b²**, **(a + b)(a − b) = a² − b²**. Bei den ersten beiden gibt es immer einen **doppelten Mittelteil** (2ab) — bei der dritten fällt er weg.

**Typischer Fehler:** (x + 3)² = x² + 9 — der Mittelteil 6x fehlt.

**Merksatz:** Quadrat vorn, Quadrat hinten, in der Mitte das Doppelte vom Produkt.

### Zinsrechnung
**Z = K · p/100 · t** — t immer in Jahren: Monate durch 12, Tage durch 360 teilen. Beim **Zinseszins** wird jedes Jahr auf das neue Kapital verzinst: **Kₙ = K₀ · qⁿ** mit q = 1 + p/100.

**Typischer Fehler:** Jahreszinsen statt anteiliger Zinsen, und einfache Zinsen statt Zinseszins.

**Merksatz:** Der Zinssatz gilt pro Jahr — kürzere Zeit bedeutet weniger Zinsen; Zinseszins heißt mal Zinsfaktor hoch Jahre.`,
    },
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
      // Ist der Account einem Elternkonto zugeordnet (seed-eltern-account.ts),
      // gehört er zu dessen Familien-Abo — dann kein eigenes Abo anlegen.
      const elternAbo = dev.parentUserId
        ? await tx.abo.findFirst({ where: { ownerUserId: dev.parentUserId } })
        : null;
      if (elternAbo) {
        await tx.user.update({ where: { id: U }, data: { aboId: elternAbo.id } });
      } else {
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
      }
      const L = PLAN_LIMITS.premium;
      await tx.usage.create({
        data: {
          userId: U,
          monat: new Date(now).toISOString().slice(0, 7),
          nachrichtenUsed: 181,
          nachrichtenLimit: L.nachrichten,
          dateienUsed: DATEIEN.length,
          dateienLimit: L.dateien,
          lernzettelUsed: LERNZETTEL.length,
          lernzettelLimit: L.lernzettel,
          testklausurenUsed: 4,
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
            chatMap: Object.fromEntries(
              Object.entries(lp.chatMap ?? {}).map(([key, chatSlug]) => {
                const [tag, modus, themaSlug] = key.split('|');
                return [`${tag}|${modus}|${T(themaSlug!)}`, uid(`chat:${chatSlug}`)];
              }),
            ),
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
