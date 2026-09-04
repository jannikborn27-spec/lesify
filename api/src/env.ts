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
});

/** Validierte Umgebungsvariablen. Wirft beim Start, wenn Pflichtwerte fehlen. */
export const env: z.infer<typeof schema> = schema.parse(process.env);

export const istProd = env.NODE_ENV === 'production';
