// Lädt api/.env, damit DB-gestützte Tests lokal gegen Supabase laufen.
// In CI (ohne .env) bleiben diese Tests über `describe.runIf(hatDb)` inaktiv.
import { config } from 'dotenv';

config();
process.env.NODE_ENV ??= 'test';

// Die Testsuite läuft immer gegen den deterministischen FakeKiClient — auch
// wenn in api/.env ein echter ANTHROPIC_API_KEY steht (sonst kostet jeder
// `pnpm test` echtes Geld und die Fake-Assertions schlagen fehl). Echte Calls
// testet `pnpm ki:smoke` gezielt.
delete process.env.ANTHROPIC_API_KEY;
delete process.env.KI_DEV_ADAPTER;
