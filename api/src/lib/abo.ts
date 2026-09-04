import type { Abo } from '@prisma/client';
import { PLAN_LIMITS, PLAN_NAMES, type Paket } from '@lesify/shared';

/** Antwortform für `GET /abo` & Co. — Felder wie backend-planning.md §1/§4. */
export function aboDTO(abo: Abo) {
  const paket = abo.paket as Paket;
  return {
    id: abo.id,
    paket: abo.paket,
    planName: PLAN_NAMES[paket],
    art: abo.art,
    sitze: abo.sitze,
    intervall: abo.intervall,
    angebot: abo.angebot,
    status: abo.status,
    trialEndetAm: abo.trialEndetAm,
    aktuellerZeitraumEnde: abo.aktuellerZeitraumEnde,
    /** abgeleitete Monatskontingente je Sitz */
    kontingente: PLAN_LIMITS[paket],
  };
}
