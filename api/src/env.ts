import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  // beim echten Start (index.ts) Pflicht — hier nur weich, damit reine
  // Unit-Tests ohne .env die App bauen können.
  DATABASE_URL: z.string().default(''),
  DIRECT_URL: z.string().optional(),
  // Session-Lebensdauer in Tagen
  SESSION_TAGE: z.coerce.number().int().positive().default(7),
  SESSION_TAGE_ANGEMELDET_BLEIBEN: z.coerce.number().int().positive().default(90),
  // Stripe (Phase 9) — optional: fehlt der Key, läuft der Fake-Zahlungsanbieter.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  // Claude API (Phase 6) — optional: fehlt der Key, läuft der Fake-KI-Client
  // (deterministische Platzhalter-Antworten, kein echter Call/Kosten).
  ANTHROPIC_API_KEY: z.string().optional(),
  // Supabase Storage (Phase 5) — optional: fehlen URL/Service-Key, läuft das
  // deterministische FakeStorageGateway (In-Memory, kein echter Upload) —
  // wie FakeKiClient/FakeZahlungsGateway.
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  SUPABASE_STORAGE_BUCKET: z.string().default('lesify-local'),
  // 5-MB-Limit pro Datei, serverseitig hart (§6) — Bytes, nicht MB.
  DATEI_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(5 * 1024 * 1024),
  // Modellwahl je Call-Klasse (Config, nicht fest verdrahtet — §3).
  KI_MODELL_GUENSTIG: z.string().default('claude-haiku-4-5-20251001'),
  KI_MODELL_STANDARD: z.string().default('claude-haiku-4-5-20251001'),
  // Vorab-Filter (§3/§7): harte Zeichen-Obergrenze für eine einzelne
  // Nutzer-Eingabe (Chat-Nachricht, Revisionsanweisung).
  KI_ANFRAGE_MAX_ZEICHEN: z.coerce.number().int().positive().default(6000),
  // Dev-only: eigene Claude-Subscription (OAuth-Token aus `claude setup-token`)
  // statt Anthropic-API-Key zum lokalen Testen (2026-09-05, siehe
  // api/src/lib/ki/devAgentSdkClient.ts). NIE in Produktion nutzbar — greift
  // nur bei NODE_ENV=development UND explizit gesetztem KI_DEV_ADAPTER.
  CLAUDE_CODE_OAUTH_TOKEN: z.string().optional(),
  KI_DEV_ADAPTER: z.enum(['claude-agent-sdk']).optional(),
  // CORS (§4/Phase 11): Marketing/App laufen auf anderem Origin als die API
  // (lokal andere Ports, produktiv andere Domain — siehe Phase 16). Kommagetrennte
  // Liste erlaubter Origins, z. B. "https://lesify.de,https://www.lesify.de".
  // Unter `development`/`test` egal (jeder Origin erlaubt, lokale Ports wechseln
  // je nach Tooling); in `production` **Pflicht** — ohne sie bleibt CORS zu (fail-closed).
  CORS_ORIGINS: z.string().optional(),
});

/** Validierte Umgebungsvariablen. Wirft beim Start, wenn Pflichtwerte fehlen. */
export const env: z.infer<typeof schema> = schema.parse(process.env);

export const istProd = env.NODE_ENV === 'production';
