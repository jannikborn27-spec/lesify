/**
 * Notenlogik — bit-genauer Port aus app/assets/js/data.js (§2 backend-planning).
 * Deutsche Skala 1 (sehr gut) … 6 (ungenügend). NICHT anfassen, ohne data.js
 * gleichzeitig anzupassen (Paritäts-Tests in shared/src/noten.test.ts).
 */

export const AMPEL_GRUEN_MAX_NOTE = 2.5;
export const AMPEL_GELB_MAX_NOTE = 4.0;

export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** `6 − prozent/100 × 5`, auf eine Nachkommastelle gerundet. */
export function prozentZuNote(prozent: number): number {
  const note = 6 - (clamp(prozent, 0, 100) / 100) * 5;
  return Math.round(note * 10) / 10;
}

export type Ampel = 'gruen' | 'gelb' | 'rot';

/** ≤2.5 grün · ≤4.0 gelb · sonst rot */
export function noteAmpel(note: number): Ampel {
  if (note <= AMPEL_GRUEN_MAX_NOTE) return 'gruen';
  if (note <= AMPEL_GELB_MAX_NOTE) return 'gelb';
  return 'rot';
}

export function noteLabel(note: number): string {
  if (note <= 1.5) return 'sehr gut';
  if (note <= 2.5) return 'gut';
  if (note <= 3.5) return 'befriedigend';
  if (note <= 4.5) return 'ausreichend';
  if (note <= 5.5) return 'mangelhaft';
  return 'ungenügend';
}

/** Lernplan-Sprech für die drei Ampel-Stufen (stark / wackelig / schwach). */
export const TIER_LABEL: Record<Ampel, string> = {
  gruen: 'stark',
  gelb: 'wackelig',
  rot: 'schwach',
};
export function tierLabel(ampel: Ampel): string {
  return TIER_LABEL[ampel] ?? ampel;
}
