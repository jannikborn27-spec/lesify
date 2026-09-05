import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../app.js';
import { FakeStorageGateway } from '../lib/storage.js';
import { env } from '../env.js';
import { buildMultipart, pdfMitText } from '../test-utils/multipart.js';

const keinPrisma = {} as unknown as PrismaClient;

describe('dateien — ohne Token → 401', () => {
  const app = buildApp({ prisma: keinPrisma, logger: false });
  it('GET /dateien → 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/dateien' });
    expect(res.statusCode).toBe(401);
  });
});

const hatDb = !!process.env.DATABASE_URL;

describe.runIf(hatDb)('dateien — Upload-Flow (Supabase-DB, Fake-Storage/KI)', () => {
  const storage = new FakeStorageGateway();
  const app = buildApp({ logger: false, storage });
  const email = `dateien+${crypto.randomUUID()}@dateien.lesify.test`;
  let token = '';
  const auth = () => ({ authorization: `Bearer ${token}` });
  let fachId = '';
  let themaId = '';

  beforeAll(async () => {
    await app.ready();
    await app.inject({
      method: 'POST',
      url: '/auth/registrieren',
      payload: {
        rolle: 'schueler',
        name: 'Dateien-Test',
        klassenstufe: '8. Klasse',
        email,
        passwort: 'dateien-pass-1234',
        einwilligung: true,
      },
    });
    token = (
      await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email, passwort: 'dateien-pass-1234' },
      })
    ).json().token;
    fachId = (
      await app.inject({
        method: 'POST',
        url: '/faecher',
        headers: auth(),
        payload: { name: 'Mathematik' },
      })
    ).json().id;
    themaId = (
      await app.inject({
        method: 'POST',
        url: '/themen',
        headers: auth(),
        payload: { fachId, name: 'Bruchrechnung' },
      })
    ).json().id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('lehnt eine zu große Datei mit 413 datei_zu_gross ab', async () => {
    const { body, contentType } = buildMultipart([
      {
        name: 'datei',
        filename: 'zu-gross.pdf',
        contentType: 'application/pdf',
        data: Buffer.alloc(env.DATEI_MAX_BYTES + 1024, 1),
      },
    ]);
    const res = await app.inject({
      method: 'POST',
      url: `/themen/${themaId}/dateien`,
      headers: { ...auth(), 'content-type': contentType },
      payload: body,
    });
    expect(res.statusCode).toBe(413);
    expect(res.json().fehler).toBe('datei_zu_gross');
  });

  it('lehnt einen nicht unterstützten Dateityp ab', async () => {
    const { body, contentType } = buildMultipart([
      { name: 'datei', filename: 'lied.mp3', contentType: 'audio/mpeg', data: Buffer.from('x') },
    ]);
    const res = await app.inject({
      method: 'POST',
      url: `/themen/${themaId}/dateien`,
      headers: { ...auth(), 'content-type': contentType },
      payload: body,
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().fehler).toBe('dateityp_nicht_unterstuetzt');
  });

  it('lädt eine PDF hoch, verarbeitet sie zu Status bereit mit Zusammenfassung', async () => {
    const { body, contentType } = buildMultipart([
      {
        name: 'datei',
        filename: 'skript.pdf',
        contentType: 'application/pdf',
        data: await pdfMitText('Ableitungsregeln'),
      },
    ]);
    const res = await app.inject({
      method: 'POST',
      url: `/themen/${themaId}/dateien`,
      headers: { ...auth(), 'content-type': contentType },
      payload: body,
    });
    expect(res.statusCode).toBe(201);
    const datei = res.json();
    expect(datei.status).toBe('verarbeitung');
    expect(datei.typ).toBe('pdf');

    // Verarbeitung läuft fire-and-forget nebenher — kurz pollen statt fest zu warten.
    let aktuell = datei;
    for (let i = 0; i < 20 && aktuell.status === 'verarbeitung'; i++) {
      await new Promise((r) => setTimeout(r, 250));
      aktuell = (
        await app.inject({ method: 'GET', url: `/dateien/${datei.id}`, headers: auth() })
      ).json();
    }
    expect(aktuell.status).toBe('bereit');
    expect(aktuell.zusammenfassung).toBeTruthy();
  });

  it('GET /dateien listet keine Testklausur-Lösungs-Dateien (zweck-Filter)', async () => {
    const liste = (
      await app.inject({ method: 'GET', url: `/dateien?themaId=${themaId}`, headers: auth() })
    ).json();
    expect(liste.every((d: { zweck?: string }) => d.zweck !== 'testklausurLoesung')).toBe(true);
  });

  it('GET /dateien/:id/inhalt akzeptiert den Token per Query-Parameter und redirected', async () => {
    const dateien = (
      await app.inject({ method: 'GET', url: `/dateien?themaId=${themaId}`, headers: auth() })
    ).json();
    const id = dateien[0].id;
    const res = await app.inject({ method: 'GET', url: `/dateien/${id}/inhalt?token=${token}` });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBeTruthy();
  });

  it('GET /dateien/:id/inhalt ohne Token → 401', async () => {
    const dateien = (
      await app.inject({ method: 'GET', url: `/dateien?themaId=${themaId}`, headers: auth() })
    ).json();
    const res = await app.inject({ method: 'GET', url: `/dateien/${dateien[0].id}/inhalt` });
    expect(res.statusCode).toBe(401);
  });
});
