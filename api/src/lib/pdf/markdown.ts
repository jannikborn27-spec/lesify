import { Lexer, type Token, type Tokens } from 'marked';
import type { LesifyVorlage } from './basis.js';
import { INK, type SchriftName } from './theme.js';

/**
 * Rendert den Markdown-Inhalt (KI-Text von Lernzettel / Aufgaben) in eine
 * `LesifyVorlage`. Unterstützt, was die KI-Prompts erzeugen dürfen: Überschriften,
 * Absätze, Listen (auch verschachtelt + Checklisten), Zitate („Merke"-Boxen),
 * Tabellen, Code, Trennlinien sowie fett/kursiv/Code/Links inline.
 */

const TEXT = 10.5;
const ZEILE = 3.2; // zusätzlicher Zeilenabstand in pt

interface Lauf {
  text: string;
  fett?: boolean;
  kursiv?: boolean;
  code?: boolean;
}

function laeufe(tokens: Token[] | undefined, stil: Omit<Lauf, 'text'> = {}): Lauf[] {
  const aus: Lauf[] = [];
  for (const t of tokens ?? []) {
    switch (t.type) {
      case 'strong':
        aus.push(...laeufe((t as Tokens.Strong).tokens, { ...stil, fett: true }));
        break;
      case 'em':
        aus.push(...laeufe((t as Tokens.Em).tokens, { ...stil, kursiv: true }));
        break;
      case 'del':
        aus.push(...laeufe((t as Tokens.Del).tokens, stil));
        break;
      case 'codespan':
        aus.push({ ...stil, text: (t as Tokens.Codespan).text, code: true });
        break;
      case 'link':
        aus.push(...laeufe((t as Tokens.Link).tokens, stil));
        break;
      case 'br':
        aus.push({ ...stil, text: '\n' });
        break;
      case 'image':
        aus.push({ ...stil, text: (t as Tokens.Image).text });
        break;
      case 'text': {
        const tt = t as Tokens.Text;
        if (tt.tokens?.length) aus.push(...laeufe(tt.tokens, stil));
        else aus.push({ ...stil, text: decode(tt.text) });
        break;
      }
      case 'escape':
        aus.push({ ...stil, text: (t as Tokens.Escape).text });
        break;
      default: {
        const raw = (t as { text?: string; raw?: string }).text ?? (t as { raw?: string }).raw;
        if (raw) aus.push({ ...stil, text: decode(raw) });
      }
    }
  }
  return aus;
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function schriftFuer(l: Lauf, basisFett: boolean): SchriftName {
  if (l.code) return 'bodyFett'; // Courier würde die Baseline in Fließtext verschieben
  const fett = l.fett || basisFett;
  if (fett && l.kursiv) return 'bodyFettKursiv';
  if (fett) return 'bodyFett';
  if (l.kursiv) return 'bodyKursiv';
  return 'body';
}

export interface AbsatzOptionen {
  x?: number;
  breite?: number;
  groesse?: number;
  farbe?: string;
  basisFett?: boolean;
}

/** Schreibt gemischte Inline-Läufe als einen Absatz (Zeilenumbruch inklusive). */
export function schreibeInline(
  v: LesifyVorlage,
  tokens: Token[] | undefined,
  o: AbsatzOptionen = {},
): void {
  const { doc } = v;
  const x = o.x ?? v.links;
  const breite = o.breite ?? v.inhaltBreite;
  const groesse = o.groesse ?? TEXT;
  const teile = laeufe(tokens).filter((l) => l.text !== '');
  if (!teile.length) return;
  const start = doc.y;
  teile.forEach((l, i) => {
    const name = schriftFuer(l, !!o.basisFett);
    v.schrift(name, groesse);
    doc.fillColor(l.code ? v.farbe.ink : (o.farbe ?? INK[800]));
    const t = v.bereinige(l.text, name);
    const letzter = i === teile.length - 1;
    if (i === 0) doc.text(t, x, start, { width: breite, lineGap: ZEILE, continued: !letzter });
    else doc.text(t, { continued: !letzter });
  });
}

/** Höhe, die `schreibeInline` benötigt (für Boxen/Tabellen, die vor dem Zeichnen messen müssen). */
export function messeInline(
  v: LesifyVorlage,
  tokens: Token[] | undefined,
  breite: number,
  groesse = TEXT,
  basisFett = false,
): number {
  const { doc } = v;
  const teile = laeufe(tokens).filter((l) => l.text !== '');
  if (!teile.length) return 0;
  const name: SchriftName = basisFett ? 'bodyFett' : 'body';
  v.schrift(name, groesse);
  return doc.heightOfString(v.bereinige(teile.map((l) => l.text).join(''), name), {
    width: breite,
    lineGap: ZEILE,
  });
}

/* ── Blöcke ───────────────────────────────────────────────────── */

export function rendereMarkdown(v: LesifyVorlage, markdown: string): void {
  const tokens = new Lexer({ gfm: true, breaks: false }).lex(markdown.replace(/\r\n/g, '\n'));
  // Ein führendes „# Titel" steht schon im Kopf der Vorlage → nicht doppelt drucken.
  const erste = tokens.findIndex((t) => t.type !== 'space');
  if (
    erste >= 0 &&
    tokens[erste]!.type === 'heading' &&
    (tokens[erste] as Tokens.Heading).depth === 1
  )
    tokens.splice(erste, 1);
  rendereBloecke(v, tokens, { x: v.links, breite: v.inhaltBreite });
}

interface Spalte {
  x: number;
  breite: number;
}

function rendereBloecke(v: LesifyVorlage, tokens: Token[], sp: Spalte): void {
  const { doc } = v;
  for (const t of tokens) {
    switch (t.type) {
      case 'space':
        break;
      case 'heading': {
        const h = t as Tokens.Heading;
        // # im Inhalt ist der Dokumenttitel (steht schon im Kopf) → wie ## behandeln.
        v.ueberschrift(
          laeufe(h.tokens)
            .map((l) => l.text)
            .join(''),
          h.depth <= 2 ? 2 : 3,
        );
        break;
      }
      case 'paragraph': {
        const p = t as Tokens.Paragraph;
        const h = messeInline(v, p.tokens, sp.breite);
        v.platz(Math.min(h, TEXT * 3));
        schreibeInline(v, p.tokens, { x: sp.x, breite: sp.breite });
        doc.y += 7;
        break;
      }
      case 'text': {
        const p = t as Tokens.Text;
        schreibeInline(
          v,
          p.tokens ?? [{ type: 'text', raw: p.text, text: p.text } as Tokens.Text],
          { x: sp.x, breite: sp.breite },
        );
        doc.y += 4;
        break;
      }
      case 'list':
        rendereListe(v, t as Tokens.List, sp);
        doc.y += 4;
        break;
      case 'blockquote':
        rendereZitat(v, t as Tokens.Blockquote, sp);
        break;
      case 'table':
        rendereTabelle(v, t as Tokens.Table, sp);
        break;
      case 'code': {
        const c = t as Tokens.Code;
        const text = v.bereinige(c.text, 'mono');
        v.schrift('mono', 9);
        const h = doc.heightOfString(text, { width: sp.breite - 20, lineGap: 2 }) + 18;
        v.platz(Math.min(h, 120));
        const y = doc.y;
        doc.roundedRect(sp.x, y, sp.breite, h, 6).fill(INK[50]);
        doc.fillColor(INK[800]).text(text, sp.x + 10, y + 9, { width: sp.breite - 20, lineGap: 2 });
        doc.y = y + h + 8;
        break;
      }
      case 'hr':
        v.linie();
        break;
      case 'html':
        break;
      default:
        break;
    }
  }
}

/** ✅/❌ (bzw. ✓/✗) am Listenanfang → gezeichnetes Häkchen/Kreuz; entfernt das Zeichen aus dem Text. */
function statusIcon(kopf: Tokens.Text | Tokens.Paragraph | undefined): { ok: boolean } | null {
  const erstes = kopf?.tokens?.[0] as Tokens.Text | undefined;
  if (!erstes || erstes.type !== 'text') return null;
  const mm = /^\s*(\u2705|\u2714\ufe0f?|\u2713|\u274c|\u2716\ufe0f?|\u2717|\u274e)\s*/u.exec(
    erstes.text,
  );
  if (!mm) return null;
  erstes.text = erstes.text.slice(mm[0].length);
  return { ok: /[\u2705\u2714\u2713]/u.test(mm[1]!) };
}

function rendereListe(v: LesifyVorlage, liste: Tokens.List, sp: Spalte): void {
  const { doc } = v;
  const einzug = 16;
  let nr = typeof liste.start === 'number' ? liste.start : 1;
  for (const item of liste.items) {
    const tokens = item.tokens ?? [];
    const kopf = tokens.find((t) => t.type === 'text' || t.type === 'paragraph') as
      Tokens.Text | Tokens.Paragraph | undefined;
    const rest = tokens.filter((t) => t !== kopf && t.type !== 'space');
    const breite = sp.breite - einzug;
    const h = kopf ? messeInline(v, kopf.tokens, breite) : TEXT;
    v.platz(Math.min(h, TEXT * 2.6));

    const status = statusIcon(kopf);
    const y = doc.y;
    if (status) {
      const farbe = status.ok ? '#2f8f5b' : '#c1443c';
      doc.circle(sp.x + 5, y + 6, 5.2).fill(farbe);
      doc.lineWidth(1.2).strokeColor('#ffffff');
      if (status.ok)
        doc
          .moveTo(sp.x + 2.8, y + 6.2)
          .lineTo(sp.x + 4.5, y + 7.9)
          .lineTo(sp.x + 7.6, y + 4.2)
          .stroke();
      else
        doc
          .moveTo(sp.x + 3, y + 4)
          .lineTo(sp.x + 7, y + 8)
          .moveTo(sp.x + 7, y + 4)
          .lineTo(sp.x + 3, y + 8)
          .stroke();
    } else if (item.task) {
      doc
        .roundedRect(sp.x + 1, y + 1.5, 9, 9, 2)
        .lineWidth(0.9)
        .strokeColor(v.farbe.base)
        .stroke();
      if (item.checked) {
        doc
          .moveTo(sp.x + 3, y + 6)
          .lineTo(sp.x + 5, y + 8.2)
          .lineTo(sp.x + 8.5, y + 3.8)
          .lineWidth(1.3)
          .strokeColor(v.farbe.base)
          .stroke();
      }
    } else if (liste.ordered) {
      v.schrift('bodyFett', TEXT - 0.5);
      doc
        .fillColor(v.farbe.ink)
        .text(`${nr}.`, sp.x - 2, y, { width: einzug - 2, lineBreak: false });
    } else {
      doc.circle(sp.x + 4, y + 6, 1.9).fill(v.farbe.base);
    }
    doc.y = y;
    if (kopf) schreibeInline(v, kopf.tokens, { x: sp.x + einzug, breite });
    doc.y += 3;
    if (rest.length) rendereBloecke(v, rest, { x: sp.x + einzug, breite });
    nr++;
  }
}

function rendereZitat(v: LesifyVorlage, q: Tokens.Blockquote, sp: Spalte): void {
  const { doc } = v;
  const pad = 11;
  const innen = sp.breite - pad * 2 - 3;
  // Erst unsichtbar messen: gleiche Blöcke einmal mit Dummy-Zeichnen wäre teuer,
  // darum aus den Text-/Listenblöcken abschätzen.
  let h = pad * 2;
  for (const t of q.tokens) {
    if (t.type === 'paragraph' || t.type === 'text')
      h += messeInline(v, (t as Tokens.Paragraph).tokens, innen) + 6;
    else if (t.type === 'list') {
      for (const it of (t as Tokens.List).items) {
        const k = it.tokens.find((x) => x.type === 'text' || x.type === 'paragraph') as
          Tokens.Text | undefined;
        h += messeInline(v, k?.tokens, innen - 16) + 3;
      }
    }
  }
  v.platz(Math.min(h, 220));
  const y = doc.y;
  const hoehe = Math.min(h, v.untenLimit - y);
  doc.roundedRect(sp.x, y, sp.breite, hoehe, 7).fill(v.farbe.bg);
  doc.rect(sp.x, y + 4, 3, hoehe - 8).fill(v.farbe.base);
  doc.y = y + pad;
  rendereBloecke(v, q.tokens, { x: sp.x + pad + 3, breite: innen });
  // Bei Seitenumbruch im Zitat steht der Hintergrund nur auf der ersten Seite — akzeptabel für kurze „Merke"-Boxen.
  doc.y = Math.max(doc.y, y + hoehe) + 4;
}

function rendereTabelle(v: LesifyVorlage, tab: Tokens.Table, sp: Spalte): void {
  const { doc } = v;
  const spalten = tab.header.length;
  const pad = 6;

  // Spaltenbreiten proportional zur längsten Zelle (min. 12 %), damit kurze Spalten schmal bleiben.
  const gewichte = tab.header.map((_, i) => {
    const laengen = [tab.header[i]!, ...tab.rows.map((r) => r[i]!)].map(
      (c) =>
        laeufe(c?.tokens)
          .map((l) => l.text)
          .join('').length,
    );
    return Math.max(6, Math.min(40, Math.max(...laengen)));
  });
  const summe = gewichte.reduce((a, b) => a + b, 0);
  const breiten = gewichte.map((g) => Math.max(sp.breite * 0.12, (g / summe) * sp.breite));
  const faktor = sp.breite / breiten.reduce((a, b) => a + b, 0);
  const w = breiten.map((b) => b * faktor);

  const zeile = (zellen: Tokens.TableCell[], kopf: boolean): void => {
    const hoehen = zellen.map((c, i) => messeInline(v, c.tokens, w[i]! - pad * 2, 9.5, kopf));
    const h = Math.max(...hoehen, 10) + pad * 2 - 2;
    v.platz(h + (kopf ? 22 : 0));
    const y = doc.y;
    let x = sp.x;
    zellen.forEach((c, i) => {
      if (kopf) doc.rect(x, y, w[i]!, h).fill(v.farbe.bg);
      doc.rect(x, y, w[i]!, h).lineWidth(0.5).strokeColor(INK[200]).stroke();
      doc.y = y + pad - 1;
      schreibeInline(v, c.tokens, {
        x: x + pad,
        breite: w[i]! - pad * 2,
        groesse: 9.5,
        basisFett: kopf,
        farbe: kopf ? v.farbe.ink : INK[800],
      });
      x += w[i]!;
    });
    doc.y = y + h;
  };

  v.platz(60);
  doc.y += 2;
  zeile(tab.header, true);
  for (const r of tab.rows) zeile(r, false);
  doc.y += 10;
  void spalten;
}
