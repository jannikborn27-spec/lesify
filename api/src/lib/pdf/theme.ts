import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

/**
 * Gemeinsame Gestaltungswerte der Lesify-PDFs (Lernzettel + Testklausur).
 * Bewusst dieselbe Palette wie `app/assets/css/style.css` („Fog Blue"-Ink +
 * Fachfarbe als einziger Akzent), damit PDF und App wie ein Produkt wirken.
 */

export const INK = {
  950: '#101214',
  900: '#172128',
  800: '#25343f',
  700: '#384a57',
  600: '#516676',
  500: '#6e8494',
  400: '#889ba9',
  300: '#aab8c3',
  200: '#cbd4db',
  150: '#d8dee3',
  100: '#e2e7ea',
  50: '#edf1f3',
  paper: '#f8fafb',
} as const;

export interface FachFarbe {
  base: string;
  ink: string;
  bg: string;
}

/** Spiegel von `Lesify.FACH_COLORS` in `app/assets/js/data.js` — bei Änderungen dort hier nachziehen. */
const FACH_FARBEN: Record<string, FachFarbe> = {
  blue: { base: '#007dae', ink: '#00699c', bg: '#e5f5fd' },
  rose: { base: '#c4334f', ink: '#b6143f', bg: '#ffebec' },
  amber: { base: '#c26f00', ink: '#913b00', bg: '#ffeedd' },
  teal: { base: '#009176', ink: '#006e54', bg: '#e5f6f1' },
  terracotta: { base: '#985535', ink: '#89401c', bg: '#fdeee8' },
  violet: { base: '#654db6', ink: '#5031a1', bg: '#f1efff' },
  pink: { base: '#b84999', ink: '#931a77', bg: '#feecf7' },
  graphit: { base: '#516676', ink: '#101214', bg: '#edf1f3' },
};

export function fachFarbe(key: string | null | undefined): FachFarbe {
  return FACH_FARBEN[key ?? ''] ?? FACH_FARBEN.graphit!;
}

/** A4 in pt + Ränder der Basisvorlage. */
export const SEITE = {
  breite: 595.28,
  hoehe: 841.89,
  rand: { links: 56, rechts: 56, oben: 72, unten: 64 },
} as const;

const require = createRequire(import.meta.url);
const hier = dirname(fileURLToPath(import.meta.url));

/** `api/assets` — funktioniert aus `src/lib/pdf` (tsx) wie aus `dist/lib/pdf` (node). */
export const ASSET_DIR = join(hier, '..', '..', '..', 'assets');
export const LOGO_PFAD = join(ASSET_DIR, 'lesify-logo.png');

function font(paket: string, datei: string): string {
  return require.resolve(`@fontsource/${paket}/files/${datei}.woff`);
}

/** Alle eingebetteten Schriften (statische WOFF, latin — deckt ä ö ü ß und Typografie ab). */
export const SCHRIFTEN = {
  body: font('hanken-grotesk', 'hanken-grotesk-latin-400-normal'),
  bodyKursiv: font('hanken-grotesk', 'hanken-grotesk-latin-400-italic'),
  bodyFett: font('hanken-grotesk', 'hanken-grotesk-latin-700-normal'),
  bodyFettKursiv: font('hanken-grotesk', 'hanken-grotesk-latin-700-italic'),
  bodyMittel: font('hanken-grotesk', 'hanken-grotesk-latin-600-normal'),
  display: font('outfit', 'outfit-latin-600-normal'),
  displayFett: font('outfit', 'outfit-latin-700-normal'),
} as const;

export type SchriftName = keyof typeof SCHRIFTEN | 'mono';
