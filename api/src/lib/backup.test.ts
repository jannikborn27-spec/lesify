import { describe, expect, it } from 'vitest';
import { getPrisma } from '../db.js';
import {
  BACKUP_BEHALTEN,
  backupEntpacken,
  backupKey,
  datenbankSichern,
  einspielPlan,
} from './backup.js';
import { FakeStorageGateway } from './storage.js';

describe('einspielPlan — Reihenfolge + aufgeschobene FK-Spalten', () => {
  it('referenzierte Tabellen zuerst', () => {
    const plan = einspielPlan(
      ['Thema', 'Fach', 'User'],
      [
        { von: 'Thema', nach: 'Fach', spalten: ['fachId'], nullbar: false },
        { von: 'Fach', nach: 'User', spalten: ['userId'], nullbar: false },
      ],
    );
    expect(plan.reihenfolge).toEqual(['User', 'Fach', 'Thema']);
    expect(plan.spaeter).toEqual({});
  });

  it('Selbstbezug wird aufgeschoben (Eltern/Kind in verschiedenen Stapeln)', () => {
    const plan = einspielPlan(
      ['User'],
      [{ von: 'User', nach: 'User', spalten: ['parentUserId'], nullbar: true }],
    );
    expect(plan.reihenfolge).toEqual(['User']);
    expect(plan.spaeter).toEqual({ User: ['parentUserId'] });
  });

  it('Zyklus User ↔ Abo wird über die nullbare Kante aufgelöst', () => {
    const plan = einspielPlan(
      ['Abo', 'User'],
      [
        { von: 'User', nach: 'Abo', spalten: ['aboId'], nullbar: true },
        { von: 'Abo', nach: 'User', spalten: ['ownerUserId'], nullbar: false },
      ],
    );
    expect(plan.reihenfolge).toEqual(['User', 'Abo']);
    expect(plan.spaeter).toEqual({ User: ['aboId'] });
  });
});

describe('backupKey', () => {
  it('sortiert alphabetisch = zeitlich, ohne Doppelpunkte', () => {
    expect(backupKey(new Date('2026-09-28T03:00:12.345Z'))).toBe(
      'db/lesify-2026-09-28T03-00-12Z.json.gz',
    );
  });
});

describe('FakeStorageGateway.auflisten', () => {
  it('liefert nur direkte Kinder des Präfixes, sortiert', async () => {
    const s = new FakeStorageGateway();
    for (const k of ['db/b.json.gz', 'db/a.json.gz', 'db/x/tief.gz', 'andere/c.gz']) {
      await s.hochladen(k, Buffer.from('x'), 'text/plain');
    }
    expect(await s.auflisten('db')).toEqual(['db/a.json.gz', 'db/b.json.gz']);
  });
});

const hatDb = !!process.env.DATABASE_URL;

describe.runIf(hatDb)('datenbankSichern — Dump + Rotation (Supabase)', () => {
  it(`lädt einen lesbaren Dump hoch und behält nur die ${BACKUP_BEHALTEN} neuesten`, async () => {
    const ablage = new FakeStorageGateway();
    for (let tag = 1; tag <= 15; tag++) {
      await ablage.hochladen(
        backupKey(new Date(Date.UTC(2026, 0, tag, 3))),
        Buffer.from('alt'),
        'application/gzip',
      );
    }
    const ergebnis = await datenbankSichern(getPrisma(), ablage, new Date('2026-09-28T03:00:00Z'));
    const keys = await ablage.auflisten('db');
    expect(keys).toHaveLength(BACKUP_BEHALTEN);
    expect(keys.at(-1)).toBe(ergebnis.key);
    expect(ergebnis.geloescht).toBe(2);
    const inhalt = backupEntpacken(await ablage.lesen(ergebnis.key));
    expect(inhalt.reihenfolge).toContain('User');
    expect(inhalt.tabellen.User).toHaveLength(inhalt.zeilen.User!);
  }, 60_000);
});
