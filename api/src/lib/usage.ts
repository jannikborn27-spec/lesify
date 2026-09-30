import type { PrismaClient } from '@prisma/client';
import {
  FAIR_USE_NACHRICHTEN,
  PLAN_LIMITS,
  PLAN_NAMES,
  TRIAL_PAKET,
  USAGE_ZAEHLER,
  monatsSchluessel,
  naechsterMonatsErster,
  usageRatio,
  usageStufe,
  type Paket,
  type UsageZaehler,
} from '@lesify/shared';
import { HttpError } from './http.js';

/** Aktuelles Tarif-Paket des Users (Abo, sonst Premium im Trial, sonst Starter). */
export async function paketFuerUser(prisma: PrismaClient, userId: string): Promise<Paket> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { abo: true } });
  if (user?.abo) return user.abo.paket;
  const imTrial = !!user?.trialEndetAm && user.trialEndetAm.getTime() > Date.now();
  return imTrial ? TRIAL_PAKET : 'starter';
}

const USED_FELD = {
  nachrichten: 'nachrichtenUsed',
  dateien: 'dateienUsed',
  lernzettel: 'lernzettelUsed',
  testklausuren: 'testklausurenUsed',
} as const satisfies Record<UsageZaehler, string>;

/** Die vier Limit-Spalten passend zum Paket (für Usage-Zeilen als Momentaufnahme). */
function limitSpalten(paket: Paket): {
  nachrichtenLimit: number | null;
  dateienLimit: number;
  lernzettelLimit: number;
  testklausurenLimit: number;
} {
  const l = PLAN_LIMITS[paket];
  return {
    nachrichtenLimit: l.nachrichten,
    dateienLimit: l.dateien,
    lernzettelLimit: l.lernzettel,
    testklausurenLimit: l.testklausuren,
  };
}

export interface UsageQuote {
  used: number;
  limit: number | null;
  resetDatum: Date;
}
export interface UsageStand {
  paket: Paket;
  planName: string;
  resetDatum: Date;
  nachrichten: UsageQuote;
  dateien: UsageQuote;
  lernzettel: UsageQuote;
  testklausuren: UsageQuote;
  /** Max. Auslastung der vier Quoten (0–1); `null`-Limit zählt als 0. */
  ringRatio: number;
  /** Ampel-Stufe des Rings — `gruen | gelb | rot` (wie `usageRatioClass`). */
  stufe: 'gruen' | 'gelb' | 'rot';
}

/**
 * Voller Usage-Stand des laufenden Monats (Quelle für `GET /usage` und die
 * harte Limit-Durchsetzung). Limits kommen **live** aus dem aktiven Paket —
 * bei einem Upgrade gelten die neuen Grenzen sofort, die verbrauchten Zähler
 * bleiben stehen (§7). Der Monats-Reset ist implizit: ein neuer Monat = neuer
 * `Usage.monat`-Schlüssel = frische Zähler, kein Übertrag.
 */
/**
 * Wem die Nutzung gehört: Kind-Profile zählen auf ihren **Platz** im Abo der
 * Eltern (`elternId` + `sitzNr`), alle anderen Konten auf sich selbst
 * (Entscheidung 2026-09-30 — Kind entfernen + neu anlegen setzte das
 * Kontingent sonst zurück; das neue Kind übernimmt den Platz samt Verbrauch).
 */
export type UsageSchluessel = { userId: string } | { elternId: string; sitzNr: number };

export async function usageSchluessel(
  prisma: PrismaClient,
  userId: string,
): Promise<UsageSchluessel> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { parentUserId: true, sitzNr: true },
  });
  return u?.parentUserId && u.sitzNr != null
    ? { elternId: u.parentUserId, sitzNr: u.sitzNr }
    : { userId };
}

function zeileWhere(key: UsageSchluessel, monat: string) {
  return 'userId' in key
    ? { userId_monat: { userId: key.userId, monat } }
    : { elternId_sitzNr_monat: { elternId: key.elternId, sitzNr: key.sitzNr, monat } };
}

export async function usageStand(prisma: PrismaClient, userId: string): Promise<UsageStand> {
  const [paket, key] = await Promise.all([
    paketFuerUser(prisma, userId),
    usageSchluessel(prisma, userId),
  ]);
  return usageStandFuer(prisma, paket, key);
}

/** Usage eines Platzes/Kontos mit gegebenem Paket — auch für die Eltern-Ansicht je Platz. */
export async function usageStandFuer(
  prisma: PrismaClient,
  paket: Paket,
  key: UsageSchluessel,
): Promise<UsageStand> {
  const limits = PLAN_LIMITS[paket];
  const monat = monatsSchluessel();
  const row = await prisma.usage.findUnique({ where: zeileWhere(key, monat) });
  const resetDatum = naechsterMonatsErster();

  const quote = (art: UsageZaehler): UsageQuote => ({
    used: (row?.[USED_FELD[art]] as number | undefined) ?? 0,
    limit: limits[art],
    resetDatum,
  });

  const nachrichten = quote('nachrichten');
  const dateien = quote('dateien');
  const lernzettel = quote('lernzettel');
  const testklausuren = quote('testklausuren');

  const ringRatio = Math.max(
    ...USAGE_ZAEHLER.map((art) => {
      const q = quote(art);
      return usageRatio(q.used, q.limit);
    }),
  );

  return {
    paket,
    planName: PLAN_NAMES[paket],
    resetDatum,
    nachrichten,
    dateien,
    lernzettel,
    testklausuren,
    ringRatio,
    stufe: usageStufe(ringRatio),
  };
}

/**
 * Harte serverseitige Limit-Durchsetzung: wirft `403 limit_erreicht`, wenn der
 * Zähler `art` im laufenden Monat sein Paketlimit erreicht hat. **Vor** der
 * teuren Aktion aufrufen (Hard-Stop nur des betroffenen Features, §7).
 */
export async function pruefeUsageLimit(
  prisma: PrismaClient,
  userId: string,
  art: UsageZaehler,
): Promise<void> {
  const stand = await usageStand(prisma, userId);
  const q = stand[art];
  if (q.limit != null && q.used >= q.limit) {
    throw new HttpError(403, 'limit_erreicht', {
      zaehler: art,
      used: q.used,
      limit: q.limit,
      resetDatum: q.resetDatum,
    });
  }
  // „Unbegrenzt" (Infinite-Nachrichten) hat eine unsichtbare Fair-Use-Grenze —
  // eigener Fehlercode, damit die App keine Kontingent-Zahl anzeigt.
  if (q.limit == null && art === 'nachrichten' && q.used >= FAIR_USE_NACHRICHTEN) {
    throw new HttpError(403, 'fair_use_erreicht', { zaehler: art, resetDatum: q.resetDatum });
  }
}

/**
 * Erhöht einen Usage-Zähler im laufenden Monat (Upsert). Die Limit-Spalten der
 * Zeile werden dabei auf das aktuelle Paket gesetzt (Momentaufnahme); maßgeblich
 * für die Durchsetzung sind aber die Live-Limits in {@link usageStand}.
 */
export async function inkrementiereUsage(
  prisma: PrismaClient,
  userId: string,
  art: UsageZaehler,
  betrag = 1,
): Promise<void> {
  const monat = monatsSchluessel();
  const [paket, key] = await Promise.all([
    paketFuerUser(prisma, userId),
    usageSchluessel(prisma, userId),
  ]);
  const spalten = limitSpalten(paket);
  const usedFeld = USED_FELD[art];
  await prisma.usage.upsert({
    where: zeileWhere(key, monat),
    update: { ...spalten, [usedFeld]: { increment: betrag } },
    create: { ...key, monat, ...spalten, [usedFeld]: betrag },
  });
}
