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
});

/** Validierte Umgebungsvariablen. Wirft beim Start, wenn Pflichtwerte fehlen. */
export const env: z.infer<typeof schema> = schema.parse(process.env);

export const istProd = env.NODE_ENV === 'production';
