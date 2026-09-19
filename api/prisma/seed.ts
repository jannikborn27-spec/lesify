/**
 * Staging-Seed — baut die Dummy-Daten aus app/assets/js/data.js (`SEED`) in der
 * echten DB nach, damit die angebundene App identisch zum Prototyp aussieht.
 *
 * Aufruf:  pnpm --filter ./api db:seed        (bzw. automatisch via db:reset)
 * Idempotent: löscht die Daten des Demo-Users vorab und legt sie neu an.
 *
 * ABGEDECKT: alles aus SEED — Demo-User + Einstellungen + Abo + Usage,
 *            Fächer/Themen, Chats (+Nachrichten), Lernzettel (+Revisionen),
 *            Dateien, Klausuren, Testklausuren (+Aufgaben/Ergebnis/
 *            Vorbereitungsstand) und Lernpläne.
 */
import {
  PrismaClient,
  Rolle,
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
  Ampel,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();

const now = Date.now();
const hoursAgo = (n: number) => new Date(now - n * 3_600_000);
const daysAgo = (n: number) => new Date(now - n * 86_400_000);

/** stabile Slug -> uuid Zuordnung, damit die Prototyp-IDs als Referenz taugen */
const ids: Record<string, string> = {};
const uid = (slug: string): string => (ids[slug] ??= randomUUID());

const DEMO = uid('demo-user');

// --- Fächer (SEED.faecher) ---
const FAECHER = [
  {
    slug: 'mathematik',
    name: 'Mathematik',
    klasse: '8. Klasse',
    initial: 'M',
    farbe: 'blue',
    icon: 'mathematik',
  },
  {
    slug: 'deutsch',
    name: 'Deutsch',
    klasse: '8. Klasse',
    initial: 'D',
    farbe: 'rose',
    icon: 'deutsch',
  },
  {
    slug: 'englisch',
    name: 'Englisch',
    klasse: '8. Klasse',
    initial: 'E',
    farbe: 'amber',
    icon: 'englisch',
  },
  {
    slug: 'biologie',
    name: 'Biologie',
    klasse: '8. Klasse',
    initial: 'B',
    farbe: 'teal',
    icon: 'biologie',
  },
  {
    slug: 'geschichte',
    name: 'Geschichte',
    klasse: '9. Klasse',
    initial: 'G',
    farbe: 'terracotta',
    icon: 'geschichte',
  },
];

// --- Themen (SEED.themen) ---
const THEMEN = [
  [
    'bruchrechnung',
    'mathematik',
    'Bruchrechnung',
    'Kürzen, Erweitern und Rechnen mit Brüchen — die Grundlage für Prozent- und Verhältnisrechnung.',
  ],
  [
    'lineare-gleichungen',
    'mathematik',
    'Lineare Gleichungen',
    'Gleichungen und Gleichungssysteme lösen, grafisch und rechnerisch.',
  ],
  [
    'prozentrechnung',
    'mathematik',
    'Prozentrechnung',
    'Grundwert, Prozentwert und Prozentsatz im Alltag anwenden.',
  ],
  [
    'flaechenberechnung',
    'mathematik',
    'Flächenberechnung',
    'Flächeninhalte von Dreieck, Trapez und zusammengesetzten Figuren.',
  ],
  [
    'gedichtanalyse',
    'deutsch',
    'Gedichtanalyse',
    'Metrik, Reimschema und sprachliche Mittel systematisch untersuchen.',
  ],
  [
    'eroerterung',
    'deutsch',
    'Erörterung',
    'Argumente strukturieren und eine schlüssige Erörterung aufbauen.',
  ],
  ['satzglieder', 'deutsch', 'Satzglieder', 'Subjekt, Prädikat und Objekte sicher bestimmen.'],
  [
    'simple-past-present-perfect',
    'englisch',
    'Simple Past vs. Present Perfect',
    'Wann welche Zeitform — Signalwörter und typische Fehler.',
  ],
  [
    'vocabulary-environment',
    'englisch',
    'Vocabulary: Environment',
    'Wortschatz rund um Klima und Umwelt sicher anwenden.',
  ],
  [
    'essay-writing',
    'englisch',
    'Essay Writing',
    'Aufbau, Struktur und sprachliche Verbindungen für Essays.',
  ],
  ['zellbiologie', 'biologie', 'Zellbiologie', 'Aufbau und Funktion von Tier- und Pflanzenzellen.'],
  [
    'genetik-vererbung',
    'biologie',
    'Genetik: Vererbung',
    'Mendelsche Regeln und Erbgänge verstehen.',
  ],
  [
    'oekosystem-wald',
    'biologie',
    'Ökosystem Wald',
    'Nahrungsnetze, Stoffkreisläufe und Artenvielfalt im Wald.',
  ],
  [
    'weimarer-republik',
    'geschichte',
    'Weimarer Republik',
    'Entstehung, Krisen und Scheitern der ersten deutschen Demokratie.',
  ],
  [
    'kalter-krieg',
    'geschichte',
    'Kalter Krieg',
    'Blockbildung, Wettrüsten und Stellvertreterkonflikte.',
  ],
] as const;

type Msg = { role: 'user' | 'ai'; text: string };
const CHATS: {
  slug: string;
  thema: string;
  titel: string;
  modus: keyof typeof ChatModus;
  updatedHours: number;
  messages: Msg[];
}[] = [
  {
    slug: 'c1',
    thema: 'bruchrechnung',
    titel: 'Erklär mir das Kürzen von Brüchen',
    modus: 'erklaeren',
    updatedHours: 2,
    messages: [
      {
        role: 'user',
        text: 'Kannst du mir erklären, wie man Brüche kürzt? Ich verstehe nicht, warum man einfach durch dieselbe Zahl teilen darf.',
      },
      {
        role: 'ai',
        text: 'Gerne! Ein Bruch verändert seinen Wert nicht, wenn du Zähler und Nenner durch dieselbe Zahl teilst — du teilst ja quasi beide „Hälften" gleich stark, das Verhältnis bleibt gleich. Nimm 8/12: teilbar durch 4 → 2/3. Möchtest du es an einer eigenen Aufgabe üben?',
      },
      { role: 'user', text: 'Ja, gib mir bitte eine Aufgabe mit größeren Zahlen.' },
      {
        role: 'ai',
        text: 'Kürze 126/210 so weit wie möglich. Tipp: Suche zuerst den größten gemeinsamen Teiler von 126 und 210.',
      },
    ],
  },
  {
    slug: 'c2',
    thema: 'lineare-gleichungen',
    titel: 'Hilfe bei Textaufgabe Gleichungssystem',
    modus: 'hausaufgaben',
    updatedHours: 24,
    messages: [
      {
        role: 'user',
        text: 'Zwei Zahlen: Die Summe ist 34, die Differenz ist 8. Wie stelle ich das Gleichungssystem auf?',
      },
      {
        role: 'ai',
        text: 'Nenne die Zahlen x und y. Aus dem Text folgt: x + y = 34 und x − y = 8. Wenn du beide Gleichungen addierst, fällt y weg — probier das mal und sag mir, was du für x bekommst.',
      },
    ],
  },
  {
    slug: 'c3',
    thema: 'gedichtanalyse',
    titel: 'Metrik und Reimschema erklären',
    modus: 'erklaeren',
    updatedHours: 72,
    messages: [
      { role: 'user', text: 'Was ist der Unterschied zwischen Jambus und Trochäus?' },
      {
        role: 'ai',
        text: 'Beim Jambus folgt auf eine unbetonte eine betonte Silbe (taTUM), beim Trochäus umgekehrt (TAMta). Lies laut „Der Mond ist aufgegangen" — spürst du das TAMta-Muster? Das ist ein Trochäus.',
      },
    ],
  },
  {
    slug: 'c4',
    thema: 'essay-writing',
    titel: 'Feedback zu meinem Essay-Aufbau',
    modus: 'hausaufgaben',
    updatedHours: 120,
    messages: [
      { role: 'user', text: 'Ist es okay, wenn mein Essay nur zwei Argumente im Hauptteil hat?' },
      {
        role: 'ai',
        text: 'Zwei starke, gut belegte Argumente sind besser als drei schwache. Achte darauf, dass jedes Argument einen eigenen Absatz mit Beispiel bekommt und dass du im Fazit beide wieder aufgreifst.',
      },
    ],
  },
  {
    slug: 'c5',
    thema: 'zellbiologie',
    titel: 'Unterschied Mitochondrien und Chloroplasten',
    modus: 'erklaeren',
    updatedHours: 168,
    messages: [
      { role: 'user', text: 'Warum haben nur Pflanzenzellen Chloroplasten?' },
      {
        role: 'ai',
        text: 'Chloroplasten betreiben Fotosynthese — sie wandeln Lichtenergie in chemische Energie um. Das brauchen nur Organismen, die sich selbst über Sonnenlicht ernähren, also Pflanzen und Algen. Mitochondrien dagegen haben fast alle Zellen, da sie für die Energiegewinnung aus Nährstoffen zuständig sind.',
      },
    ],
  },
  {
    slug: 'c6',
    thema: 'bruchrechnung',
    titel: 'Rendering-Test: Stochastik-Formeln',
    modus: 'erklaeren',
    updatedHours: 0.1,
    messages: [
      {
        role: 'user',
        text: 'Kannst du mir ein paar Stochastik-Formeln zum Testen zusammenstellen — mit Brüchen, Wurzeln, Summen, einer Tabelle und einem Codeblock?',
      },
      {
        role: 'ai',
        text: '(Seed-Kurzfassung — im Prototyp steht hier ein langer Markdown-/LaTeX-Rendering-Test.) Beispiel: $P(A)=\\frac{1}{2}$, $E(X)=\\sum_{i=1}^{n} x_i \\cdot P(X=x_i)$.',
      },
    ],
  },
];

const LERNZETTEL: {
  slug: string;
  thema: string;
  titel: string;
  updatedDays: number;
  content: string;
  revisionen: Msg[];
}[] = [
  {
    slug: 'l1',
    thema: 'bruchrechnung',
    titel: 'Bruchrechnung — Grundlagen & Regeln',
    updatedDays: 0.1,
    content:
      '## Kürzen und Erweitern\nEin Bruch ändert seinen Wert nicht, wenn Zähler und Nenner mit derselben Zahl multipliziert oder durch dieselbe Zahl geteilt werden.\n\nBeispiel: 8/12 → durch 4 teilen → 2/3\n\n## Gleichnamig machen\nUm Brüche zu addieren oder zu subtrahieren, brauchen sie denselben Nenner (das kgV der Nenner).\n\n## Multiplikation und Division\nZähler mal Zähler, Nenner mal Nenner. Bei Division wird mit dem Kehrwert multipliziert.',
    revisionen: [
      { role: 'user', text: 'Kannst du ein Beispiel zum Gleichnamig-Machen ergänzen?' },
      {
        role: 'ai',
        text: 'Klar — ich habe im Abschnitt „Gleichnamig machen" ein Beispiel ergänzt: 1/4 + 1/6 → kgV(4,6)=12 → 3/12 + 2/12 = 5/12.',
      },
    ],
  },
  {
    slug: 'l2',
    thema: 'prozentrechnung',
    titel: 'Prozentrechnung im Alltag',
    updatedDays: 1,
    content:
      '## Grundformel\nProzentwert = Grundwert × Prozentsatz / 100\n\n## Typische Anwendungen\nRabatt, Zinsen, Mehrwertsteuer — immer erst den Grundwert identifizieren.',
    revisionen: [],
  },
  {
    slug: 'l3',
    thema: 'gedichtanalyse',
    titel: 'Gedichtanalyse: Aufbau & Fachbegriffe',
    updatedDays: 3,
    content:
      '## Aufbau einer Gedichtanalyse\n1. Einleitung (Autor, Titel, Erscheinungsjahr, Thema)\n2. Formale Analyse (Metrum, Reimschema, Strophenform)\n3. Inhaltliche Analyse\n4. Sprachliche Mittel und ihre Wirkung\n5. Deutungshypothese\n\n## Wichtige Fachbegriffe\nJambus, Trochäus, Enjambement, Metapher, Anapher.',
    revisionen: [
      { role: 'user', text: 'Füg noch eine Erklärung zu Enjambement hinzu.' },
      {
        role: 'ai',
        text: 'Enjambement = ein Satz läuft über das Zeilenende hinaus in die nächste Zeile weiter. Wirkung: erzeugt Lesefluss oder Spannung.',
      },
    ],
  },
  {
    slug: 'l4',
    thema: 'vocabulary-environment',
    titel: 'Environment Vocabulary — Wortliste',
    updatedDays: 4,
    content:
      '## Key Vocabulary\nclimate change, greenhouse gas, renewable energy, deforestation, sustainability, carbon footprint.\n\n## Useful phrases\n"contribute to global warming", "reduce our environmental impact"',
    revisionen: [],
  },
  {
    slug: 'l5',
    thema: 'zellbiologie',
    titel: 'Zellbiologie im Überblick',
    updatedDays: 6,
    content:
      '## Zellorganellen\nZellkern (Erbgut), Mitochondrien (Energie), bei Pflanzen zusätzlich Chloroplasten (Fotosynthese) und Zellwand.',
    revisionen: [],
  },
];

const DATEIEN: [string, string, string, keyof typeof DateiTyp, number, number][] = [
  ['d1', 'bruchrechnung', 'Bruchrechnung_Uebungsblatt.pdf', 'pdf', 1_200_000, 0.1],
  ['d2', 'lineare-gleichungen', 'Gleichungssysteme_Skript.pdf', 'pdf', 860_000, 1],
  ['d3', 'gedichtanalyse', 'Gedicht_Erlkoenig_Analyse.pdf', 'pdf', 340_000, 3],
  ['d4', 'essay-writing', 'Essay_Draft_V2.docx', 'doc', 48_000, 5],
  ['d5', 'zellbiologie', 'Zellaufbau_Diagramm.png', 'img', 2_100_000, 7],
  ['d6', 'weimarer-republik', 'Quellenanalyse_Weimar.pdf', 'pdf', 610_000, 14],
];
const DATEI_SUMMARY: Record<string, string> = {
  d1: 'Übungsblatt mit 12 Aufgaben zum Kürzen und Erweitern von Brüchen, inkl. Lösungen.',
  d2: 'Skript zu Einsetzungs-, Gleichsetzungs- und Additionsverfahren mit Beispielrechnungen.',
  d3: 'Musteranalyse von Goethes „Erlkönig" mit Fokus auf Metrik und Spannungsaufbau.',
  d4: 'Zweiter Entwurf eines Essays zum Thema Klimawandel, drei Absätze im Hauptteil.',
  d5: 'Beschriftetes Diagramm einer Tier- und Pflanzenzelle im Vergleich.',
  d6: 'Quellenanalyse zu einer Rede aus der Weimarer Republik mit Einordnungshilfe.',
};

const KLAUSUREN: [string, string, string[], string, string][] = [
  [
    'k1',
    'mathematik',
    ['bruchrechnung', 'prozentrechnung', 'flaechenberechnung'],
    'Mathe Klausur 1 — 8. Klasse',
    '2026-09-14',
  ],
  [
    'k2',
    'mathematik',
    ['lineare-gleichungen'],
    'Mathe Klausur 2 — Lineare Gleichungen',
    '2026-10-02',
  ],
  ['k3', 'deutsch', ['gedichtanalyse'], 'Deutsch Klausur — Gedichtanalyse', '2026-09-20'],
  [
    'k4',
    'englisch',
    ['vocabulary-environment', 'simple-past-present-perfect'],
    'Englisch Vocabulary Test',
    '2026-09-08',
  ],
  [
    'k5',
    'biologie',
    ['zellbiologie', 'genetik-vererbung'],
    'Bio Klausur — Zellbiologie & Genetik',
    '2026-10-15',
  ],
  [
    'k6',
    'geschichte',
    ['weimarer-republik'],
    'Geschichte Klausur — Weimarer Republik',
    '2026-09-28',
  ],
  ['k7', 'deutsch', ['satzglieder'], 'Deutsch Klausur — Satzglieder & Grammatik', '2026-08-05'],
  ['k8', 'englisch', ['essay-writing'], 'Englisch Klausur — Essay Writing', '2026-08-24'],
  ['k9', 'biologie', ['oekosystem-wald'], 'Bio Klausur — Ökosystem Wald', '2026-08-13'],
  ['k10', 'geschichte', ['kalter-krieg'], 'Geschichte Klausur — Kalter Krieg', '2026-07-18'],
  [
    'k11',
    'mathematik',
    ['bruchrechnung', 'prozentrechnung'],
    'Mathe Klausur — Bruch- & Prozentrechnung',
    '2026-07-31',
  ],
];

interface ErgebnisZeile {
  thema: string;
  prozent: number;
  note: number;
  erklaerung: string;
  ampel: keyof typeof Ampel;
}
interface TkSeed {
  slug: string;
  klausur: string;
  fach: string;
  themaIds: string[];
  titel: string;
  erstelltDays: number;
  status: keyof typeof TestklausurStatus;
  aufgaben: { thema: string; frage: string }[];
  ergebnis: ErgebnisZeile[] | null;
}

const TESTKLAUSUREN: TkSeed[] = [
  {
    slug: 't1',
    klausur: 'k1',
    fach: 'mathematik',
    themaIds: ['bruchrechnung', 'prozentrechnung', 'flaechenberechnung'],
    titel: 'Testklausur 1 — Mathe Klausur 1 — 8. Klasse',
    erstelltDays: 4,
    status: 'analysiert',
    aufgaben: [
      {
        thema: 'bruchrechnung',
        frage: 'Kürze 168/294 vollständig und erkläre deinen Rechenweg in mindestens drei Sätzen.',
      },
      {
        thema: 'prozentrechnung',
        frage:
          'Ein Fahrrad kostet ursprünglich 420 €, im Sale 15% reduziert. Berechne den neuen Preis und erkläre deinen Rechenweg.',
      },
      {
        thema: 'flaechenberechnung',
        frage:
          'Berechne den Flächeninhalt eines Trapezes mit a = 8 cm, c = 5 cm und Höhe 4 cm. Erkläre die verwendete Formel.',
      },
    ],
    ergebnis: [
      {
        thema: 'bruchrechnung',
        prozent: 18,
        note: 5.1,
        ampel: 'rot',
        erklaerung:
          'Beim Kürzen fehlt der systematische Weg über den größten gemeinsamen Teiler — die Brüche wurden gar nicht oder nur um einen kleinen Faktor gekürzt. Dieses Thema sollte von Grund auf neu aufgebaut werden.',
      },
      {
        thema: 'prozentrechnung',
        prozent: 92,
        note: 1.4,
        ampel: 'gruen',
        erklaerung:
          'Sauber gelöst — Grundwert und Prozentsatz korrekt erkannt, Rechenweg nachvollziehbar erklärt.',
      },
      {
        thema: 'flaechenberechnung',
        prozent: 58,
        note: 3.1,
        ampel: 'gelb',
        erklaerung:
          'Die Trapezformel wurde richtig angewendet, aber bei der Höhe wurde ein Wert vertauscht — das Endergebnis stimmt dadurch nicht ganz.',
      },
    ],
  },
  {
    slug: 't2',
    klausur: 'k4',
    fach: 'englisch',
    themaIds: ['vocabulary-environment', 'simple-past-present-perfect'],
    titel: 'Testklausur 1 — Englisch Vocabulary Test',
    erstelltDays: 7,
    status: 'analysiert',
    aufgaben: [
      {
        thema: 'vocabulary-environment',
        frage:
          'Write four sentences about climate change using at least six vocabulary words from this topic.',
      },
      {
        thema: 'simple-past-present-perfect',
        frage:
          'Fill in the correct tense: "I ___ (visit) Berlin three times." and "Yesterday I ___ (visit) the museum." Explain your choice.',
      },
    ],
    ergebnis: [
      {
        thema: 'vocabulary-environment',
        prozent: 94,
        note: 1.3,
        ampel: 'gruen',
        erklaerung: 'Wortschatz sicher und im richtigen Kontext angewendet.',
      },
      {
        thema: 'simple-past-present-perfect',
        prozent: 38,
        note: 4.1,
        ampel: 'rot',
        erklaerung:
          'Simple Past und Present Perfect werden noch durcheinandergebracht — die Signalwörter („yesterday", „three times") führen nicht zuverlässig zur richtigen Zeitform. Grundlegend wiederholen.',
      },
    ],
  },
  {
    slug: 't3',
    klausur: 'k6',
    fach: 'geschichte',
    themaIds: ['weimarer-republik'],
    titel: 'Testklausur 1 — Geschichte Klausur — Weimarer Republik',
    erstelltDays: 14,
    status: 'analysiert',
    aufgaben: [
      {
        thema: 'weimarer-republik',
        frage:
          'Erkläre zwei zentrale Krisen der Weimarer Republik zwischen 1919 und 1923 und ihre Folgen.',
      },
    ],
    ergebnis: [
      {
        thema: 'weimarer-republik',
        prozent: 55,
        note: 3.3,
        ampel: 'gelb',
        erklaerung:
          'Die beiden Krisen (Ruhrbesetzung, Hyperinflation) sind benannt, aber die Folgen bleiben oberflächlich — der Zusammenhang zwischen Geldentwertung und dem Vertrauensverlust in die Demokratie fehlt.',
      },
    ],
  },
  {
    slug: 't4',
    klausur: 'k3',
    fach: 'deutsch',
    themaIds: ['gedichtanalyse'],
    titel: 'Testklausur 1 — Deutsch Klausur — Gedichtanalyse',
    erstelltDays: 1,
    status: 'geloest',
    aufgaben: [
      {
        thema: 'gedichtanalyse',
        frage:
          'Analysiere Metrum und Reimschema der ersten Strophe von Goethes „Willkommen und Abschied" und beschreibe die Wirkung.',
      },
    ],
    ergebnis: null,
  },
  {
    slug: 't5',
    klausur: 'k5',
    fach: 'biologie',
    themaIds: ['zellbiologie', 'genetik-vererbung'],
    titel: 'Testklausur 1 — Bio Klausur — Zellbiologie & Genetik',
    erstelltDays: 3,
    status: 'analysiert',
    aufgaben: [
      {
        thema: 'zellbiologie',
        frage:
          'Beschreibe drei Zellorganellen und ihre Funktion im Vergleich Tier- vs. Pflanzenzelle.',
      },
      {
        thema: 'genetik-vererbung',
        frage: 'Erkläre anhand eines Kreuzungsschemas die 1. Mendelsche Regel.',
      },
    ],
    ergebnis: [
      {
        thema: 'zellbiologie',
        prozent: 88,
        note: 1.6,
        ampel: 'gruen',
        erklaerung:
          'Zellorganellen und ihre Funktionen sicher im Vergleich Tier-/Pflanzenzelle erklärt.',
      },
      {
        thema: 'genetik-vererbung',
        prozent: 82,
        note: 1.9,
        ampel: 'gruen',
        erklaerung:
          'Die 1. Mendelsche Regel wird am Kreuzungsschema korrekt hergeleitet, Uniformität sauber begründet.',
      },
    ],
  },
  {
    slug: 't6',
    klausur: 'k2',
    fach: 'mathematik',
    themaIds: ['lineare-gleichungen'],
    titel: 'Testklausur 1 — Mathe Klausur 2 — Lineare Gleichungen',
    erstelltDays: 0,
    status: 'erstellt',
    aufgaben: [
      {
        thema: 'lineare-gleichungen',
        frage:
          'Löse das Gleichungssystem: x + y = 34, x − y = 8. Zeige deinen Lösungsweg Schritt für Schritt.',
      },
    ],
    ergebnis: null,
  },
  {
    slug: 't2b',
    klausur: 'k4',
    fach: 'englisch',
    themaIds: ['simple-past-present-perfect'],
    titel: 'Testklausur 2 — Englisch Vocabulary Test',
    erstelltDays: 3,
    status: 'analysiert',
    aufgaben: [
      {
        thema: 'simple-past-present-perfect',
        frage:
          'Fill in the correct tense and explain: "She ___ (live) in Kiel since 2019." / "Last summer we ___ (travel) to Sweden."',
      },
    ],
    ergebnis: [
      {
        thema: 'simple-past-present-perfect',
        prozent: 61,
        note: 3.0,
        ampel: 'gelb',
        erklaerung:
          'Deutlich besser als beim ersten Versuch — Present Perfect für Erfahrungen sitzt jetzt meistens. Bei „last summer" kippt die Zeitform aber noch gelegentlich ins Present Perfect.',
      },
    ],
  },
  {
    slug: 't3b',
    klausur: 'k6',
    fach: 'geschichte',
    themaIds: ['weimarer-republik'],
    titel: 'Testklausur 2 — Geschichte Klausur — Weimarer Republik',
    erstelltDays: 5,
    status: 'analysiert',
    aufgaben: [
      {
        thema: 'weimarer-republik',
        frage:
          'Erläutere die Ursache-Folge-Kette von den Reparationen bis zur Hyperinflation 1923 und ihre Wirkung auf das Vertrauen in die Demokratie.',
      },
    ],
    ergebnis: [
      {
        thema: 'weimarer-republik',
        prozent: 78,
        note: 2.1,
        ampel: 'gruen',
        erklaerung:
          'Jetzt mit klarer Ursache-Folge-Kette: Reparationen → Ruhrbesetzung → Gelddruck → Hyperinflation → Radikalisierung. Das sitzt.',
      },
    ],
  },
];

const lzAbschnitt = (name: string) =>
  `### ${name}\nWichtigste Regel, typischer Fehler und ein Merksatz zu ${name} — automatisch aus deinen Chats und Dateien zu diesem Thema zusammengefasst.`;

interface LpSeed {
  slug: string;
  klausur: string;
  tk1: string;
  tk2: string | null;
  tageErledigt: number[];
  erstelltDays: number;
  lernzettel: { abschnitte: string[]; aktualisiertDays: number } | null;
}
const LERNPLAENE: LpSeed[] = [
  {
    slug: 'lp1',
    klausur: 'k1',
    tk1: 't1',
    tk2: null,
    tageErledigt: [2],
    erstelltDays: 4,
    lernzettel: { abschnitte: ['Bruchrechnung', 'Flächenberechnung'], aktualisiertDays: 2 },
  },
  {
    slug: 'lp2',
    klausur: 'k2',
    tk1: 't6',
    tk2: null,
    tageErledigt: [],
    erstelltDays: 0,
    lernzettel: null,
  },
  {
    slug: 'lp3',
    klausur: 'k3',
    tk1: 't4',
    tk2: null,
    tageErledigt: [],
    erstelltDays: 1,
    lernzettel: null,
  },
  {
    slug: 'lp4',
    klausur: 'k4',
    tk1: 't2',
    tk2: 't2b',
    tageErledigt: [2, 3, 4],
    erstelltDays: 7,
    lernzettel: {
      abschnitte: [
        'Simple Past vs. Present Perfect',
        'Simple Past vs. Present Perfect',
        'Simple Past vs. Present Perfect',
      ],
      aktualisiertDays: 2,
    },
  },
  {
    slug: 'lp5',
    klausur: 'k5',
    tk1: 't5',
    tk2: null,
    tageErledigt: [],
    erstelltDays: 3,
    lernzettel: null,
  },
  {
    slug: 'lp6',
    klausur: 'k6',
    tk1: 't3',
    tk2: 't3b',
    tageErledigt: [2, 3, 4, 6, 7],
    erstelltDays: 14,
    lernzettel: { abschnitte: ['Weimarer Republik', 'Weimarer Republik'], aktualisiertDays: 4 },
  },
];

const DEMO_EMAIL = 'demo@lesify.local';

async function main() {
  // idempotent: den vorhandenen Demo-User (per stabiler E-Mail) samt allem
  // Abhängigen entfernen (Cascade), dann frisch anlegen.
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } });

  const aboId = uid('demo-abo');
  const naechsterErster = new Date(now);
  naechsterErster.setMonth(naechsterErster.getMonth() + 1, 1);

  await prisma.user.create({
    data: {
      id: DEMO,
      name: 'Jannik B.',
      klassenstufe: '8. Klasse',
      email: DEMO_EMAIL,
      rolle: Rolle.schueler,
      passwordHash: 'seed:not-a-real-hash',
      emailVerifiedAt: daysAgo(30),
      createdAt: daysAgo(30),
      einstellungen: {
        create: {
          erinnerungVorKlausuren: true,
          woechentlicheZusammenfassung: false,
          kiTonfall: KiTonfall.freundlich,
        },
      },
      ownedAbos: {
        create: {
          id: aboId,
          paket: AboPaket.premium,
          art: AboArt.einzel,
          sitze: 1,
          intervall: AboIntervall.monatlich,
          status: AboStatus.aktiv,
          aktuellerZeitraumEnde: naechsterErster,
          erstelltAm: daysAgo(30),
        },
      },
    },
  });
  await prisma.user.update({ where: { id: DEMO }, data: { aboId } });

  // Usage laufender Monat (SEED.usage; Limits = Premium-Tarif, PLAN_LIMITS)
  await prisma.usage.create({
    data: {
      userId: DEMO,
      monat: new Date().toISOString().slice(0, 7),
      nachrichtenUsed: 168,
      nachrichtenLimit: 250,
      dateienUsed: 24,
      dateienLimit: 50,
      lernzettelUsed: 7,
      lernzettelLimit: 15,
      testklausurenUsed: 2,
      testklausurenLimit: 5,
    },
  });

  for (const f of FAECHER) {
    await prisma.fach.create({
      data: {
        id: uid(`fach:${f.slug}`),
        userId: DEMO,
        name: f.name,
        klasse: f.klasse,
        initial: f.initial,
        farbe: f.farbe,
        icon: f.icon,
      },
    });
  }

  for (const [slug, fach, name, beschreibung] of THEMEN) {
    await prisma.thema.create({
      data: {
        id: uid(`thema:${slug}`),
        userId: DEMO,
        fachId: uid(`fach:${fach}`),
        name,
        beschreibung,
      },
    });
  }

  for (const c of CHATS) {
    const themaId = uid(`thema:${c.thema}`);
    const t = THEMEN.find((x) => x[0] === c.thema)!;
    const fachId = uid(`fach:${t[1]}`);
    const chatId = uid(`chat:${c.slug}`);
    await prisma.chat.create({
      data: {
        id: chatId,
        userId: DEMO,
        fachId,
        themaId,
        titel: c.titel,
        modus: ChatModus[c.modus],
        erstelltAm: hoursAgo(c.updatedHours + c.messages.length),
        aktualisiertAm: hoursAgo(c.updatedHours),
      },
    });
    await prisma.nachricht.createMany({
      data: c.messages.map((m, i) => ({
        userId: DEMO,
        chatId,
        rolle: m.role === 'user' ? NachrichtRolle.user : NachrichtRolle.ai,
        text: m.text,
        erstelltAm: hoursAgo(c.updatedHours + c.messages.length - i),
        zaehltGegenLimit: m.role === 'user',
      })),
    });
  }

  for (const lz of LERNZETTEL) {
    const t = THEMEN.find((x) => x[0] === lz.thema)!;
    const lzId = uid(`lz:${lz.slug}`);
    await prisma.lernzettel.create({
      data: {
        id: lzId,
        userId: DEMO,
        fachId: uid(`fach:${t[1]}`),
        themaId: uid(`thema:${lz.thema}`),
        titel: lz.titel,
        content: lz.content,
        erstelltAm: daysAgo(lz.updatedDays + 1),
        aktualisiertAm: daysAgo(lz.updatedDays),
      },
    });
    if (lz.revisionen.length) {
      await prisma.lernzettelRevision.createMany({
        data: lz.revisionen.map((m, i) => ({
          userId: DEMO,
          lernzettelId: lzId,
          rolle: m.role === 'user' ? NachrichtRolle.user : NachrichtRolle.ai,
          text: m.text,
          erstelltAm: hoursAgo(lz.updatedDays * 24 + (lz.revisionen.length - i)),
        })),
      });
    }
  }

  for (const [slug, thema, name, typ, groesseBytes, updatedDays] of DATEIEN) {
    const t = THEMEN.find((x) => x[0] === thema)!;
    await prisma.datei.create({
      data: {
        id: uid(`datei:${slug}`),
        userId: DEMO,
        fachId: uid(`fach:${t[1]}`),
        themaId: uid(`thema:${thema}`),
        name,
        typ: DateiTyp[typ],
        groesseBytes,
        speicherPfad: `seed://${slug}/${name}`,
        status: DateiStatus.bereit,
        zusammenfassung: DATEI_SUMMARY[slug] ?? null,
        erstelltAm: daysAgo(updatedDays),
      },
    });
  }

  for (const [slug, fach, themaSlugs, titel, datum] of KLAUSUREN) {
    await prisma.klausur.create({
      data: {
        id: uid(`klausur:${slug}`),
        userId: DEMO,
        fachId: uid(`fach:${fach}`),
        themaIds: themaSlugs.map((s) => uid(`thema:${s}`)),
        titel,
        datum: new Date(datum),
      },
    });
  }

  for (const tk of TESTKLAUSUREN) {
    await prisma.testklausur.create({
      data: {
        id: uid(`tk:${tk.slug}`),
        userId: DEMO,
        klausurId: uid(`klausur:${tk.klausur}`),
        fachId: uid(`fach:${tk.fach}`),
        themaIds: tk.themaIds.map((s) => uid(`thema:${s}`)),
        titel: tk.titel,
        status: TestklausurStatus[tk.status],
        erstelltAm: daysAgo(tk.erstelltDays),
        aufgaben: {
          create: tk.aufgaben.map((a, i) => ({
            userId: DEMO,
            themaId: uid(`thema:${a.thema}`),
            frage: a.frage,
            reihenfolge: i,
          })),
        },
        ...(tk.ergebnis
          ? {
              ergebnisse: {
                create: tk.ergebnis.map((e) => ({
                  userId: DEMO,
                  themaId: uid(`thema:${e.thema}`),
                  prozent: e.prozent,
                  note: e.note,
                  erklaerung: e.erklaerung,
                })),
              },
              vorbereitung: {
                create: tk.ergebnis.map((e) => ({
                  userId: DEMO,
                  themaId: uid(`thema:${e.thema}`),
                  prozent: e.prozent,
                  note: e.note,
                  ampel: Ampel[e.ampel],
                })),
              },
            }
          : {}),
      },
    });
  }

  for (const lp of LERNPLAENE) {
    await prisma.lernplan.create({
      data: {
        id: uid(`lp:${lp.slug}`),
        userId: DEMO,
        klausurId: uid(`klausur:${lp.klausur}`),
        testklausur1Id: uid(`tk:${lp.tk1}`),
        testklausur2Id: lp.tk2 ? uid(`tk:${lp.tk2}`) : null,
        tageErledigt: lp.tageErledigt,
        erstelltAm: daysAgo(lp.erstelltDays),
        lernzettel: lp.lernzettel
          ? {
              content: `# Lernzettel\n\n${lp.lernzettel.abschnitte.map(lzAbschnitt).join('\n\n')}`,
              aktualisiertAm: daysAgo(lp.lernzettel.aktualisiertDays).toISOString(),
            }
          : undefined,
      },
    });
  }

  const counts = {
    faecher: FAECHER.length,
    themen: THEMEN.length,
    chats: CHATS.length,
    lernzettel: LERNZETTEL.length,
    dateien: DATEIEN.length,
    klausuren: KLAUSUREN.length,
    testklausuren: TESTKLAUSUREN.length,
    lernplaene: LERNPLAENE.length,
  };
  console.log('Seed fertig für Demo-User', DEMO, counts);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
