import { LesifyVorlage } from './basis.js';
import { rendereMarkdown } from './markdown.js';
import { INK } from './theme.js';

/**
 * Die beiden Lesify-PDF-Dokumente. Beide bauen auf `LesifyVorlage` auf; hier
 * steht nur, wie der erzeugte Inhalt in die Vorlage fließt. Die Mockups unter
 * `docs/pdf-mockups/` entstehen aus denselben Funktionen mit Beispieldaten
 * (`pnpm --filter @lesify/api pdf:mockups`) — so weicht ein echtes PDF nie
 * vom freigegebenen Design ab.
 */

const DATUM = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  timeZone: 'Europe/Berlin',
});

export interface LernzettelPdfDaten {
  titel: string;
  /** Markdown-Inhalt wie in `Lernzettel.content`. */
  content: string;
  fachName: string;
  fachFarbe: string;
  klasse?: string | null;
  themaName?: string | null;
  stand: Date;
}

export async function lernzettelPdf(d: LernzettelPdfDaten): Promise<Buffer> {
  const meta = [d.themaName ? `Thema: ${d.themaName}` : null, `Stand: ${DATUM.format(d.stand)}`]
    .filter(Boolean)
    .join('  ·  ');
  const v = new LesifyVorlage({
    dokumentTyp: 'Lernzettel',
    titel: d.titel,
    fachName: d.fachName,
    fachFarbeKey: d.fachFarbe,
    klasse: d.klasse,
    meta,
  });
  rendereMarkdown(v, d.content.trim() || '_(noch leer)_');
  return v.abschliessen();
}

export interface TestklausurPdfAufgabe {
  themaName: string;
  frage: string;
}

export interface TestklausurPdfDaten {
  titel: string;
  fachName: string;
  fachFarbe: string;
  klasse?: string | null;
  aufgaben: TestklausurPdfAufgabe[];
  erstelltAm: Date;
}

const ANTWORT_ZEILEN = 8;
const ZEILE_ABSTAND = 21;

export async function testklausurPdf(d: TestklausurPdfDaten): Promise<Buffer> {
  const v = new LesifyVorlage({
    dokumentTyp: 'Testklausur',
    titel: d.titel,
    fachName: d.fachName,
    fachFarbeKey: d.fachFarbe,
    klasse: d.klasse,
    meta: `${d.aufgaben.length} ${d.aufgaben.length === 1 ? 'Aufgabe' : 'Aufgaben'}  ·  Erstellt am ${DATUM.format(d.erstelltAm)}`,
  });
  const { doc } = v;

  // Namensfeld-Block (zum Ausfüllen)
  const feldY = doc.y;
  const felder: Array<[string, number]> = [
    ['Name', 0.46],
    ['Klasse', 0.2],
    ['Datum', 0.24],
  ];
  const luecke = 12;
  const nutzbar = v.inhaltBreite - luecke * (felder.length - 1);
  let x = v.links;
  for (const [label, anteil] of felder) {
    const b = (nutzbar * anteil) / felder.reduce((s, [, a]) => s + a, 0);
    v.schrift('bodyFett', 7.5);
    doc
      .fillColor(INK[500])
      .text(label.toUpperCase(), x, feldY, { width: b, characterSpacing: 1, lineBreak: false });
    doc
      .moveTo(x, feldY + 26)
      .lineTo(x + b, feldY + 26)
      .lineWidth(0.8)
      .strokeColor(INK[400])
      .stroke();
    x += b + luecke;
  }
  doc.y = feldY + 40;

  // Hinweisbox
  const hinweise = [
    'Löse die Aufgaben allein und ohne Lernzettel, Chat oder andere Hilfsmittel — so zeigt dir das Ergebnis ehrlich, wo du stehst.',
    'Schreibe deine Lösung in die Felder oder auf ein extra Blatt und lade sie danach als Foto oder PDF bei Lesify hoch.',
  ];
  v.schrift('body', 9.5);
  const breiteInnen = v.inhaltBreite - 40;
  const hHinweise = hinweise.reduce(
    (s, t) => s + doc.heightOfString(t, { width: breiteInnen - 12, lineGap: 2.5 }) + 5,
    0,
  );
  const boxH = 18 + 16 + hHinweise;
  v.platz(boxH);
  const bY = doc.y;
  doc.roundedRect(v.links, bY, v.inhaltBreite, boxH, 8).fill(v.farbe.bg);
  doc.rect(v.links, bY + 6, 3, boxH - 12).fill(v.farbe.base);
  v.schrift('bodyFett', 8);
  doc
    .fillColor(v.farbe.ink)
    .text('SO GEHT’S', v.links + 20, bY + 13, { characterSpacing: 1.2, lineBreak: false });
  let hy = bY + 30;
  for (const t of hinweise) {
    doc.circle(v.links + 23, hy + 5.5, 1.7).fill(v.farbe.base);
    v.schrift('body', 9.5);
    doc
      .fillColor(INK[800])
      .text(v.bereinige(t, 'body'), v.links + 32, hy, { width: breiteInnen - 12, lineGap: 2.5 });
    hy = doc.y + 5;
  }
  doc.y = bY + boxH + 22;

  // Aufgaben
  d.aufgaben.forEach((a, i) => {
    const frageTeil = v.bereinige(a.frage, 'body');
    v.schrift('body', 10.5);
    const frageH = doc.heightOfString(frageTeil, { width: v.inhaltBreite - 34, lineGap: 3.2 });
    // Kopf + Frage + mindestens 3 Antwortzeilen zusammenhalten
    v.platz(30 + frageH + ZEILE_ABSTAND * 3);

    const y = doc.y;
    doc.circle(v.links + 12, y + 12, 12).fill(v.farbe.base);
    v.schrift('displayFett', 12);
    doc
      .fillColor('#ffffff')
      .text(String(i + 1), v.links, y + 6.5, { width: 24, align: 'center', lineBreak: false });
    v.schrift('displayFett', 13);
    doc.fillColor(INK[950]).text(`Aufgabe ${i + 1}`, v.links + 34, y + 5, { lineBreak: false });
    const wt = doc.widthOfString(`Aufgabe ${i + 1}`);
    v.schrift('bodyFett', 8);
    const thema = v.bereinige(a.themaName, 'bodyFett');
    const cw = doc.widthOfString(thema) + 16;
    const cx = v.links + 34 + wt + 10;
    doc.roundedRect(cx, y + 5, cw, 15, 7.5).fill(v.farbe.bg);
    doc.fillColor(v.farbe.ink).text(thema, cx + 8, y + 9.2, { lineBreak: false });

    v.schrift('body', 10.5);
    doc
      .fillColor(INK[800])
      .text(frageTeil, v.links + 34, y + 32, { width: v.inhaltBreite - 34, lineGap: 3.2 });
    doc.y += 10;

    // Antwortlinien — restliche Seite nutzen, aber höchstens ANTWORT_ZEILEN
    for (let z = 0; z < ANTWORT_ZEILEN; z++) {
      if (doc.y + ZEILE_ABSTAND > v.untenLimit) break;
      doc.y += ZEILE_ABSTAND;
      doc
        .moveTo(v.links + 34, doc.y)
        .lineTo(v.links + v.inhaltBreite, doc.y)
        .lineWidth(0.5)
        .dash(1.5, { space: 2.5 })
        .strokeColor(INK[300])
        .stroke()
        .undash();
    }
    doc.y += 26;
  });

  return v.abschliessen();
}

/** Für Mockups/Tests: Markdown ohne Vorlage-Kopf direkt rendern (nicht produktiv genutzt). */
export { rendereMarkdown };
