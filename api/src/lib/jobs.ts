import type { PrismaClient } from '@prisma/client';
import { aboArtFuerSitze, aboPreis, monatsSchluessel } from '@lesify/shared';
import { getStorageGateway, type StorageGateway } from './storage.js';
import { getZahlungsGateway, type ZahlungsGateway } from './zahlung.js';
import { kiKostenAlarmPruefen } from './ki/kosten.js';

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
 * Der zugehörige Objektspeicher wird **nach** dem Commit aufgeräumt (die
 * `speicherPfad`-Keys der betroffenen Dateien werden vorher eingesammelt) —
 * Storage-Calls laufen nie innerhalb der DB-Transaktion. Ein fehlgeschlagener
 * Objekt-Löschversuch bricht den Job nicht ab (best effort, geloggt).
 */
export async function inhalteAelterAlsEinJahrLoeschen(
  prisma: PrismaClient,
  jetzt: Date = new Date(),
  storage: StorageGateway = getStorageGateway(),
): Promise<LoeschStatistik> {
  const cutoff = vorTagen(AUFBEWAHRUNG_TAGE, jetzt);
  const alt = { erstelltAm: { lt: cutoff } };

  const dateiKeys = (
    await prisma.datei.findMany({ where: alt, select: { speicherPfad: true } })
  ).map((d) => d.speicherPfad);

  const statistik = await prisma.$transaction(async (tx) => {
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

  try {
    await storage.loeschen(dateiKeys);
  } catch (err) {
    console.error(JSON.stringify({ jobStorageLoeschenFehler: true, err: String(err) }));
  }

  return statistik;
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

/**
 * Wendet geplante Sitzverringerungen an (Phase 12): sobald der laufende
 * Zeitraum vorbei ist **und** genug Kind-Profile entfernt wurden
 * (`belegt <= geplanteSitze`), wird `Abo.sitze` gesenkt. Solange noch zu viele
 * Kinder da sind, bleibt die Änderung stehen (der Job löscht **keine** Profile).
 *
 * **Muss** dabei auch den Preis bei Stripe senken (`zahlung.subscriptionAendern`)
 * — sonst bleibt die Stripe-Subscription für immer auf dem alten (höheren)
 * Sitzpreis stehen, obwohl lokal weniger Sitze berechnet werden. Bug
 * 2026-09-18: vorher schrieb der Job nur `Abo.sitze` in der eigenen DB, ohne
 * Stripe je zu informieren — bei jeder abgeschlossenen Sitzverringerung wäre
 * der Kunde dauerhaft zu viel belastet worden.
 */
export async function geplanteAboAenderungenAnwenden(
  prisma: PrismaClient,
  jetzt: Date = new Date(),
  zahlung: ZahlungsGateway = getZahlungsGateway(),
): Promise<{ angewendet: number; wartetAufKindLoeschung: number }> {
  const faellig = await prisma.abo.findMany({
    where: { geplanteSitze: { not: null }, aktuellerZeitraumEnde: { lte: jetzt } },
  });
  let angewendet = 0;
  let wartet = 0;
  for (const abo of faellig) {
    const belegt = await prisma.user.count({ where: { parentUserId: abo.ownerUserId } });
    const neueSitze = abo.geplanteSitze ?? abo.sitze;
    if (belegt <= neueSitze) {
      const art = aboArtFuerSitze(neueSitze);
      const preis = aboPreis({
        paket: abo.paket,
        art,
        sitze: neueSitze,
        intervall: abo.intervall,
      });
      const { aktuellerZeitraumEnde } = await zahlung.subscriptionAendern(
        abo.zahlungsanbieterRef ?? abo.id,
        { intervall: abo.intervall, betragCent: preis.betragCent },
      );
      await prisma.abo.update({
        where: { id: abo.id },
        data: {
          sitze: neueSitze,
          geplanteSitze: null,
          art,
          angebot: preis.angebotKey,
          aktuellerZeitraumEnde,
        },
      });
      angewendet += 1;
    } else {
      wartet += 1;
    }
  }
  return { angewendet, wartetAufKindLoeschung: wartet };
}

export const JOBS = {
  'inhalte-aufbewahrung': inhalteAelterAlsEinJahrLoeschen,
  'usage-historie': alteUsageZeilenLoeschen,
  'token-hygiene': abgelaufeneTokenLoeschen,
  'abo-geplante-aenderungen': geplanteAboAenderungenAnwenden,
  'ki-kosten-alarm': kiKostenAlarmPruefen,
} as const;

export type JobName = keyof typeof JOBS;
