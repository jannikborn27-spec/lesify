/**
 * @lesify/shared — framework-freie Konstanten & Formeln, die Frontend
 * (app/assets/js/data.js) und Backend (api/) teilen.
 * Referenz: backend-planning.md §0/§2.
 */

// Notenlogik + Lernplan-Statusberechnung (Phase 7, bit-genauer data.js-Port)
export * from './noten.js';
export * from './lernplan.js';

// --- Fach-Farben (data.js FACH_COLORS) ---
export const FACH_COLOR_KEYS = [
  'blue',
  'rose',
  'amber',
  'teal',
  'terracotta',
  'violet',
  'pink',
  'graphit',
] as const;
export type FachColorKey = (typeof FACH_COLOR_KEYS)[number];
export const FACH_COLOR_DEFAULT: FachColorKey = 'graphit'; // data.js: getFachColor-Fallback

// --- Fach-Vorlagen (data.js FACH_PRESETS) → gültige icon-Schlüssel ---
export const FACH_PRESETS: readonly { name: string; icon: string }[] = [
  { name: 'Mathematik', icon: 'mathematik' },
  { name: 'Deutsch', icon: 'deutsch' },
  { name: 'Englisch', icon: 'englisch' },
  { name: 'Französisch', icon: 'franzoesisch' },
  { name: 'Spanisch', icon: 'spanisch' },
  { name: 'Latein', icon: 'latein' },
  { name: 'Biologie', icon: 'biologie' },
  { name: 'Chemie', icon: 'chemie' },
  { name: 'Physik', icon: 'physik' },
  { name: 'Geschichte', icon: 'geschichte' },
  { name: 'Erdkunde', icon: 'erdkunde' },
  { name: 'Politik', icon: 'politik' },
  { name: 'Religion', icon: 'religion' },
  { name: 'Kunst', icon: 'kunst' },
  { name: 'Musik', icon: 'musik' },
  { name: 'Sport', icon: 'sport' },
  { name: 'Informatik', icon: 'informatik' },
  { name: 'Wirtschaft', icon: 'wirtschaft' },
] as const;
export const FACH_ICON_KEYS: readonly string[] = FACH_PRESETS.map((p) => p.icon);

// --- Tarif-Kontingente je Sitz/Monat (data.js PLAN_LIMITS, stripe-config.js limits) ---
export type Paket = 'starter' | 'premium' | 'infinite';
export interface PlanLimits {
  /** null = unbegrenzt */
  nachrichten: number | null;
  dateien: number;
  lernzettel: number;
  testklausuren: number;
}
export const PLAN_LIMITS: Record<Paket, PlanLimits> = {
  starter: { nachrichten: 100, dateien: 20, lernzettel: 5, testklausuren: 1 },
  premium: { nachrichten: 250, dateien: 50, lernzettel: 15, testklausuren: 5 },
  infinite: { nachrichten: null, dateien: 100, lernzettel: 50, testklausuren: 15 },
};
export const PLAN_NAMES: Record<Paket, string> = {
  starter: 'Starter',
  premium: 'Premium',
  infinite: 'Infinite',
};

/** Während der 14-Tage-Testphase gelten die Premium-Kontingente (Phase 0 / §7). */
export const TRIAL_PAKET: Paket = 'premium';

/** Nächster Monatserster ab `ab` — Usage-Reset (§7, fix zum 1.). */
export function naechsterMonatsErster(ab: Date = new Date()): Date {
  return new Date(Date.UTC(ab.getUTCFullYear(), ab.getUTCMonth() + 1, 1));
}

/** Monatsschlüssel YYYY-MM (Usage.monat). */
export function monatsSchluessel(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
