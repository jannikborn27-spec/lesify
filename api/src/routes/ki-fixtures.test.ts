import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildApp } from '../app.js';
import { FIXTURE_DATEI, FixtureKiClient } from '../lib/ki/fixtures.js';

// Kern-Flow mit **aufgezeichneten echten** KI-Antworten (siehe
// `lib/ki/fixtures.ts`) statt Platzhaltern: prüft, dass Parsing, Patch-
// Anwendung, Notenableitung und PDF-Rendering mit realistischer Modell-
// Ausgabe (lange Markdown-Texte, Emoji, Mathe-Symbole) funktionieren.
const hatDb = !!process.env.DATABASE_URL && FixtureKiClient.verfuegbar();

describe.runIf(hatDb)('KI-Flow mit aufgezeichneten echten Antworten (Supabase)', () => {
  const fixtures = JSON.parse(readFileSync(FIXTURE_DATEI, 'utf8'));
  const app = buildApp({ logger: false, ki: new FixtureKiClient() });
  let token = '';
  const auth = () => ({ authorization: `Bearer ${token}` });
  let fachId = '';
  let themaA = '';
  let themaB = '';

  beforeAll(async () => {
    await app.ready();
    const email = `fixtures+${crypto.randomUUID()}@ki.lesify.test`;
    const passwort = 'ki-test-pass-1234';
    await app.inject({
      method: 'POST',
      url: '/auth/registrieren',
      payload: {
        rolle: 'schueler',
        name: 'Fix',
        klassenstufe: '8. Klasse',
        email,
        passwort,
        einwilligung: true,
      },
    });
    token = (
      await app.inject({ method: 'POST', url: '/auth/login', payload: { email, passwort } })
    ).json().token;
    fachId = (
      await app.inject({
        method: 'POST',
        url: '/faecher',
        headers: auth(),
        payload: { name: 'Mathe', icon: 'mathematik' },
      })
    ).json().id;
    themaA = (
      await app.inject({
        method: 'POST',
        url: '/themen',
        headers: auth(),
        payload: { fachId, name: 'Bruchrechnung' },
      })
    ).json().id;
    themaB = (
      await app.inject({
        method: 'POST',
        url: '/themen',
        headers: auth(),
        payload: { fachId, name: 'Prozentrechnung' },
      })
    ).json().id;
  });

  it('Chat: echte Antwort + KI-Titel werden gespeichert', async () => {
    const chatId = (
      await app.inject({
        method: 'POST',
        url: '/chats',
        headers: auth(),
        payload: { fachId, themaId: themaA, modus: 'erklaeren' },
      })
    ).json().id;
    const res = await app.inject({
      method: 'POST',
      url: `/chats/${chatId}/nachrichten`,
      headers: auth(),
      payload: { text: 'Wie kürze ich 8/12?' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().nachrichten[1].text).toBe(fixtures['text:chat_erklaeren']);
    const chat = await app.inject({ method: 'GET', url: `/chats/${chatId}`, headers: auth() });
    expect(chat.json().titel).toBe(fixtures['tool:chat_titel'].titel);
  });

  it('Lernzettel: echter Inhalt → PDF, Revision wendet die echten Patches an', async () => {
    const lz = await app.inject({
      method: 'POST',
      url: `/themen/${themaA}/lernzettel`,
      headers: auth(),
    });
    expect(lz.statusCode).toBe(201);
    const vorher = lz.json().content as string;
    expect(vorher).toBe(fixtures['tool:lernzettel_erstellen'].content);

    const pdf = await app.inject({
      method: 'GET',
      url: `/lernzettel/${lz.json().id}/pdf`,
      headers: auth(),
    });
    expect(pdf.statusCode).toBe(200);
    expect(pdf.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');

    const rev = await app.inject({
      method: 'POST',
      url: `/lernzettel/${lz.json().id}/revisionen`,
      headers: auth(),
      payload: { text: 'Füge ein Beispiel mit gemischten Zahlen hinzu.' },
    });
    expect(rev.statusCode).toBe(200);
    // Patches passen auf den aufgezeichneten Inhalt → echte Änderung, kein Fallback-Text.
    expect(rev.json().content).not.toBe(vorher);
    expect(rev.json().revisionen.at(-1).text).toBe(
      fixtures['tool:lernzettel_revision'].antwortText,
    );
  });

  it('Klausur → Testklausur (PDF) → Lösung → Analyse → Lernplan-Lernzettel', async () => {
    const kl = await app.inject({
      method: 'POST',
      url: '/klausuren',
      headers: auth(),
      payload: { fachId, themaIds: [themaA, themaB], titel: 'Mathe-Arbeit', datum: '2026-12-01' },
    });
    expect(kl.statusCode).toBe(201);
    const tk = kl.json().testklausur1;
    expect(tk.aufgaben.map((a: { themaId: string }) => a.themaId)).toEqual([themaA, themaB]);

    const dok = await app.inject({
      method: 'GET',
      url: `/testklausuren/${tk.id}/dokument`,
      headers: auth(),
    });
    expect(dok.statusCode).toBe(200);

    await app.inject({
      method: 'POST',
      url: `/testklausuren/${tk.id}/loesung`,
      headers: auth(),
      payload: { loesungsText: '1) 24/36 = 2/3\n2) 250 + 50 = 300 Euro' },
    });
    const an = await app.inject({
      method: 'POST',
      url: `/testklausuren/${tk.id}/analyse`,
      headers: auth(),
    });
    expect(an.statusCode).toBe(200);
    for (const v of an.json().vorbereitung as { prozent: number; ampel: string }[]) {
      expect(v.prozent).toBeGreaterThanOrEqual(0);
      expect(v.prozent).toBeLessThanOrEqual(100);
      expect(['gruen', 'gelb', 'rot']).toContain(v.ampel);
    }

    const lz = await app.inject({
      method: 'POST',
      url: `/lernplaene/${kl.json().lernplan.id}/lernzettel`,
      headers: auth(),
      payload: { themaIds: [themaA] },
    });
    expect(lz.statusCode).toBe(200);
    expect(lz.json().content).toContain('###');
  });
});
