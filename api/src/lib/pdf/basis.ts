import PDFDocument from 'pdfkit';
import {
  INK,
  LOGO_PFAD,
  SCHRIFTEN,
  SEITE,
  fachFarbe,
  type FachFarbe,
  type SchriftName,
} from './theme.js';

/**
 * Basisvorlage für jedes Lesify-PDF. Sie zeichnet den festen Rahmen —
 * Akzentbalken in Fachfarbe, Logo-Kopf, Laufkopf ab Seite 2, Fußzeile mit
 * Seitenzahl — und stellt Bausteine bereit, in die der jeweils erzeugte
 * Inhalt (KI-Text, Aufgaben) hineinfließt. Layout und Inhalt sind damit strikt
 * getrennt: neue Inhalte ändern nie das Design, Design-Änderungen passieren
 * nur hier.
 */

export interface VorlagenKopf {
  /** Dokumenttyp in Versalien rechts im Kopf, z. B. „LERNZETTEL". */
  dokumentTyp: string;
  titel: string;
  fachName: string;
  fachFarbeKey: string;
  klasse?: string | null;
  /** Kurze Metazeile unter dem Titel, z. B. „Thema: Bruchrechnung · Stand: 19.09.2026". */
  meta?: string;
}

export class LesifyVorlage {
  readonly doc: PDFKit.PDFDocument;
  readonly farbe: FachFarbe;
  private readonly chunks: Buffer[] = [];
  private readonly fertig: Promise<Buffer>;
  private readonly laufkopf: string;
  /** Glyphen-Cache je Schrift: verhindert „fehlende Zeichen"-Kästchen (Emoji, exotische Symbole). */
  private readonly glyphen = new Map<string, Set<number>>();

  constructor(private readonly kopf: VorlagenKopf) {
    this.farbe = fachFarbe(kopf.fachFarbeKey);
    this.laufkopf = `${kopf.dokumentTyp} · ${kopf.titel}`;
    this.doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: SEITE.rand.oben,
        bottom: SEITE.rand.unten,
        left: SEITE.rand.links,
        right: SEITE.rand.rechts,
      },
      bufferPages: true,
      info: { Title: kopf.titel, Author: 'Lesify', Creator: 'Lesify', Producer: 'Lesify' },
    });
    for (const [name, pfad] of Object.entries(SCHRIFTEN)) this.doc.registerFont(name, pfad);
    this.doc.on('data', (c: Buffer) => this.chunks.push(c));
    this.fertig = new Promise((resolve, reject) => {
      this.doc.on('end', () => resolve(Buffer.concat(this.chunks)));
      this.doc.on('error', reject);
    });

    this.seitenRahmen(true);
    this.doc.on('pageAdded', () => this.seitenRahmen(false));
    this.doc.x = SEITE.rand.links;
    this.doc.y = this.kopfBlock();
  }

  /* ── Geometrie ─────────────────────────────────────────────── */

  get inhaltBreite(): number {
    return SEITE.breite - SEITE.rand.links - SEITE.rand.rechts;
  }
  get links(): number {
    return SEITE.rand.links;
  }
  get untenLimit(): number {
    return SEITE.hoehe - SEITE.rand.unten;
  }
  /** Bricht auf eine neue Seite um, wenn `hoehe` nicht mehr auf die aktuelle passt. */
  platz(hoehe: number): void {
    if (this.doc.y + hoehe > this.untenLimit) this.doc.addPage();
  }

  /* ── Schrift ───────────────────────────────────────────────── */

  private aktSchrift: [SchriftName, number] = ['body', 10];

  schrift(name: SchriftName, groesse: number): this {
    this.aktSchrift = [name, groesse];
    this.doc.font(name === 'mono' ? 'Courier' : name).fontSize(groesse);
    return this;
  }

  /** Entfernt Zeichen, die die aktuelle Schrift nicht hat (Emoji …), und normalisiert Typografie. */
  bereinige(text: string, name: SchriftName): string {
    const ersatz: Record<string, string> = {
      '\u00a0': ' ',
      '\u2011': '-',
      '\u2713': '\u2714',
      '\u2717': '\u2718',
    };
    if (name === 'mono')
      return text.replace(/[^\x20-\xff\n\u2013\u2014\u2018-\u201e\u2022\u2026]/g, '?');
    let set = this.glyphen.get(name);
    if (!set) {
      set = new Set();
      this.glyphen.set(name, set);
    }
    let aus = '';
    for (const zeichen of text) {
      const cp = zeichen.codePointAt(0)!;
      if (cp < 0x20 && zeichen !== '\n') continue;
      const z = ersatz[zeichen] ?? zeichen;
      if (cp <= 0x7e || this.hatGlyphe(name, z.codePointAt(0)!, set)) aus += z;
      else {
        const f: Record<number, string> = {
          0x2192: '->',
          0x2260: '!=',
          0x2248: '~',
          0x2264: '<=',
          0x2265: '>=',
        };
        if (f[cp]) aus += f[cp];
      }
    }
    return aus;
  }

  private hatGlyphe(name: string, cp: number, cache: Set<number>): boolean {
    if (cache.has(cp)) return true;
    this.doc.font(name);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ok = !!(this.doc as any)._font?.font?.hasGlyphForCodePoint?.(cp);
    if (ok) cache.add(cp);
    return ok;
  }

  /* ── Rahmen ────────────────────────────────────────────────── */

  /** Fester Seitenrahmen: Akzentbalken oben, ab Seite 2 Laufkopf. */
  private seitenRahmen(erste: boolean): void {
    const { doc } = this;
    const m = doc.page.margins;
    const vorher = this.aktSchrift;
    doc.save();
    doc.rect(0, 0, SEITE.breite, 5).fill(this.farbe.base);
    if (!erste) {
      doc.fillColor(INK[400]);
      this.schrift('bodyMittel', 7.5);
      doc.text(this.bereinige(this.laufkopf.toUpperCase(), 'bodyMittel'), SEITE.rand.links, 30, {
        width: this.inhaltBreite,
        characterSpacing: 0.8,
        lineBreak: false,
        ellipsis: true,
      });
      doc
        .moveTo(SEITE.rand.links, 48)
        .lineTo(SEITE.breite - SEITE.rand.rechts, 48)
        .lineWidth(0.5)
        .strokeColor(INK[150])
        .stroke();
    }
    doc.restore();
    this.schrift(...vorher); // restore() stellt die Schrift nicht wieder her
    doc.page.margins = m;
    doc.x = SEITE.rand.links;
    doc.y = SEITE.rand.oben;
  }

  /** Kopfblock der ersten Seite; liefert die y-Position, ab der Inhalt beginnt. */
  private kopfBlock(): number {
    const { doc, kopf } = this;
    const x = SEITE.rand.links;
    const w = this.inhaltBreite;

    doc.image(LOGO_PFAD, x, 26, { width: 24 });
    doc.fillColor(INK[950]);
    this.schrift('displayFett', 14);
    doc.text('Lesify', x + 31, 30, { lineBreak: false });
    doc.fillColor(INK[500]);
    this.schrift('bodyFett', 7.5);
    doc.text(kopf.dokumentTyp.toUpperCase(), x, 33, {
      width: w,
      align: 'right',
      characterSpacing: 1.4,
      lineBreak: false,
    });
    doc
      .moveTo(x, 62)
      .lineTo(x + w, 62)
      .lineWidth(0.5)
      .strokeColor(INK[150])
      .stroke();

    // Fach-Chip
    let y = 80;
    const chipText = this.bereinige(
      kopf.klasse ? `${kopf.fachName} · ${kopf.klasse}` : kopf.fachName,
      'bodyFett',
    );
    this.schrift('bodyFett', 8.5);
    const chipB = doc.widthOfString(chipText) + 22;
    doc.roundedRect(x, y, chipB, 19, 9.5).fill(this.farbe.bg);
    doc.circle(x + 10, y + 9.5, 2.6).fill(this.farbe.base);
    doc.fillColor(this.farbe.ink).text(chipText, x + 18, y + 5.5, { lineBreak: false });

    // Titel
    y += 32;
    doc.fillColor(INK[950]);
    this.schrift('displayFett', 25);
    const titel = this.bereinige(kopf.titel, 'displayFett');
    doc.text(titel, x, y, { width: w, lineGap: 1 });
    y = doc.y + 6;

    if (kopf.meta) {
      doc.fillColor(INK[500]);
      this.schrift('body', 9.5);
      doc.text(this.bereinige(kopf.meta, 'body'), x, y, { width: w });
      y = doc.y + 4;
    }
    return y + 14;
  }

  /* ── Bausteine ─────────────────────────────────────────────── */

  /** Abschnittsüberschrift mit Fachfarben-Balken (Ebene 2) bzw. schlichtem Untertitel (Ebene 3). */
  ueberschrift(text: string, ebene: 1 | 2 | 3): void {
    const { doc } = this;
    const groesse = ebene === 1 ? 17 : ebene === 2 ? 14 : 11.5;
    const name: SchriftName = ebene === 3 ? 'bodyFett' : 'displayFett';
    const t = this.bereinige(text, name);
    this.schrift(name, groesse);
    const h = doc.heightOfString(t, { width: this.inhaltBreite - 12 });
    this.platz(h + (ebene === 3 ? 34 : 44)); // Überschrift nie allein am Seitenende
    doc.y += ebene === 3 ? 8 : 14;
    const y0 = doc.y;
    if (ebene !== 3) doc.rect(this.links, y0 + 2, 3, h - 4).fill(this.farbe.base);
    doc.fillColor(ebene === 3 ? INK[900] : this.farbe.ink);
    doc.text(t, this.links + (ebene === 3 ? 0 : 12), y0, {
      width: this.inhaltBreite - (ebene === 3 ? 0 : 12),
    });
    doc.y += ebene === 3 ? 3 : 6;
  }

  linie(farbe: string = INK[150]): void {
    const { doc } = this;
    this.platz(14);
    doc.y += 6;
    doc
      .moveTo(this.links, doc.y)
      .lineTo(this.links + this.inhaltBreite, doc.y)
      .lineWidth(0.5)
      .strokeColor(farbe)
      .stroke();
    doc.y += 8;
  }

  /** Beendet das Dokument: setzt die Fußzeile („lesify.de · Seite x von y") auf alle Seiten. */
  async abschliessen(): Promise<Buffer> {
    const { doc } = this;
    const { start, count } = doc.bufferedPageRange();
    for (let i = start; i < start + count; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0; // sonst würde Text in der Fußzeile eine neue Seite auslösen
      const y = SEITE.hoehe - 38;
      doc
        .moveTo(this.links, y - 8)
        .lineTo(this.links + this.inhaltBreite, y - 8)
        .lineWidth(0.5)
        .strokeColor(INK[150])
        .stroke();
      this.schrift('body', 8);
      doc
        .fillColor(INK[400])
        .text('Erstellt mit Lesify · lesify.de', this.links, y, { lineBreak: false });
      doc.fillColor(INK[500]).text(`Seite ${i - start + 1} von ${count}`, this.links, y, {
        width: this.inhaltBreite,
        align: 'right',
        lineBreak: false,
      });
    }
    doc.flushPages();
    doc.end();
    return this.fertig;
  }
}
