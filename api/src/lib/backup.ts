import { gunzipSync, gzipSync } from 'node:zlib';
import { Prisma, type PrismaClient } from '@prisma/client';
import { getBackupAblage, type StorageGateway } from './storage.js';

/**
 * Nächtlicher DB-Dump als Überbrückung, solange Supabase Free keine
 * abrufbaren Backups hat (Entscheidung 2026-09-25, UMSETZUNGSPLAN §6).
 *
 * Kein `pg_dump` (fehlt im Railway-Image, Versionskonflikte mit dem Server):
 * Postgres exportiert jede Tabelle selbst per `json_agg` — alle in **einem**
 * REPEATABLE-READ-Snapshot, also konsistent. Einspielen läuft über
 * `json_populate_recordset`, das die Zeilen exakt in die Spaltentypen der
 * Zieltabelle zurückwandelt (Enums, Zeitstempel, JSON, Arrays).
 *
 * Voraussetzung fürs Einspielen: das Zielschema ist auf **demselben
 * Migrationsstand** (`prisma migrate deploy`) und leer. Das Schema selbst
 * steckt nicht im Dump — dafür sind die Migrationen da.
 */

export const BACKUP_FORMAT = 1;
/** So viele Dumps bleiben liegen (täglich → zwei Wochen). */
export const BACKUP_BEHALTEN = 14;
export const BACKUP_ORDNER = 'db';

export interface BackupInhalt {
  format: number;
  erstelltAm: string;
  /** Zuletzt angewandte Prisma-Migration der Quelle. */
  migration: string | null;
  /** Tabellen in Einspiel-Reihenfolge (referenzierte zuerst). */
  reihenfolge: string[];
  zeilen: Record<string, number>;
  tabellen: Record<string, unknown[]>;
}

type Db = Pick<PrismaClient, '$queryRawUnsafe' | '$executeRawUnsafe'>;

/** Bezeichner sicher quoten (Namen kommen aus dem Katalog bzw. dem Dump). */
export function ident(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export interface FkInfo {
  von: string;
  nach: string;
  spalten: string[];
  nullbar: boolean;
}

export interface EinspielPlan {
  reihenfolge: string[];
  /** Spalten, die beim INSERT erst NULL bleiben und danach per UPDATE gesetzt werden. */
  spaeter: Record<string, string[]>;
}

/**
 * Einspiel-Reihenfolge (Kahn): jede Tabelle nach den Tabellen, auf die sie per
 * Fremdschlüssel zeigt. Zwei Sonderfälle werden über nullbare FK-Spalten
 * aufgelöst, die erst nach allen INSERTs gesetzt werden:
 *  - Selbstbezüge (`User.parentUserId`) — Eltern und Kind können in
 *    verschiedenen INSERT-Stapeln landen;
 *  - Zyklen (`User.aboId → Abo`, `Abo.ownerUserId → User`).
 * Nicht auflösbare Zyklen (nur NOT-NULL-Kanten) hängen am Ende und scheitern
 * dann sichtbar an der FK-Prüfung.
 */
export function einspielPlan(tabellen: string[], fks: FkInfo[]): EinspielPlan {
  const spaeter: Record<string, string[]> = {};
  const merken = (fk: FkInfo) => (spaeter[fk.von] ??= []).push(...fk.spalten);
  const kanten = fks.filter((fk) => tabellen.includes(fk.von) && tabellen.includes(fk.nach));
  for (const fk of kanten) if (fk.von === fk.nach && fk.nullbar) merken(fk);
  let aktiv = kanten.filter((fk) => fk.von !== fk.nach);

  const offen = new Set(tabellen);
  const reihenfolge: string[] = [];
  while (offen.size) {
    const bereit = [...offen].filter((t) =>
      aktiv.every((fk) => fk.von !== t || !offen.has(fk.nach)),
    );
    if (bereit.length) {
      for (const t of bereit) {
        reihenfolge.push(t);
        offen.delete(t);
      }
      continue;
    }
    // Zyklus: eine nullbare Kante zwischen offenen Tabellen aufschieben.
    const brechen = aktiv.find((fk) => fk.nullbar && offen.has(fk.von) && offen.has(fk.nach));
    if (!brechen) {
      reihenfolge.push(...offen);
      break;
    }
    merken(brechen);
    aktiv = aktiv.filter((fk) => fk !== brechen);
  }
  return { reihenfolge, spaeter };
}

interface SchemaInfo extends EinspielPlan {
  pks: Record<string, string[]>;
}

async function schemaInfo(db: Db, schema: string): Promise<SchemaInfo> {
  const tabellen = await db.$queryRawUnsafe<{ name: string }[]>(
    `SELECT table_name AS name FROM information_schema.tables
     WHERE table_schema = $1 AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations'
     ORDER BY table_name`,
    schema,
  );
  const fks = await db.$queryRawUnsafe<FkInfo[]>(
    `SELECT cl.relname::text AS von, rcl.relname::text AS nach,
            array_agg(a.attname::text ORDER BY k.ord) AS spalten,
            bool_and(NOT a.attnotnull) AS nullbar
     FROM pg_constraint c
     JOIN pg_class cl ON cl.oid = c.conrelid
     JOIN pg_class rcl ON rcl.oid = c.confrelid
     JOIN pg_namespace n ON n.oid = cl.relnamespace
     CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
     JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
     WHERE c.contype = 'f' AND n.nspname = $1
     GROUP BY c.oid, cl.relname, rcl.relname`,
    schema,
  );
  const pkRows = await db.$queryRawUnsafe<{ tabelle: string; spalten: string[] }[]>(
    `SELECT cl.relname::text AS tabelle, array_agg(a.attname::text ORDER BY k.ord) AS spalten
     FROM pg_constraint c
     JOIN pg_class cl ON cl.oid = c.conrelid
     JOIN pg_namespace n ON n.oid = cl.relnamespace
     CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
     JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum
     WHERE c.contype = 'p' AND n.nspname = $1
     GROUP BY cl.relname`,
    schema,
  );
  const plan = einspielPlan(
    tabellen.map((t) => t.name),
    fks,
  );
  return { ...plan, pks: Object.fromEntries(pkRows.map((r) => [r.tabelle, r.spalten])) };
}

async function letzteMigration(db: Db, schema: string): Promise<string | null> {
  const rows = await db.$queryRawUnsafe<{ name: string }[]>(
    `SELECT migration_name AS name FROM ${ident(schema)}."_prisma_migrations"
     WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
     ORDER BY migration_name DESC LIMIT 1`,
  );
  return rows[0]?.name ?? null;
}

/**
 * Exportiert alle Tabellen als JSON-Text. Die Tabellen-Arrays kommen fertig
 * serialisiert aus Postgres und werden nur zusammengesetzt, nicht neu geparst.
 */
export async function datenbankExportieren(
  prisma: PrismaClient,
  schema = 'public',
): Promise<{ json: string; zeilen: Record<string, number>; migration: string | null }> {
  return prisma.$transaction(
    async (tx) => {
      const { reihenfolge } = await schemaInfo(tx, schema);
      const migration = await letzteMigration(tx, schema);
      const zeilen: Record<string, number> = {};
      const teile: string[] = [];
      for (const t of reihenfolge) {
        const [r] = await tx.$queryRawUnsafe<{ n: number; daten: string }[]>(
          `SELECT count(*)::int AS n, coalesce(json_agg(x), '[]')::text AS daten
           FROM ${ident(schema)}.${ident(t)} x`,
        );
        zeilen[t] = r!.n;
        teile.push(`${JSON.stringify(t)}:${r!.daten}`);
      }
      const kopf = {
        format: BACKUP_FORMAT,
        erstelltAm: new Date().toISOString(),
        migration,
        reihenfolge,
        zeilen,
      };
      const json = `${JSON.stringify(kopf).slice(0, -1)},"tabellen":{${teile.join(',')}}}`;
      return { json, zeilen, migration };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      maxWait: 10_000,
      timeout: 120_000,
    },
  );
}

export function backupPacken(json: string): Buffer {
  return gzipSync(Buffer.from(json, 'utf8'));
}

export function backupEntpacken(buffer: Buffer): BackupInhalt {
  const inhalt = JSON.parse(gunzipSync(buffer).toString('utf8')) as BackupInhalt;
  if (inhalt.format !== BACKUP_FORMAT) {
    throw new Error(`Unbekanntes Backup-Format ${inhalt.format} (erwartet ${BACKUP_FORMAT})`);
  }
  return inhalt;
}

/** Zeilen je INSERT — hält einzelne Statements/Parameter klein. */
const STAPEL = 500;

/**
 * Spielt einen Dump in `schema` ein — in einer Transaktion, alles oder nichts.
 * Bricht ab, wenn eine Zieltabelle nicht leer ist oder der Migrationsstand
 * abweicht (`trotzAndererMigration` überstimmt Letzteres bewusst).
 */
export async function datenbankEinspielen(
  prisma: PrismaClient,
  inhalt: BackupInhalt,
  opts: { schema?: string; trotzAndererMigration?: boolean } = {},
): Promise<Record<string, number>> {
  const schema = opts.schema ?? 'public';
  return prisma.$transaction(
    async (tx) => {
      const ziel = await letzteMigration(tx, schema);
      if (ziel !== inhalt.migration && !opts.trotzAndererMigration) {
        throw new Error(
          `Migrationsstand passt nicht: Dump ${inhalt.migration}, Ziel ${ziel}. Erst \`prisma migrate deploy\` auf denselben Stand bringen.`,
        );
      }
      // Plan aus dem ZIEL-Schema (maßgeblich sind dessen Constraints).
      const info = await schemaInfo(tx, schema);
      const vorhanden = new Set(info.reihenfolge);
      for (const t of inhalt.reihenfolge) {
        if (!vorhanden.has(t)) throw new Error(`Tabelle ${t} fehlt im Ziel-Schema ${schema}`);
      }
      for (const t of info.reihenfolge) {
        const [r] = await tx.$queryRawUnsafe<{ n: number }[]>(
          `SELECT count(*)::int AS n FROM ${ident(schema)}.${ident(t)}`,
        );
        if (r!.n > 0) throw new Error(`Ziel-Tabelle ${t} ist nicht leer (${r!.n} Zeilen)`);
      }

      const eingespielt: Record<string, number> = {};
      for (const t of info.reihenfolge) {
        const zeilen = (inhalt.tabellen[t] ?? []) as Record<string, unknown>[];
        const qualifiziert = `${ident(schema)}.${ident(t)}`;
        const spaeter = info.spaeter[t] ?? [];
        for (let i = 0; i < zeilen.length; i += STAPEL) {
          const stapel = zeilen.slice(i, i + STAPEL).map((z) => {
            if (!spaeter.length) return z;
            const kopie = { ...z };
            for (const s of spaeter) kopie[s] = null;
            return kopie;
          });
          await tx.$executeRawUnsafe(
            `INSERT INTO ${qualifiziert} SELECT * FROM json_populate_recordset(NULL::${qualifiziert}, $1::json)`,
            JSON.stringify(stapel),
          );
        }
        eingespielt[t] = zeilen.length;
      }

      // Aufgeschobene FK-Spalten nachtragen — jetzt existieren alle Zielzeilen.
      for (const [t, spalten] of Object.entries(info.spaeter)) {
        const pk = info.pks[t];
        if (!pk?.length) throw new Error(`Tabelle ${t} hat keinen Primärschlüssel`);
        const zeilen = ((inhalt.tabellen[t] ?? []) as Record<string, unknown>[]).filter((z) =>
          spalten.some((s) => z[s] != null),
        );
        const qualifiziert = `${ident(schema)}.${ident(t)}`;
        const setzen = spalten.map((s) => `${ident(s)} = d.${ident(s)}`).join(', ');
        const wo = pk.map((s) => `z.${ident(s)} = d.${ident(s)}`).join(' AND ');
        for (let i = 0; i < zeilen.length; i += STAPEL) {
          await tx.$executeRawUnsafe(
            `UPDATE ${qualifiziert} z SET ${setzen}
             FROM json_populate_recordset(NULL::${qualifiziert}, $1::json) d WHERE ${wo}`,
            JSON.stringify(zeilen.slice(i, i + STAPEL)),
          );
        }
      }
      return eingespielt;
    },
    { maxWait: 10_000, timeout: 300_000 },
  );
}

export function backupKey(jetzt = new Date()): string {
  // 2026-09-28T03-00-12Z — sortiert alphabetisch = zeitlich
  const stempel = jetzt
    .toISOString()
    .replace(/\.\d+Z$/, 'Z')
    .replace(/:/g, '-');
  return `${BACKUP_ORDNER}/lesify-${stempel}.json.gz`;
}

/**
 * Wartungs-Job `db-backup`: Dump → gzip → privater Bucket, danach Rotation
 * auf die {@link BACKUP_BEHALTEN} neuesten Dateien.
 */
export async function datenbankSichern(
  prisma: PrismaClient,
  ablage: StorageGateway = getBackupAblage(),
  jetzt = new Date(),
): Promise<{ key: string; bytes: number; tabellen: number; zeilen: number; geloescht: number }> {
  const { json, zeilen } = await datenbankExportieren(prisma);
  const gz = backupPacken(json);
  const key = backupKey(jetzt);
  await ablage.hochladen(key, gz, 'application/gzip');
  const alle = await ablage.auflisten(BACKUP_ORDNER);
  const alt = alle.filter((k) => k.endsWith('.json.gz')).slice(0, -BACKUP_BEHALTEN);
  await ablage.loeschen(alt);
  return {
    key,
    bytes: gz.length,
    tabellen: Object.keys(zeilen).length,
    zeilen: Object.values(zeilen).reduce((a, b) => a + b, 0),
    geloescht: alt.length,
  };
}
