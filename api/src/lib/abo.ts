import type { Abo } from '@prisma/client';
import { loeschDatum } from './aboZugriff.js';
import {
  aboPreis,
  bleibtImAngebot,
  istGueltigeSitzzahl,
  PLAN_LIMITS,
  PLAN_NAMES,
  type Paket,
} from '@lesify/shared';

/** Antwortform für `GET /abo` & Co. — Felder wie backend-planning.md §1/§4. */
function preisFuer(abo: Abo): { betragCent: number; normalCent: number | null } | null {
  if (!istGueltigeSitzzahl(abo.art, abo.sitze)) return null;
  const p = aboPreis({
    paket: abo.paket,
    art: abo.art,
    sitze: abo.sitze,
    intervall: abo.intervall,
    mitAngebot: bleibtImAngebot(abo.angebot),
  });
  return { betragCent: p.betragCent, normalCent: p.normalCent };
}

export function aboDTO(abo: Abo) {
  const paket = abo.paket as Paket;
  return {
    id: abo.id,
    paket: abo.paket,
    planName: PLAN_NAMES[paket],
    art: abo.art,
    sitze: abo.sitze,
    geplanteSitze: abo.geplanteSitze,
    intervall: abo.intervall,
    angebot: abo.angebot,
    status: abo.status,
    trialEndetAm: abo.trialEndetAm,
    aktuellerZeitraumEnde: abo.aktuellerZeitraumEnde,
    /** nur bei `zahlung_offen`: seit wann, und ab wann Kind-Profile gelöscht werden */
    zahlungOffenSeit: abo.zahlungOffenSeit,
    loeschungAm:
      abo.status === 'zahlung_offen' && abo.zahlungOffenSeit
        ? loeschDatum(abo.zahlungOffenSeit)
        : null,
    /** abgeleitete Monatskontingente je Sitz */
    kontingente: PLAN_LIMITS[paket],
    /** Preis je Abrechnungszeitraum (2026-09-29, für „Abo & Sitze“):
     *  Angebotspreis bleibt für Abschließende (bleibtImAngebot). */
    preis: preisFuer(abo),
  };
}
