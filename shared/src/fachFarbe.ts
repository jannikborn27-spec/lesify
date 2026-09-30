/**
 * Eigene Fach-Farben (2026-09-30): `Fach.farbe` ist entweder ein Schlüssel aus
 * `FACH_COLOR_KEYS` oder ein frei gewählter Hex-Wert `#rrggbb` (Farbwähler).
 * Für Hex-Werte werden `ink` (Text) und `bg` (Fläche) hier abgeleitet — gleiche
 * Rechnung wie `fachFarbeAusHex` in `app/assets/js/api.js`/`data.js`.
 */

export const FACH_FARBE_HEX = /^#[0-9a-f]{6}$/i;

export interface FachFarbeWerte {
  base: string;
  ink: string;
  bg: string;
}

type Rgb = [number, number, number];

function rgbAusHex(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hexAusRgb(rgb: Rgb): string {
  return '#' + rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
}

function luminanz(rgb: Rgb): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function kontrast(a: Rgb, b: Rgb): number {
  const la = luminanz(a);
  const lb = luminanz(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * `bg` = 10 % der Farbe auf Weiß (wie die Pastellflächen der Palette),
 * `ink` = die Farbe so weit abgedunkelt, bis sie auf `bg` mindestens 4,5:1
 * Kontrast hat (WCAG AA) — auch helle Farben wie Gelb bleiben lesbar.
 */
export function fachFarbeAusHex(hex: string): FachFarbeWerte {
  const base = rgbAusHex(hex);
  const bg: Rgb = [0, 1, 2].map((i) => 255 - (255 - base[i]!) * 0.1) as Rgb;
  let ink: Rgb = base;
  for (let k = 0.15; k <= 1.0001; k += 0.05) {
    ink = base.map((c) => c * (1 - k)) as Rgb;
    if (kontrast(ink, bg) >= 4.5) break;
  }
  return { base: hex.toLowerCase(), ink: hexAusRgb(ink), bg: hexAusRgb(bg) };
}
