import type { FachColorKey } from '@lesify/shared';

/**
 * Fächer, die jedes neue Schüler-Konto (`POST /abo/kinder`) schon mitbringt
 * (Entscheidung 2026-09-30). Farben = die ersten drei `FACH_COLOR_KEYS`, damit
 * das nächste selbst angelegte Fach (`POST /faecher`, Farbe nach Anzahl) nicht
 * doppelt belegt. Bestandskonten ohne Fach bekommen sie per Migration
 * `20260930130000_standard_faecher`.
 */
export const STANDARD_FAECHER: readonly {
  name: string;
  initial: string;
  farbe: FachColorKey;
  icon: string;
}[] = [
  { name: 'Deutsch', initial: 'D', farbe: 'rose', icon: 'deutsch' },
  { name: 'Mathematik', initial: 'M', farbe: 'blue', icon: 'mathematik' },
  { name: 'Englisch', initial: 'E', farbe: 'amber', icon: 'englisch' },
];
