// Lädt api/.env, damit DB-gestützte Tests lokal gegen Supabase laufen.
// In CI (ohne .env) bleiben diese Tests über `describe.runIf(hatDb)` inaktiv.
import { config } from 'dotenv';

config();
process.env.NODE_ENV ??= 'test';
