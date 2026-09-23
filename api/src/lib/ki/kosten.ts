import { PLAN_ECONOMICS, monatsSchluessel, type Paket } from '@lesify/shared';
import type { AboStatus, PrismaClient } from '@prisma/client';
import type { KiUsage } from './client.js';

/**
 * KI-Kosten-Dashboard (Phase 15): `response.usage` (siehe `client.ts`) wird
 * hier in einen €-Schätzwert umgerechnet und je Monat/Call-Typ/Modell in
 * `KiKosten` aggregiert (`protokolliereKiKosten`). `kiKostenAlarmPruefen`
 * vergleicht die Summe eines Monats gegen das erwartete Budget aus
 * `PLAN_ECONOMICS` (Summe der aktiven Abo-Sitze × geplante API-Kosten/Sitz)
 * und loggt einen strukturierten Alarm bei deutlicher Abweichung — läuft wie
 * die übrigen Wartungs-Jobs (`lib/jobs.ts`) über den Scheduler (Phase 16).
 */

export interface ModellPreisUsd {
  /** USD je 1 Mio. Input-Token. */
  inputProMTok: number;
  /** USD je 1 Mio. Output-Token. */
  outputProMTok: number;
}

// Cache-Multiplikatoren gelten laut Anthropic-Preismodell einheitlich über
// alle Modelle (Schreiben = 1,25× Input-Preis, Lesen = 0,1× Input-Preis).
const CACHE_SCHREIB_FAKTOR = 1.25;
const CACHE_LESE_FAKTOR = 0.1;

/**
 * Listenpreise in USD je 1 Mio. Token — Stand 2026-09, von der
 * Anthropic-Preisseite (https://www.anthropic.com/pricing). **Vor echtem
 * Produktivbetrieb mit Ausgaben gegenprüfen**, Preise ändern sich; unbekannte
 * Modell-IDs fallen auf `STANDARD_PREIS` zurück.
 */
const MODELL_PREISE: Record<string, ModellPreisUsd> = {
  'claude-haiku-4-5-20251001': { inputProMTok: 1, outputProMTok: 5 },
  'claude-haiku-4-5': { inputProMTok: 1, outputProMTok: 5 },
  'claude-sonnet-5': { inputProMTok: 2, outputProMTok: 10 },
  'claude-opus-5': { inputProMTok: 5, outputProMTok: 25 },
};
const STANDARD_PREIS = MODELL_PREISE['claude-haiku-4-5-20251001']!;

/** Grobe Planungsannahme für die USD→EUR-Umrechnung, keine Live-Kursabfrage. */
const USD_ZU_EUR = 0.93;

/** 1 EUR = 1_000_000 Euro-Millionstel — feinere Einheit als Cent, siehe unten. */
const MIKRO_JE_EUR = 1_000_000;

function preisFuer(model: string): ModellPreisUsd {
  return MODELL_PREISE[model] ?? STANDARD_PREIS;
}

/**
 * Schätzt die Kosten eines Calls in Euro-Millionsteln (1 EUR = 1_000_000).
 * Einzelne Calls kosten oft deutlich unter einem Cent — würde man schon hier
 * auf Cent runden, verschwänden die meisten Calls als „0", und die
 * Monatssumme würde systematisch unterschätzt. Auf Cent/€ wird erst beim
 * Lesen/Loggen gerundet (siehe `euroAus`).
 */
export function kostenEurMikroAus(model: string, usage: KiUsage): number {
  const preis = preisFuer(model);
  const usd =
    (usage.inputTokens / 1_000_000) * preis.inputProMTok +
    (usage.outputTokens / 1_000_000) * preis.outputProMTok +
    (usage.cacheCreationTokens / 1_000_000) * preis.inputProMTok * CACHE_SCHREIB_FAKTOR +
    (usage.cacheReadTokens / 1_000_000) * preis.inputProMTok * CACHE_LESE_FAKTOR;
  return Math.round(usd * USD_ZU_EUR * MIKRO_JE_EUR);
}

/** Euro-Millionstel als Euro-Betrag, auf 4 Nachkommastellen gerundet (Log-/Anzeigezwecke). */
function euroAus(mikro: number): number {
  return Math.round((mikro / MIKRO_JE_EUR) * 10_000) / 10_000;
}

/**
 * Persistiert einen Call in der monatlichen Call-Typ/Modell-Aggregation.
 * Fehler werden verschluckt (geloggt, nicht geworfen) — Kosten-Tracking darf
 * nie einen echten KI-Call scheitern lassen.
 */
export async function protokolliereKiKosten(
  prisma: PrismaClient,
  info: { callTyp: string; model: string; usage: KiUsage },
  jetzt: Date = new Date(),
): Promise<void> {
  try {
    const monat = monatsSchluessel(jetzt);
    const kostenEurMikro = kostenEurMikroAus(info.model, info.usage);
    await prisma.kiKosten.upsert({
      where: { monat_callTyp_model: { monat, callTyp: info.callTyp, model: info.model } },
      create: {
        monat,
        callTyp: info.callTyp,
        model: info.model,
        calls: 1,
        inputTokens: info.usage.inputTokens,
        outputTokens: info.usage.outputTokens,
        cacheReadTokens: info.usage.cacheReadTokens,
        cacheCreationTokens: info.usage.cacheCreationTokens,
        kostenEurMikro,
      },
      update: {
        calls: { increment: 1 },
        inputTokens: { increment: info.usage.inputTokens },
        outputTokens: { increment: info.usage.outputTokens },
        cacheReadTokens: { increment: info.usage.cacheReadTokens },
        cacheCreationTokens: { increment: info.usage.cacheCreationTokens },
        kostenEurMikro: { increment: kostenEurMikro },
      },
    });
  } catch (err) {
    console.error(JSON.stringify({ kiKostenProtokollFehler: true, err: String(err) }));
  }
}

/** Aktive Abo-Status für den Budget-Vergleich — Trial-Sitze zählen wie reguläre (§0/§7). */
const AKTIVE_ABO_STATUS: AboStatus[] = ['test', 'aktiv', 'zahlung_offen'];

export interface KiKostenAlarmErgebnis {
  monat: string;
  istEur: number;
  budgetEur: number;
  abweichungFaktor: number;
  alarm: boolean;
  jeCallTyp: { callTyp: string; kostenEur: number; calls: number }[];
}

/**
 * Schwelle für „deutliche Abweichung": Ist-Kosten müssen mehr als das
 * `ALARM_FAKTOR`-fache des aus `PLAN_ECONOMICS` erwarteten Monatsbudgets
 * betragen (Summe aller aktiven Sitze × geplante API-Kosten/Sitz).
 */
const ALARM_FAKTOR = 1.5;

/**
 * Vergleicht die bisherigen Ist-Kosten des Monats gegen das aus
 * `PLAN_ECONOMICS` abgeleitete Budget (aktive Sitze je Paket × geplante
 * API-Kosten/Sitz) und loggt einen strukturierten Alarm bei Überschreitung.
 * Budget ist eine Hochrechnung auf den vollen Monat basierend auf dem
 * bisherigen Tagesanteil, damit der Vergleich auch mitten im Monat
 * aussagekräftig ist.
 */
export async function kiKostenAlarmPruefen(
  prisma: PrismaClient,
  jetzt: Date = new Date(),
): Promise<KiKostenAlarmErgebnis> {
  const monat = monatsSchluessel(jetzt);
  const zeilen = await prisma.kiKosten.findMany({ where: { monat } });
  const istMikro = zeilen.reduce((sum, z) => sum + z.kostenEurMikro, 0);

  const sitzeJePaket = await sitzeAktiverAbosJePaket(prisma);
  const budgetVollerMonatEur = (Object.keys(sitzeJePaket) as Paket[]).reduce(
    (sum, paket) => sum + sitzeJePaket[paket] * PLAN_ECONOMICS[paket].apiKostenMonat,
    0,
  );
  // Hochrechnung: bisheriges Budget anteilig zum vergangenen Monatsanteil.
  const tagImMonat = jetzt.getUTCDate();
  const tageImMonat = new Date(
    Date.UTC(jetzt.getUTCFullYear(), jetzt.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const budgetMikro = Math.round((budgetVollerMonatEur * MIKRO_JE_EUR * tagImMonat) / tageImMonat);

  const abweichungFaktor = budgetMikro > 0 ? istMikro / budgetMikro : istMikro > 0 ? Infinity : 0;
  const alarm = budgetMikro > 0 && istMikro > budgetMikro * ALARM_FAKTOR;

  const ergebnis: KiKostenAlarmErgebnis = {
    monat,
    istEur: euroAus(istMikro),
    budgetEur: euroAus(budgetMikro),
    abweichungFaktor,
    alarm,
    jeCallTyp: zeilen.map((z) => ({
      callTyp: z.callTyp,
      kostenEur: euroAus(z.kostenEurMikro),
      calls: z.calls,
    })),
  };

  if (alarm) {
    console.warn(JSON.stringify({ kiKostenAlarm: true, ...ergebnis }));
  } else {
    console.log(JSON.stringify({ kiKostenCheck: true, ...ergebnis }));
  }
  return ergebnis;
}

async function sitzeAktiverAbosJePaket(prisma: PrismaClient): Promise<Record<Paket, number>> {
  const abos = await prisma.abo.findMany({
    where: { status: { in: AKTIVE_ABO_STATUS } },
    select: { paket: true, sitze: true },
  });
  const sitze: Record<Paket, number> = { starter: 0, premium: 0, infinite: 0 };
  for (const abo of abos) sitze[abo.paket] += abo.sitze;
  return sitze;
}
