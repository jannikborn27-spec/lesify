// `pnpm --filter @lesify/api ki:kosten [YYYY-MM]` — Auswertung des KI-Kosten-
// Logs (`KiKosten`, befüllt von jedem echten Call, siehe `kosten.ts`): je
// Call-Typ Anzahl, Ø Kosten, Cache-Anteil; Monatssumme, aktive Sitze, Kosten je
// Sitz und empfohlenes Monatslimit für die Anthropic-Konsole (Faustregel aus
// docs/RUNBOOK.md „KI-Kosten"). Achtung: enthält auch eigene Test-Läufe
// (ki:smoke/Klick-Tests) des Monats.
import 'dotenv/config';
import { PLAN_ECONOMICS, monatsSchluessel, type Paket } from '@lesify/shared';
import { getPrisma } from '../../db.js';
import { sitzeAktiverAbosJePaket } from './kosten.js';

/** Gemessene KI-Kosten je Sitz/Monat bei 100 % Auslastung (2026-09-23, Haiku 4.5 + Sonnet 5 für Call 11). */
const GEMESSEN_100_PROZENT: Record<Paket, number> = {
  starter: 0.63,
  premium: 1.67,
  infinite: 6.12,
};

const monat = process.argv[2] ?? monatsSchluessel();
const prisma = getPrisma();
const zeilen = await prisma.kiKosten.findMany({
  where: { monat },
  orderBy: { kostenEurMikro: 'desc' },
});
const eur = (mikro: number) => mikro / 1_000_000;

console.log(`KI-Kosten ${monat}\n`);
console.log(
  'Call-Typ'.padEnd(36) +
    'Calls'.padStart(7) +
    'Ø ct/Call'.padStart(11) +
    'Summe €'.padStart(10) +
    'Cache-Anteil'.padStart(14),
);
let summe = 0;
for (const z of zeilen) {
  summe += z.kostenEurMikro;
  const input = z.inputTokens + z.cacheReadTokens + z.cacheCreationTokens;
  const cache = input ? Math.round((100 * z.cacheReadTokens) / input) : 0;
  console.log(
    `${z.callTyp} (${z.model.replace('claude-', '').replace(/-\d{8}$/, '')})`.padEnd(36) +
      String(z.calls).padStart(7) +
      ((eur(z.kostenEurMikro) * 100) / Math.max(1, z.calls)).toFixed(2).padStart(11) +
      eur(z.kostenEurMikro).toFixed(2).padStart(10) +
      `${cache} %`.padStart(14),
  );
}
console.log(`\nSumme: ${eur(summe).toFixed(2)} €`);

const sitze = await sitzeAktiverAbosJePaket(prisma, { ohneTestkonten: true });
const alleSitze = sitze.starter + sitze.premium + sitze.infinite;
console.log(
  `Aktive Sitze (ohne *.lesify.test-Testkonten): ${alleSitze} (Starter ${sitze.starter}, Premium ${sitze.premium}, Infinite ${sitze.infinite})`,
);
if (alleSitze) console.log(`Ø KI-Kosten je Sitz: ${(eur(summe) / alleSitze).toFixed(2)} €`);
const plan = (Object.keys(sitze) as Paket[]).reduce(
  (s, p) => s + sitze[p] * PLAN_ECONOMICS[p].apiKostenMonat,
  0,
);
const limit = (Object.keys(sitze) as Paket[]).reduce(
  (s, p) => s + sitze[p] * GEMESSEN_100_PROZENT[p] * 2,
  0,
);
console.log(`Planungsbudget (PLAN_ECONOMICS): ${plan.toFixed(2)} €/Monat`);
console.log(
  `Empfohlenes Anthropic-Monatslimit (Sitze × Kosten bei 100 % × 2): ${Math.max(20, Math.ceil(limit / 10) * 10)} € (mind. 20 €)`,
);
await prisma.$disconnect();
