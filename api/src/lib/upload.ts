import type { MultipartFile } from '@fastify/multipart';
import { HttpError } from './http.js';
import { env } from '../env.js';

/**
 * Liest den Buffer eines multipart-Datei-Teils und übersetzt das
 * Größenlimit von `@fastify/multipart` (`FST_REQ_FILE_TOO_LARGE`, wirft aus
 * `toBuffer()`) in unseren eigenen `413 datei_zu_gross`-Fehlercode (§6, vom
 * Frontend erwartet — siehe `FEHLER_TEXT` in `api.js`).
 */
export async function liesDateiTeil(teil: MultipartFile): Promise<Buffer> {
  let buffer: Buffer;
  try {
    buffer = await teil.toBuffer();
  } catch (err) {
    if (err instanceof Error && 'code' in err && err.code === 'FST_REQ_FILE_TOO_LARGE') {
      throw new HttpError(413, 'datei_zu_gross', { maxBytes: env.DATEI_MAX_BYTES });
    }
    throw err;
  }
  if (buffer.byteLength > env.DATEI_MAX_BYTES || teil.file.truncated) {
    throw new HttpError(413, 'datei_zu_gross', { maxBytes: env.DATEI_MAX_BYTES });
  }
  return buffer;
}
