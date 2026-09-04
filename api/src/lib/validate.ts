import { z, type ZodType } from 'zod';
import { HttpError } from './http.js';

/** Parst `data` gegen `schema`; wirft `HttpError(400, 'validierung')` mit Details. */
export function parse<T>(schema: ZodType<T>, data: unknown): T {
  const r = schema.safeParse(data);
  if (!r.success) throw new HttpError(400, 'validierung', z.flattenError(r.error));
  return r.data;
}
