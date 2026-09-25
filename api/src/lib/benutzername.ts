import { z } from 'zod';

/**
 * Benutzernamen für Kind-Profile ohne E-Mail (Entscheidung 2026-09-25).
 *
 * 3–30 Zeichen, Kleinbuchstaben/Ziffern plus `.`, `_`, `-`, beginnt mit
 * Buchstabe oder Ziffer. Kein `@` — dadurch ist eine Login-Kennung eindeutig:
 * mit `@` = E-Mail, ohne = Benutzername ({@link kennungArt}). Groß-/
 * Kleinschreibung zählt nicht (wird klein gespeichert und verglichen).
 */
export const benutzernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(30)
  .regex(/^[a-z0-9][a-z0-9._-]*$/);

/** E-Mail oder Benutzername, wie es im Login-/Passwort-vergessen-Feld steht. */
export const kennungSchema = z.string().trim().toLowerCase().min(1).max(320);

export function kennungArt(kennung: string): 'email' | 'benutzername' {
  return kennung.includes('@') ? 'email' : 'benutzername';
}

/** Prisma-`where` für eine Login-Kennung. */
export function kennungWhere(kennung: string): { email: string } | { benutzername: string } {
  return kennungArt(kennung) === 'email' ? { email: kennung } : { benutzername: kennung };
}
