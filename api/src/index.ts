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
