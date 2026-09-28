/**
 * Werkzeug rund um die nächtlichen DB-Dumps (lib/backup.ts, 2026-09-28).
 *
 *   pnpm --filter @lesify/api backup liste
 *       Dumps im Backup-Bucket (`BACKUP_BUCKET`) auflisten.
 *   pnpm --filter @lesify/api backup holen [key]
 *       Neuesten (oder genannten) Dump nach `api/backups/` laden.
 *   pnpm --filter @lesify/api backup pruefen [datei]
 *       Restore-Probe OHNE Risiko: legt in der DB aus DATABASE_URL ein
 *       Wegwerf-Schema an, migriert es, spielt den Dump ein, vergleicht die
 *       Zeilenzahlen und löscht das Schema wieder. Ohne Datei: frischer Dump
 *       dieser DB.
 *   pnpm --filter @lesify/api backup einspielen <datei> --wirklich [--trotz-anderer-migration]
 *       Ernstfall: Dump in das `public`-Schema der DB aus DATABASE_URL
 *       einspielen (frisch migriert + leer, sonst Abbruch).
 *
 * Für Produktions-Dumps: `bash scripts/prod-backup-holen.sh` (fragt den
 * Service-Key verdeckt ab). Anleitung: docs/RUNBOOK.md „DB-Backups".
 */
import 'dotenv/config';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPrisma } from '../db.js';
import {
  BACKUP_ORDNER,
  backupEntpacken,
  backupPacken,
  datenbankEinspielen,
  datenbankExportieren,
  ident,
  type BackupInhalt,
} from '../lib/backup.js';
import { getBackupAblage } from '../lib/storage.js';

const API_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ZIEL_DIR = join(API_DIR, 'backups');

async function neuesterKey(): Promise<string> {
  const keys = (await getBackupAblage().auflisten(BACKUP_ORDNER)).filter((k) =>
    k.endsWith('.json.gz'),
  );
  if (!keys.length) throw new Error('Keine Dumps im Backup-Bucket gefunden.');
  return keys[keys.length - 1]!;
}

function mitSchema(url: string | undefined, schema: string): string | undefined {
  if (!url) return url;
  const u = new URL(url);
  u.searchParams.set('schema', schema);
  return u.toString();
}

function zusammenfassung(zeilen: Record<string, number>): string {
  const summe = Object.values(zeilen).reduce((a, b) => a + b, 0);
  return `${Object.keys(zeilen).length} Tabellen, ${summe} Zeilen`;
}

async function pruefen(datei?: string): Promise<void> {
  const prisma = getPrisma();
  let inhalt: BackupInhalt;
  if (datei) {
    inhalt = backupEntpacken(readFileSync(datei));
    console.log(
      `Dump ${basename(datei)} (${inhalt.erstelltAm}): ${zusammenfassung(inhalt.zeilen)}`,
    );
  } else {
    const { json } = await datenbankExportieren(prisma);
    inhalt = backupEntpacken(backupPacken(json));
    console.log(`Frischer Dump dieser DB: ${zusammenfassung(inhalt.zeilen)}`);
  }

  const schema = `backup_pruefung_${Date.now()}`;
  console.log(`Wegwerf-Schema ${schema} anlegen + migrieren …`);
  try {
    const mig = spawnSync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
      cwd: API_DIR,
      stdio: ['ignore', 'ignore', 'inherit'],
      env: {
        ...process.env,
        DATABASE_URL: mitSchema(process.env.DATABASE_URL, schema),
        DIRECT_URL: mitSchema(process.env.DIRECT_URL, schema),
      },
    });
    if (mig.status !== 0)
      throw new Error('prisma migrate deploy ins Wegwerf-Schema fehlgeschlagen');

    const eingespielt = await datenbankEinspielen(prisma, inhalt, { schema });
    const abweichungen: string[] = [];
    for (const t of inhalt.reihenfolge) {
      const [r] = await prisma.$queryRawUnsafe<{ n: number }[]>(
        `SELECT count(*)::int AS n FROM ${ident(schema)}.${ident(t)}`,
      );
      if (r!.n !== inhalt.zeilen[t])
        abweichungen.push(`${t}: Dump ${inhalt.zeilen[t]}, DB ${r!.n}`);
    }
    if (abweichungen.length)
      throw new Error(`Zeilenzahlen weichen ab:\n  ${abweichungen.join('\n  ')}`);

    // Inhalt: eingespieltes Schema erneut exportieren und Tabelle für Tabelle
    // vergleichen (Zeilen als JSON-Text, reihenfolgeunabhängig sortiert).
    const zurueck = backupEntpacken(
      backupPacken((await datenbankExportieren(prisma, schema)).json),
    );
    const sortiert = (zeilen: unknown[] = []) => zeilen.map((z) => JSON.stringify(z)).sort();
    const anders = inhalt.reihenfolge.filter(
      (t) =>
        JSON.stringify(sortiert(inhalt.tabellen[t])) !==
        JSON.stringify(sortiert(zurueck.tabellen[t])),
    );
    if (anders.length) throw new Error(`Inhalte weichen ab in: ${anders.join(', ')}`);
    console.log(
      `✓ Restore-Probe bestanden: ${zusammenfassung(eingespielt)} eingespielt, Zeilenzahlen und Inhalte identisch.`,
    );
  } finally {
    await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS ${ident(schema)} CASCADE`);
    console.log(`Wegwerf-Schema ${schema} gelöscht.`);
  }
}

async function main(): Promise<void> {
  const [befehl, arg, ...rest] = process.argv.slice(2);
  const flags = new Set([arg, ...rest].filter((a) => a?.startsWith('--')));
  const pos = arg && !arg.startsWith('--') ? arg : undefined;

  switch (befehl) {
    case 'liste': {
      const keys = await getBackupAblage().auflisten(BACKUP_ORDNER);
      console.log(keys.length ? keys.join('\n') : '(keine Dumps)');
      break;
    }
    case 'holen': {
      const key = pos ?? (await neuesterKey());
      const buffer = await getBackupAblage().lesen(key);
      mkdirSync(ZIEL_DIR, { recursive: true });
      const ziel = join(ZIEL_DIR, basename(key));
      writeFileSync(ziel, buffer);
      const inhalt = backupEntpacken(buffer);
      console.log(
        `✓ ${key} → ${ziel} (${(buffer.length / 1024).toFixed(0)} KB, ${zusammenfassung(inhalt.zeilen)}, Migration ${inhalt.migration})`,
      );
      break;
    }
    case 'pruefen':
      await pruefen(pos);
      break;
    case 'einspielen': {
      if (!pos) throw new Error('Datei fehlt: backup einspielen <datei> --wirklich');
      if (!flags.has('--wirklich')) {
        throw new Error(
          'Sicherheitsabfrage: nur mit --wirklich (spielt in das public-Schema der DATABASE_URL ein).',
        );
      }
      const inhalt = backupEntpacken(readFileSync(pos));
      const eingespielt = await datenbankEinspielen(getPrisma(), inhalt, {
        trotzAndererMigration: flags.has('--trotz-anderer-migration'),
      });
      console.log(`✓ eingespielt: ${zusammenfassung(eingespielt)}`);
      break;
    }
    default:
      console.error(
        'Befehl fehlt: liste | holen [key] | pruefen [datei] | einspielen <datei> --wirklich',
      );
      process.exit(2);
  }
  await getPrisma().$disconnect();
}

main().catch(async (err) => {
  console.error(err instanceof Error ? err.message : err);
  await getPrisma().$disconnect();
  process.exit(1);
});
