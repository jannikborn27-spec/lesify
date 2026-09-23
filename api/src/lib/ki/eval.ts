// `pnpm --filter @lesify/api ki:eval` — kleiner Bewertungs-Check für die
// Testklausur-Analyse (Call 11) gegen den echten Client. Feste Aufgaben +
// feste Schülerlösungen mit bekanntem Soll-Ergebnis; geprüft wird, ob die
// vergebene Prozentzahl im erwarteten Bereich liegt. Anlass: live vergab die
// Analyse 100 % für eine falsche Lösung (2026-09-23). Nach jeder Änderung an
// Prompt/Schema/Modell von Call 11 laufen lassen. Kostet ~4–5 ct je Lauf.
import 'dotenv/config';
import { env } from '../../env.js';
import { AnthropicKiClient } from './client.js';
import { testklausurAnalyseErzeugen } from './calls.js';
import { kostenEurMikroAus } from './kosten.js';

if (!env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY fehlt in api/.env.');
  process.exit(1);
}

let kostenMikro = 0;
const ki = new AnthropicKiClient(env.ANTHROPIC_API_KEY, (i) => {
  kostenMikro += kostenEurMikroAus(i.model, i.usage);
});

const aufgaben = [
  {
    themaId: 'bruch',
    themaName: 'Bruchrechnung',
    material:
      'Kürzen: Zähler und Nenner durch den ggT teilen. Erweitern: Zähler und Nenner mit derselben Zahl malnehmen. Addieren: erst gleichnamig machen, dann Zähler addieren.',
    frage:
      'a) Kürze den Bruch 24/36 so weit wie möglich.\nb) Erweitere den Bruch 3/7 mit der Zahl 4.\nc) Addiere 1/4 + 1/6. Mache die Brüche zunächst gleichnamig.',
  },
  {
    themaId: 'prozent',
    themaName: 'Prozentrechnung',
    material: 'Prozentwert = Grundwert × Prozentsatz. Ein Rabatt wird vom Grundwert abgezogen.',
    frage:
      'Ein Fahrrad kostet 250 Euro. Der Preis wird um 20 % reduziert. Berechne den neuen Preis.',
  },
];

const BRUCH_RICHTIG =
  'Aufgabe 1\na) 24/36 = 2/3\nb) 3/7 = 12/28\nc) 1/4 + 1/6 = 3/12 + 2/12 = 5/12';
const faelle: {
  name: string;
  loesung: string;
  erwartet: Record<string, [number, number]>;
}[] = [
  {
    name: 'Bruch richtig, Prozent falsch (Rabatt addiert)',
    loesung: `${BRUCH_RICHTIG}\n\nAufgabe 2\n20 % von 250 = 50\nneuer Preis = 250 + 50 = 300 Euro`,
    erwartet: { bruch: [90, 100], prozent: [0, 50] },
  },
  {
    name: 'alles richtig (Erweitern in anderer, korrekter Schreibweise)',
    loesung: `Aufgabe 1\na) 2/3\nb) (3·4)/(7·4) = 12/28\nc) 5/12\n\nAufgabe 2\n250 · 0,8 = 200 Euro`,
    erwartet: { bruch: [90, 100], prozent: [90, 100] },
  },
  {
    name: 'Prozent-Aufgabe fehlt komplett',
    loesung: BRUCH_RICHTIG,
    erwartet: { bruch: [90, 100], prozent: [0, 10] },
  },
  {
    name: 'Bruch teilweise (b falsch), Prozent richtig',
    loesung: `Aufgabe 1\na) 24/36 = 2/3\nb) 3/7 · 4 = 12/7\nc) 1/4 + 1/6 = 5/12\n\nAufgabe 2\n250 - 50 = 200 Euro`,
    erwartet: { bruch: [50, 80], prozent: [90, 100] },
  },
];

let fehler = 0;
for (const fall of faelle) {
  const erg = await testklausurAnalyseErzeugen(ki, {
    klassenstufe: '7. Klasse',
    fachName: 'Mathe',
    aufgaben,
    loesungsText: fall.loesung,
  });
  const teile = Object.entries(fall.erwartet).map(([themaId, [min, max]]) => {
    const p = erg.find((e) => e.themaId === themaId)?.prozent;
    const ok = p !== undefined && p >= min && p <= max;
    if (!ok) fehler += 1;
    return `${ok ? '✓' : '✗'} ${themaId} ${p ?? '—'} % (Soll ${min}–${max})`;
  });
  console.log(`${fall.name}\n   ${teile.join('   ')}`);
}
console.log(
  `\n${faelle.length} Fälle, ${fehler} Abweichung(en), Kosten ~${(kostenMikro / 1e6).toFixed(4)} € (Modell ${env.KI_MODELL_ANALYSE}).`,
);
process.exit(fehler ? 1 : 0);
