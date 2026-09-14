// Muss vor jedem anderen Import stehen: `env.js` liest `process.env` beim
// Modul-Laden, `dotenv` muss also schon vorher gelaufen sein. `pnpm dev`
// (tsx) lädt sonst kein `api/.env` — nur die Testsuite tat das bisher über
// `vitest.setup.ts` (2026-09-13 entdeckt). In Produktion (Railway) liegt
// keine `.env`-Datei vor, `dotenv` ist dort ein no-op.
import 'dotenv/config';
import { buildApp } from './app.js';
import { env } from './env.js';

if (!env.DATABASE_URL) {
  console.error('DATABASE_URL fehlt — api/.env anlegen (siehe api/.env.example).');
  process.exit(1);
}

const app = buildApp();

app.listen({ port: env.PORT, host: '0.0.0.0' }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
