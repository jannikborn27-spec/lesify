import { beforeAll, describe, expect, it } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { buildApp } from '../app.js';
import type { KiClient } from '../lib/ki/client.js';
import { getPrisma } from '../db.js';

const hatDb = !!process.env.DATABASE_URL;

describe.runIf(hatDb)('Phase 6 — KI-Endpunkte gegen den FakeKiClient (Supabase)', () => {
  const app = buildApp({ logger: false });
  const prisma = getPrisma();
  let token = '';
  const auth = () => ({ authorization: `Bearer ${token}` });

  let fachId = '';
  let themaAId = '';
  let themaBId = '';

  beforeAll(async () => {
    await app.ready();
    const email = `ki+${crypto.randomUUID()}@ki.lesify.test`;
    const passwort = 'ki-test-pass-1234';
    await app.inject({
      method: 'POST',
      url: '/auth/registrieren',
      payload: {
        rolle: 'schueler',
        name: 'KI Test',
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
    themaAId = (
      await app.inject({
        method: 'POST',
        url: '/themen',
        headers: auth(),
        payload: { fachId, name: 'Bruchrechnung' },
      })
    ).json().id;
    themaBId = (
      await app.inject({
        method: 'POST',
        url: '/themen',
        headers: auth(),
        payload: { fachId, name: 'Prozentrechnung' },
      })
    ).json().id;
  });

  describe('Vorab-Filter im Chat', () => {
    let chatId = '';
    beforeAll(async () => {
      chatId = (
        await app.inject({
          method: 'POST',
          url: '/chats',
          headers: auth(),
          payload: { fachId, themaId: themaAId, modus: 'erklaeren' },
        })
      ).json().id;
    });

    it('Größen-Guard: zu lange Nachricht → 400 anfrage_zu_gross, kein Usage-Verbrauch', async () => {
      const vorher = (await app.inject({ method: 'GET', url: '/usage', headers: auth() })).json();
      const res = await app.inject({
        method: 'POST',
        url: `/chats/${chatId}/nachrichten`,
        headers: auth(),
        payload: { text: 'x'.repeat(7000) },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().fehler).toBe('anfrage_zu_gross');
      const nachher = (await app.inject({ method: 'GET', url: '/usage', headers: auth() })).json();
      expect(nachher.nachrichten.used).toBe(vorher.nachrichten.used);
    });

    it('Themen-Guard: klar themenfremde Anfrage → 400 nicht_schulrelevant', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/chats/${chatId}/nachrichten`,
        headers: auth(),
        payload: { text: 'Gib mir ein Rezept für Lasagne' },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().fehler).toBe('nicht_schulrelevant');
    });

    it('normale Nachricht geht durch und bekommt eine echte KI-Antwort + Titel', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/chats/${chatId}/nachrichten`,
        headers: auth(),
        payload: { text: 'Wie kürzt man 8/12?' },
      });
      expect(res.statusCode).toBe(200);
      // FakeKiClient (kein ANTHROPIC_API_KEY im Test) antwortet deterministisch,
      // aber über den echten Call-Pfad — nicht mehr der alte feste Prototyp-Text.
      expect(res.json().nachrichten[1].text).not.toBe(
        '_(Platzhalter-Antwort — die echte KI-Integration folgt in Phase 6.)_',
      );
      expect(res.json().nachrichten[1].text).toContain('Wie kürzt man 8/12?');
      const chat = await app.inject({ method: 'GET', url: `/chats/${chatId}`, headers: auth() });
      expect(chat.json().titel.length).toBeGreaterThan(0);
    });

    it('Spam-Guard: dieselbe Nachricht mehrfach hintereinander → irgendwann 400 spam_erkannt', async () => {
      const codes: number[] = [];
      for (let i = 0; i < 4; i += 1) {
        const res = await app.inject({
          method: 'POST',
          url: `/chats/${chatId}/nachrichten`,
          headers: auth(),
          payload: { text: 'immer die gleiche frage' },
        });
        codes.push(res.statusCode);
      }
      expect(codes).toContain(400);
    });
  });

  describe('KI-Anbieter fällt aus', () => {
    const kaputt: KiClient = {
      toolAufruf: () => Promise.reject(new Anthropic.APIConnectionError({ message: 'offline' })),
      freitextAufruf: () =>
        Promise.reject(new Anthropic.APIConnectionError({ message: 'offline' })),
    };
    const kaputteApp = buildApp({ logger: false, ki: kaputt });

    it('→ 503 ki_nicht_verfuegbar, kein Usage-Verbrauch, keine halbe Nachricht', async () => {
      await kaputteApp.ready();
      const chatId = (
        await kaputteApp.inject({
          method: 'POST',
          url: '/chats',
          headers: auth(),
          payload: { fachId, themaId: themaAId, modus: 'erklaeren' },
        })
      ).json().id;
      const vorher = (await app.inject({ method: 'GET', url: '/usage', headers: auth() })).json();
      const res = await kaputteApp.inject({
        method: 'POST',
        url: `/chats/${chatId}/nachrichten`,
        headers: auth(),
        payload: { text: 'Was ist ein Bruch?' },
      });
      expect(res.statusCode).toBe(503);
      expect(res.json().fehler).toBe('ki_nicht_verfuegbar');
      const nachher = (await app.inject({ method: 'GET', url: '/usage', headers: auth() })).json();
      expect(nachher.nachrichten.used).toBe(vorher.nachrichten.used);
      const chat = await app.inject({ method: 'GET', url: `/chats/${chatId}`, headers: auth() });
      expect(chat.json().nachrichten ?? []).toHaveLength(0);
    });
  });

  describe('Lernzettel-Erstellung & -Revision (Call 08/09)', () => {
    let lernzettelId = '';

    it('POST /themen/:id/lernzettel erzeugt einen Lernzettel', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/themen/${themaAId}/lernzettel`,
        headers: auth(),
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().content).toBeTruthy();
      lernzettelId = res.json().id;
    });

    it('GET /lernzettel/:id/pdf liefert den Lernzettel als PDF', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/lernzettel/${lernzettelId}/pdf`,
        headers: auth(),
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(res.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');
      const dl = await app.inject({
        method: 'GET',
        url: `/lernzettel/${lernzettelId}/pdf?download=1`,
        headers: auth(),
      });
      expect(dl.headers['content-disposition']).toContain('attachment');
    });

    it('GET /lernzettel(?themaId=) listet ihn (Dashboard-/Übersichts-Feed)', async () => {
      const alle = await app.inject({ method: 'GET', url: '/lernzettel', headers: auth() });
      expect(alle.json().map((l: { id: string }) => l.id)).toContain(lernzettelId);

      const gefiltert = await app.inject({
        method: 'GET',
        url: `/lernzettel?themaId=${themaAId}`,
        headers: auth(),
      });
      expect(gefiltert.json().map((l: { id: string }) => l.id)).toContain(lernzettelId);

      const andereThemaId = await app.inject({
        method: 'GET',
        url: `/lernzettel?themaId=${themaBId}`,
        headers: auth(),
      });
      expect(andereThemaId.json().map((l: { id: string }) => l.id)).not.toContain(lernzettelId);
    });

    it('Revision zählt wie eine normale Chat-Nachricht gegen das Nachrichten-Limit', async () => {
      const vorher = (await app.inject({ method: 'GET', url: '/usage', headers: auth() })).json();
      const res = await app.inject({
        method: 'POST',
        url: `/lernzettel/${lernzettelId}/revisionen`,
        headers: auth(),
        payload: { text: 'Füge ein Beispiel hinzu.' },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().revisionen).toHaveLength(2);
      const nachher = (await app.inject({ method: 'GET', url: '/usage', headers: auth() })).json();
      expect(nachher.nachrichten.used).toBe(vorher.nachrichten.used + 1);
    });
  });

  describe('Testklausur-Erstellung: 3.-Aufruf-Riegel (Call 10)', () => {
    let klausurId = '';

    it('POST /klausuren legt Testklausur 1 mit echten (Fake-)Aufgaben an', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/klausuren',
        headers: auth(),
        payload: {
          fachId,
          themaIds: [themaAId, themaBId],
          titel: 'Mathe-Klausur',
          datum: '2026-12-01',
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().testklausur1.aufgaben).toHaveLength(2);
      expect(res.json().testklausur1.aufgaben[0].frage).not.toContain('Phase 6');
      klausurId = res.json().klausur.id;
    });

    it('zweiter direkter Aufruf zur selben klausurId ist erlaubt (Testklausur 2 von Hand)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/testklausuren',
        headers: auth(),
        payload: { fachId, themaIds: [themaAId], titel: 'Zweiter Test', klausurId },
      });
      expect(res.statusCode).toBe(201);
    });

    it('dritter Aufruf zur selben klausurId → 409 testklausur_limit_erreicht', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/testklausuren',
        headers: auth(),
        payload: { fachId, themaIds: [themaAId], titel: 'Dritter Test', klausurId },
      });
      expect(res.statusCode).toBe(409);
      expect(res.json().fehler).toBe('testklausur_limit_erreicht');
    });
  });

  describe('Testklausur-Analyse (Call 11) + Lernplan-Folgen', () => {
    let lernplanId = '';
    let testklausur1Id = '';

    beforeAll(async () => {
      const kl = (
        await app.inject({
          method: 'POST',
          url: '/klausuren',
          headers: auth(),
          payload: {
            fachId,
            themaIds: [themaAId, themaBId],
            titel: 'Analyse-Klausur',
            datum: '2026-12-10',
          },
        })
      ).json();
      lernplanId = kl.lernplan.id;
      testklausur1Id = kl.testklausur1.id;
    });

    it('Analyse ohne Lösung → 409, mit loesungsText → analysiert', async () => {
      const zuFrueh = await app.inject({
        method: 'POST',
        url: `/testklausuren/${testklausur1Id}/analyse`,
        headers: auth(),
      });
      expect(zuFrueh.statusCode).toBe(409);

      const loesung = await app.inject({
        method: 'POST',
        url: `/testklausuren/${testklausur1Id}/loesung`,
        headers: auth(),
        payload: { loesungsText: '1) 8/12 = 2/3\n2) 320 × 0,15 = 48, neuer Preis 272' },
      });
      expect(loesung.statusCode).toBe(200);
      expect(loesung.json().hatLoesungsText).toBe(true);

      const analyse = await app.inject({
        method: 'POST',
        url: `/testklausuren/${testklausur1Id}/analyse`,
        headers: auth(),
      });
      expect(analyse.statusCode).toBe(200);
      expect(analyse.json().status).toBe('analysiert');
      expect(analyse.json().ergebnisse).toHaveLength(2);
      expect(analyse.json().vorbereitung).toHaveLength(2);
    });

    it('POST /lernplaene/:id/testklausur2 ist erst nach Analyse verfügbar', async () => {
      // Ampel künstlich auf „schwach" für ein Thema setzen (Fake liefert
      // uniform 70 % = grün) — analog zu flow2.test.ts.
      await prisma.testklausurErgebnis.updateMany({
        where: { testklausurId: testklausur1Id, themaId: themaAId },
        data: { prozent: 20, note: 5.0 },
      });
      await prisma.vorbereitungsstand.updateMany({
        where: { testklausurId: testklausur1Id, themaId: themaAId },
        data: { prozent: 20, note: 5.0, ampel: 'rot' },
      });

      const res = await app.inject({
        method: 'POST',
        url: `/lernplaene/${lernplanId}/testklausur2`,
        headers: auth(),
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().testklausur2.themaIds).toEqual([themaAId]);

      const nochmal = await app.inject({
        method: 'POST',
        url: `/lernplaene/${lernplanId}/testklausur2`,
        headers: auth(),
      });
      expect(nochmal.statusCode).toBe(409);
      expect(nochmal.json().fehler).toBe('testklausur2_bereits_gestartet');
    });

    it('POST /lernplaene/:id/lernzettel hängt bei zweitem Aufruf an, statt zu ersetzen', async () => {
      const erst = await app.inject({
        method: 'POST',
        url: `/lernplaene/${lernplanId}/lernzettel`,
        headers: auth(),
        payload: { themaIds: [themaAId] },
      });
      expect(erst.statusCode).toBe(200);
      expect(erst.json().content).toContain('# Lernzettel');
      const ersterInhalt = erst.json().content as string;

      const zweit = await app.inject({
        method: 'POST',
        url: `/lernplaene/${lernplanId}/lernzettel`,
        headers: auth(),
        payload: { themaIds: [themaAId] },
      });
      expect(zweit.statusCode).toBe(200);
      const zweiterInhalt = zweit.json().content as string;
      expect(zweiterInhalt.startsWith(ersterInhalt)).toBe(true);
      expect(zweiterInhalt.length).toBeGreaterThan(ersterInhalt.length);
    });
  });
});
