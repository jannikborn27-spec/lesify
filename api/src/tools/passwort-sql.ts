/**
 * Erzeugt ein SQL-Snippet, das das Passwort eines Kontos direkt in der
 * Datenbank neu setzt — für Konten ohne erreichbares Postfach (z. B. der
 * Beispiel-Elternaccount), bei denen „Passwort vergessen" nicht geht.
 *
 *   pnpm --filter @lesify/api passwort:sql eltern@lesify.de
 *
 * Das Passwort wird verdeckt abgefragt und verlässt den Rechner nie; ausgegeben
 * wird nur der argon2id-Hash (gleiche Parameter wie die API). Das SQL im
 * Supabase-SQL-Editor des richtigen Projekts ausführen: setzt den Hash und
 * beendet alle Sessions des Kontos (wie `POST /auth/passwort-zuruecksetzen`;
 * der 30-s-Session-Cache der laufenden API läuft danach von selbst ab).
 */
import { createInterface } from 'node:readline';
import { hashPasswort } from '../lib/password.js';

// Im Terminal: Rohmodus, Eingabe wird nicht angezeigt. Ohne Terminal (Pipe):
// Zeile für Zeile lesen.
const zeilen = process.stdin.isTTY
  ? null
  : createInterface({ input: process.stdin })[Symbol.asyncIterator]();

function verdecktFragen(prompt: string): Promise<string> {
  process.stdout.write(prompt);
  if (zeilen) {
    return zeilen.next().then((r) => {
      process.stdout.write('\n');
      return r.done ? '' : String(r.value);
    });
  }
  const stdin = process.stdin;
  return new Promise((resolve) => {
    let wert = '';
    const beiDaten = (daten: string) => {
      for (const z of daten) {
        if (z === '\r' || z === '\n') {
          stdin.off('data', beiDaten);
          stdin.setRawMode(false);
          stdin.pause();
          process.stdout.write('\n');
          resolve(wert);
          return;
        }
        if (z === '\u0003') {
          process.stdout.write('\n');
          process.exit(130); // Strg+C
        }
        if (z === '\u007f' || z === '\b') wert = wert.slice(0, -1);
        else wert += z;
      }
    };
    stdin.setRawMode(true);
    stdin.setEncoding('utf8');
    stdin.resume();
    stdin.on('data', beiDaten);
  });
}

async function main(): Promise<void> {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    console.error('Aufruf: pnpm --filter @lesify/api passwort:sql <email>');
    process.exit(2);
  }
  const pw = await verdecktFragen(`Neues Passwort für ${email} (min. 8 Zeichen): `);
  if (pw.length < 8 || pw.length > 200) {
    console.error('Passwort muss 8–200 Zeichen lang sein.');
    process.exit(2);
  }
  const wdh = await verdecktFragen('Passwort wiederholen: ');
  if (wdh !== pw) {
    console.error('Die Eingaben stimmen nicht überein.');
    process.exit(2);
  }
  const hash = await hashPasswort(pw);
  const e = email.replace(/'/g, "''");
  console.log(`
-- Im Supabase-SQL-Editor (richtiges Projekt!) ausführen:
update "User" set "passwordHash" = '${hash}' where email = '${e}';
delete from "Session" where "userId" = (select id from "User" where email = '${e}');
`);
}

void main();
