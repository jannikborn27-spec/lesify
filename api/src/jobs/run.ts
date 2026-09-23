/**
 * CLI-Runner für die Wartungs-Jobs (Phase 10).
 *
 *   pnpm --filter @lesify/api job inhalte-aufbewahrung
 *   pnpm --filter @lesify/api job usage-historie
 *   pnpm --filter @lesify/api job token-hygiene
 *   pnpm --filter @lesify/api job abo-geplante-aenderungen
 *   pnpm --filter @lesify/api job ki-kosten-alarm
 *   pnpm --filter @lesify/api job zahlung-offen-loeschung
 *   pnpm --filter @lesify/api job all
 *
 * Der echte Scheduler (Hosting-Cron / pg_cron / Worker, Phase 16) ruft genau
 * diese Kommandos auf. Exit-Code != 0 signalisiert einen Fehlschlag ans
 * Monitoring.
 */
import { getPrisma } from '../db.js';
import { JOBS, type JobName } from '../lib/jobs.js';
import { fehlerMelden, sentryLeeren, sentryStarten } from '../lib/sentry.js';

sentryStarten();

async function main(): Promise<void> {
  const arg = process.argv[2];
  if (!arg) {
    console.error(`Job fehlt. Verfügbar: ${Object.keys(JOBS).join(', ')}, all`);
    process.exit(2);
  }
  const prisma = getPrisma();
  const namen: JobName[] = arg === 'all' ? (Object.keys(JOBS) as JobName[]) : [arg as JobName];

  for (const name of namen) {
    const job = JOBS[name];
    if (!job) {
      console.error(`Unbekannter Job: ${name}`);
      process.exit(2);
    }
    const start = Date.now();
    const ergebnis = await job(prisma);
    console.log(JSON.stringify({ job: name, dauerMs: Date.now() - start, ...ergebnis }));
  }
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  fehlerMelden(err, { job: process.argv[2] });
  await sentryLeeren();
  process.exit(1);
});
