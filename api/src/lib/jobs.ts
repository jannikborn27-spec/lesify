import type { PrismaClient } from '@prisma/client';
import { monatsSchluessel } from '@lesify/shared';

/**
 * Wiederkehrende Wartungs-Jobs (Phase 10). Reine Funktionen — der echte
 * Scheduler (Hosting-Cron / pg_cron / Worker) ruft sie auf (Phase 16). Alle
 * Jobs sind idempotent und geben eine Zusammenfassung fürs Logging zurück.
 */

/** Aufbewahrungsfrist für Inhalte: 1 Jahr nach Erstellung (Phase 0 / §6). */
export const AUFBEWAHRUNG_TAGE = 365;
/** Usage-Zeilen so viele Monate zurück behalten (Rest ist totes Gewicht). */
export const USAGE_HISTORIE_MONATE = 12;

function vorTagen(tage: number, jetzt: Date): Date {
  const d = new Date(jetzt);
  d.setUTCDate(d.getUTCDate() - tage);
  return d;
}

function monatMinus(monate: number, jetzt: Date): string {
  const d = new Date(Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth() - monate, 1));
  return monatsSchluessel(d);
}

export interface LoeschStatistik {
  stichtag: string;
  lernplaene: number;
  testklausuren: number;
  klausuren: number;
  chats: number;
  lernzettel: number;
  dateien: number;
}

/**
 * Löscht **alle Inhalte**, die älter als ein Jahr sind: Lernpläne,
 * Testklausuren, Klausuren, Chats (+ Nachrichten), Lernzettel (+ Revisionen),
 * Dateien. Reihenfolge respektiert die FK-Abhängigkeiten
 * (Lernplan → Testklausur → Klausur). Kind-Tabellen (Aufgabe, Ergebnis,
 * Vorbereitungsstand, …) gehen per Cascade mit.
 *
 * Der zugehörige Objektspeicher wird ab Phase 5 mit gelöscht (die
 * `speicherPfad`-Keys der betroffenen Dateien vorher einsammeln).
 */
export async function inhalteAelterAlsEinJahrLoeschen(
  prisma: PrismaClient,
  jetzt: Date = new Date(),
): Promise<LoeschStatistik> {
  const cutoff = vorTagen(AUFBEWAHRUNG_TAGE, jetzt);
  const alt = { erstelltAm: { lt: cutoff } };

  return prisma.$transaction(async (tx) => {
    const lernplaene = (await tx.lernplan.deleteMany({ where: alt })).count;
    const testklausuren = (await tx.testklausur.deleteMany({ where: alt })).count;
    const klausuren = (await tx.klausur.deleteMany({ where: alt })).count;
    const chats = (await tx.chat.deleteMany({ where: alt })).count;
    const lernzettel = (await tx.lernzettel.deleteMany({ where: alt })).count;
    const dateien = (await tx.datei.deleteMany({ where: alt })).count;
    return {
      stichtag: cutoff.toISOString(),
      lernplaene,
      testklausuren,
      klausuren,
      chats,
      lernzettel,
      dateien,
    };
  });
}

/** Entfernt Usage-Zeilen, die älter als {@link USAGE_HISTORIE_MONATE} sind. */
export async function alteUsageZeilenLoeschen(
  prisma: PrismaClient,
  jetzt: Date = new Date(),
): Promise<{ stichtagMonat: string; geloescht: number }> {
  const stichtagMonat = monatMinus(USAGE_HISTORIE_MONATE, jetzt);
  const { count } = await prisma.usage.deleteMany({ where: { monat: { lt: stichtagMonat } } });
  return { stichtagMonat, geloescht: count };
}

/** Abgelaufene Sessions und Einmal-Token aufräumen (Hygiene, kein Datenschutz). */
export async function abgelaufeneTokenLoeschen(
  prisma: PrismaClient,
  jetzt: Date = new Date(),
): Promise<{ sessions: number; verificationTokens: number }> {
  const sessions = (await prisma.session.deleteMany({ where: { ablaeuftAm: { lt: jetzt } } }))
    .count;
  const verificationTokens = (
    await prisma.verificationToken.deleteMany({ where: { ablaeuftAm: { lt: jetzt } } })
  ).count;
  return { sessions, verificationTokens };
}

export const JOBS = {
  'inhalte-aufbewahrung': inhalteAelterAlsEinJahrLoeschen,
  'usage-historie': alteUsageZeilenLoeschen,
  'token-hygiene': abgelaufeneTokenLoeschen,
} as const;

export type JobName = keyof typeof JOBS;
