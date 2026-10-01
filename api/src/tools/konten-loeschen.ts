/**
 * Konten anhand ihrer E-Mail-Adresse hart löschen (wie „Konto löschen" in der
 * App, `kontoLoeschen` in lib/inhalteLoeschen.ts): Konto + Kind-Profile +
 * alle Inhalte, Sessions, Abos und hochgeladenen Dateien. Gedacht zum
 * Aufräumen eigener Testkonten (z. B. nach dem Wechsel auf Stripe Live,
 * 2026-10-01).
 *
 *   pnpm --filter @lesify/api konten:loeschen a@b.de c@d.de
 *       Nur anzeigen, was gelöscht würde (ändert nichts).
 *   pnpm --filter @lesify/api konten:loeschen a@b.de c@d.de --wirklich
 *       Löschen — nach Eingabe von „LÖSCHEN" als Bestätigung.
 *
 * Läuft gegen die DB aus DATABASE_URL (Default: api/.env = Dev-DB). Für die
 * Produktion: `bash scripts/prod-konten-loeschen.sh …` (fragt die Zugänge
 * verdeckt ab). Stripe bleibt unberührt — Abos dort ggf. im Dashboard kündigen.
 */
import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { getPrisma } from '../db.js';
import { kontoLoeschen } from '../lib/inhalteLoeschen.js';
import { getStorageGateway } from '../lib/storage.js';

const args = process.argv.slice(2);
const wirklich = args.includes('--wirklich');
const emails = [
  ...new Set(args.filter((a) => !a.startsWith('--')).map((a) => a.trim().toLowerCase())),
];

if (!emails.length) {
  console.error('Aufruf: konten:loeschen <email> [<email> …] [--wirklich]');
  process.exit(1);
}

/** Supabase-Projekt aus der DB-URL (`postgres.<ref>@…`), damit klar ist, welche DB betroffen ist. */
function dbBeschreibung(): string {
  try {
    const u = new URL(process.env.DATABASE_URL ?? '');
    const ref = u.username.split('.')[1];
    return ref ? `Supabase-Projekt ${ref} (${u.hostname})` : u.hostname;
  } catch {
    return '(DATABASE_URL fehlt/ungültig)';
  }
}

const prisma = getPrisma();
const datum = (d: Date) => d.toISOString().slice(0, 10);

async function main(): Promise<void> {
  console.log(`\nDatenbank: ${dbBeschreibung()}`);
  console.log(
    wirklich ? 'Modus: LÖSCHEN\n' : 'Modus: nur anzeigen (zum Löschen --wirklich anhängen)\n',
  );

  const treffer = [];
  for (const email of emails) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: {
        children: { select: { name: true, benutzername: true } },
        ownedAbos: {
          select: { paket: true, status: true, sitze: true, zahlungsanbieterRef: true },
        },
        _count: { select: { dateien: true, chats: true, klausuren: true } },
      },
    });
    if (!user) {
      console.log(`– ${email}: kein Konto`);
      continue;
    }
    treffer.push(user);
    const kinder = user.children.map((k) => `${k.name} (@${k.benutzername ?? '–'})`).join(', ');
    const abos = user.ownedAbos
      .map(
        (a) =>
          `${a.paket}/${a.status}/${a.sitze} Platz, ${a.zahlungsanbieterRef ?? 'ohne Stripe-Ref'}`,
      )
      .join('; ');
    console.log(`• ${user.email} — ${user.name}, ${user.rolle}, angelegt ${datum(user.createdAt)}`);
    console.log(`    Kind-Profile: ${kinder || 'keine'}`);
    console.log(`    Abos: ${abos || 'keine'}`);
    console.log(
      `    Inhalte: ${user._count.dateien} Dateien, ${user._count.chats} Chats, ${user._count.klausuren} Klausuren`,
    );
  }

  if (!treffer.length) {
    console.log('\nNichts zu löschen.');
    return;
  }
  if (!wirklich) {
    console.log(`\n${treffer.length} Konto/Konten gefunden. Nichts geändert.`);
    return;
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const antwort = await rl.question(
    `\n${treffer.length} Konto/Konten inkl. Kind-Profilen und Inhalten ENDGÜLTIG löschen? „LÖSCHEN" eingeben: `,
  );
  rl.close();
  if (antwort.trim() !== 'LÖSCHEN') {
    console.log('Abgebrochen, nichts gelöscht.');
    return;
  }

  const storage = getStorageGateway();
  for (const user of treffer) {
    const { kindProfileGeloescht } = await kontoLoeschen(prisma, storage, user.id, (err) =>
      console.error(`    Speicherobjekte von ${user.email} nicht vollständig gelöscht:`, err),
    );
    console.log(`✓ ${user.email} gelöscht (+${kindProfileGeloescht} Kind-Profil(e))`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
