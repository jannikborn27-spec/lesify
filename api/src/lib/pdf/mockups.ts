import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  lernzettelPdf,
  testklausurPdf,
  type LernzettelPdfDaten,
  type TestklausurPdfDaten,
} from './dokumente.js';

/**
 * Beispieldaten + Generator für die Design-Mockups (`docs/pdf-mockups/*.pdf`).
 * Ein Mockup ist nichts anderes als die echte Vorlage, gefüllt mit Beispieltext
 * — es zeigt also verbindlich, wie jedes erzeugte Lernzettel-/Testklausur-PDF
 * aussieht. Neu erzeugen: `pnpm --filter @lesify/api pdf:mockups`.
 */

export const BEISPIEL_LERNZETTEL: LernzettelPdfDaten = {
  titel: 'Bruchrechnung — alles auf einen Blick',
  fachName: 'Mathematik',
  fachFarbe: 'blue',
  klasse: '6. Klasse',
  themaName: 'Bruchrechnung',
  stand: new Date('2026-09-19T10:00:00+02:00'),
  content: `## Das Wichtigste in Kürze

Ein **Bruch** beschreibt einen Teil eines Ganzen. Der **Zähler** sagt, wie viele Teile du hast, der **Nenner**, in wie viele gleich große Teile das Ganze zerlegt wurde.

> **Merke:** Durch null darf man nie teilen — der Nenner eines Bruchs ist deshalb immer ungleich 0.

## Brüche erweitern und kürzen

Beim **Erweitern** multiplizierst du Zähler und Nenner mit derselben Zahl, beim **Kürzen** teilst du beide durch dieselbe Zahl. Der Wert des Bruchs ändert sich dabei nicht.

- Erweitern: 2/3 = 4/6 (mit 2 erweitert)
- Kürzen: 12/18 = 2/3 (durch 6 gekürzt)
- Gekürzt ist ein Bruch, wenn Zähler und Nenner keinen gemeinsamen Teiler mehr haben

### Brüche addieren und subtrahieren

1. Bringe die Brüche auf den **gleichen Nenner** (Hauptnenner).
2. Addiere bzw. subtrahiere nur die **Zähler**, der Nenner bleibt.
3. Kürze das Ergebnis, wenn möglich.

| Rechenart | Regel | Beispiel |
| --- | --- | --- |
| Addieren | gleicher Nenner, Zähler addieren | 1/4 + 2/4 = 3/4 |
| Subtrahieren | gleicher Nenner, Zähler subtrahieren | 5/6 − 1/6 = 4/6 = 2/3 |
| Multiplizieren | Zähler · Zähler, Nenner · Nenner | 2/3 · 3/5 = 6/15 = 2/5 |
| Dividieren | mit dem Kehrbruch multiplizieren | 1/2 : 3/4 = 1/2 · 4/3 = 2/3 |

## Gemischte Zahlen

Eine gemischte Zahl wie 2 1/3 besteht aus einer ganzen Zahl und einem Bruch. Zum Rechnen wandelst du sie in einen **unechten Bruch** um: 2 1/3 = (2 · 3 + 1)/3 = 7/3.

## Typische Fehler

- Beim Addieren die Nenner mitaddieren (1/4 + 1/4 ≠ 2/8)
- Beim Dividieren den Kehrbruch vergessen
- Das Ergebnis nicht gekürzt

## Checkliste vor der Klausur

- [x] Ich kann Brüche erweitern und kürzen
- [x] Ich kann Brüche addieren und subtrahieren
- [ ] Ich kann Brüche multiplizieren und dividieren
- [ ] Ich kann gemischte Zahlen umwandeln

## Übungsbeispiel

Berechne 3/4 + 5/6 und gib das Ergebnis als gemischte Zahl an.

\`\`\`
Hauptnenner: 12
3/4 = 9/12    5/6 = 10/12
9/12 + 10/12 = 19/12 = 1 7/12
\`\`\`
`,
};

export const BEISPIEL_TESTKLAUSUR: TestklausurPdfDaten = {
  titel: 'Testklausur 1 — Bruchrechnung & Gleichungen',
  fachName: 'Mathematik',
  fachFarbe: 'blue',
  klasse: '6. Klasse',
  erstelltAm: new Date('2026-09-19T10:00:00+02:00'),
  aufgaben: [
    {
      themaName: 'Bruchrechnung',
      frage:
        'Berechne 3/4 + 5/6 und gib das Ergebnis vollständig gekürzt als gemischte Zahl an. Schreibe deinen Rechenweg auf.',
    },
    {
      themaName: 'Bruchrechnung',
      frage:
        'Erkläre in eigenen Worten, was es bedeutet, einen Bruch zu erweitern und zu kürzen. Erkläre, warum sich der Wert des Bruchs dabei nicht verändert, und zeige es an 12/18.',
    },
    {
      themaName: 'Gleichungen',
      frage: 'Löse die Gleichung 3x + 7 = 22 Schritt für Schritt und mache am Ende die Probe.',
    },
    {
      themaName: 'Textaufgaben',
      frage:
        'Eine Klasse hat 28 Schüler. 3/7 von ihnen fahren mit dem Bus zur Schule, die übrigen kommen zu Fuß oder mit dem Rad. Wie viele Schüler fahren mit dem Bus, wie viele nicht? Schreibe einen Antwortsatz.',
    },
  ],
};

async function main(): Promise<void> {
  const ziel = join(
    dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    '..',
    '..',
    'docs',
    'pdf-mockups',
  );
  await mkdir(ziel, { recursive: true });
  await writeFile(join(ziel, 'lernzettel-mockup.pdf'), await lernzettelPdf(BEISPIEL_LERNZETTEL));
  await writeFile(join(ziel, 'testklausur-mockup.pdf'), await testklausurPdf(BEISPIEL_TESTKLAUSUR));
  console.log(`Mockups geschrieben nach ${ziel}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
