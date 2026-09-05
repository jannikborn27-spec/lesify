import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { getPrisma } from '../db.js';
import { FakeStorageGateway } from '../lib/storage.js';
import { buildMultipart, pdfMitText } from '../test-utils/multipart.js';

const hatDb = !!process.env.DATABASE_URL;

describe.runIf(hatDb)('testklausuren — Lösungs-Upload per Multipart (Fake-Storage/KI)', () => {
  const storage = new FakeStorageGateway();
  const app = buildApp({ logger: false, storage });
  const prisma = getPrisma();
  const email = `tkupload+${crypto.randomUUID()}@tkupload.lesify.test`;
  let token = '';
  const auth = () => ({ authorization: `Bearer ${token}` });
  let testklausurId = '';
  let themaId = '';

  beforeAll(async () => {
    await app.ready();
    await app.inject({
      method: 'POST',
      url: '/auth/registrieren',
      payload: {
        rolle: 'schueler',
        name: 'TK-Upload-Test',
        klassenstufe: '9. Klasse',
        email,
        passwort: 'tkupload-pass-1234',
        einwilligung: true,
      },
    });
    token = (
      await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email, passwort: 'tkupload-pass-1234' },
      })
    ).json().token;
    const fachId = (
      await app.inject({
        method: 'POST',
        url: '/faecher',
        headers: auth(),
        payload: { name: 'Physik' },
      })
    ).json().id;
    themaId = (
      await app.inject({
        method: 'POST',
        url: '/themen',
        headers: auth(),
        payload: { fachId, name: 'Optik' },
      })
    ).json().id;
    const klausur = (
      await app.inject({
        method: 'POST',
        url: '/klausuren',
        headers: auth(),
        payload: { fachId, themaIds: [themaId], titel: 'Physik Klausur', datum: '2026-12-01' },
      })
    ).json();
    testklausurId = klausur.testklausur1.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('lädt eine PDF-Lösung hoch, extrahiert Text und setzt status=geloest — landet nicht in der Themen-Dateiliste', async () => {
    const { body, contentType } = buildMultipart([
      {
        name: 'datei',
        filename: 'loesung.pdf',
        contentType: 'application/pdf',
        data: await pdfMitText('Antwort: Die Brennweite beträgt 5cm.'),
      },
    ]);
    const res = await app.inject({
      method: 'POST',
      url: `/testklausuren/${testklausurId}/loesung`,
      headers: { ...auth(), 'content-type': contentType },
      payload: body,
    });
    expect(res.statusCode).toBe(200);
    const b = res.json();
    expect(b.status).toBe('geloest');
    expect(b.hatLoesungsText).toBe(true);

    const gespeichert = await prisma.testklausur.findUniqueOrThrow({
      where: { id: testklausurId },
    });
    expect(gespeichert.loesungsText).toContain('Brennweite');

    const dateien = (
      await app.inject({ method: 'GET', url: `/dateien?themaId=${themaId}`, headers: auth() })
    ).json();
    expect(dateien).toHaveLength(0);

    const usage = (await app.inject({ method: 'GET', url: '/usage', headers: auth() })).json();
    expect(usage.dateien.used).toBe(0);
  });
});
