import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * Opake Tokens (Session + E-Mail-/Reset-Token): 32 zufällige Bytes als
 * base64url. Der Rohwert geht nur an den Client; in der DB liegt ausschließlich
 * sein SHA-256-Hash. Lookup läuft über den Hash.
 */
export function neuesToken(): { roh: string; hash: string } {
  const roh = randomBytes(32).toString('base64url');
  return { roh, hash: hashToken(roh) };
}

export function hashToken(roh: string): string {
  return createHash('sha256').update(roh).digest('hex');
}

/** konstante-Zeit-Vergleich zweier Hex-Hashes gleicher Länge */
export function tokenHashGleich(a: string, b: string): boolean {
  const ba = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function inTagen(tage: number, ab: Date = new Date()): Date {
  return new Date(ab.getTime() + tage * 86_400_000);
}
