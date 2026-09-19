import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { prozentZuNote } from '@lesify/shared';
import { buildApp } from '../app.js';
import { getPrisma } from '../db.js';

const keinPrisma = {} as unknown as PrismaClient;

describe('chats/klausuren — ohne Token → 401', () => {
  const app = buildApp({ prisma: keinPrisma, logger: false });
  for (const [method, url] of [
    ['GET', '/chats'],
    ['POST', '/klausuren'],
    ['GET', `/lernplaene/${crypto.randomUUID()}`],
    ['GET', `/testklausuren/${crypto.randomUUID()}`],
  ] as const) {
    it(`${method} ${url} → 401`, async () => {
      const res = await app.inject({ method, url });
      expect(res.statusCode).toBe(401);
    });
  }
});

const hatDb = !!process.env.DATABASE_URL;

describe.runIf(hatDb)('chats + klausuren/lernplan/testklausur — Flow (Supabase)', () => {
  const app = buildApp({ logger: false });
  const prisma = getPrisma();
  const email = `flow2+${crypto.randomUUID()}@flow2.lesify.test`;
  let token = '';
  const auth = () => ({ authorization: `Bearer ${token}` });

  let fachId = '';
  let themaA = '';
  let themaB = '';
  let chatId = '';
  let lernplanId = '';
  let testklausur1Id = '';

  beforeAll(async () => {
    await app.ready();
    await app.inject({
      method: 'POST',
      url: '/auth/registrieren',
      payload: {
        rolle: 'schueler',
        name: 'Flow2',
        klassenstufe: '8. Klasse',
        email,
        passwort: 'flow2-pass-1234',
        einwilligung: true,
      },
    });
    token = (
      await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email, passwort: 'flow2-pass-1234' },
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
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@flow2.lesify.test' } } });
    await app.close();
    await prisma.$disconnect();
  });

  it('POST /chats legt einen leeren Chat an', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/chats',
      headers: auth(),
      payload: { fachId, themaId: themaA },
    });
    expect(res.statusCode).toBe(201);
    chatId = res.json().id;
    expect(res.json().titel).toBe('');
    expect(res.json().modus).toBeNull();
  });

  it('POST /chats mit fach/thema-Mismatch → 404', async () => {
    const anderesFach = (
      await app.inject({
        method: 'POST',
        url: '/faecher',
        headers: auth(),
        payload: { name: 'Deutsch' },
      })
    ).json().id;
    const res = await app.inject({
      method: 'POST',
      url: '/chats',
      headers: auth(),
      payload: { fachId: anderesFach, themaId: themaA },
    });
    expect(res.statusCode).toBe(404);
  });

  it('erste Nachricht setzt den Titel + zählt gegen Usage', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/chats/${chatId}/nachrichten`,
      headers: auth(),
      payload: { text: 'Wie kürzt man 8/12?' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().nachrichten).toHaveLength(2);
    expect(res.json().nachrichten[0].rolle).toBe('user');
    expect(res.json().nachrichten[1].rolle).toBe('ai');

    const chat = await app.inject({ method: 'GET', url: `/chats/${chatId}`, headers: auth() });
    expect(chat.json().titel).toBe('Wie kürzt man 8/12?');
    expect(chat.json().nachrichten).toHaveLength(2);

    const usage = await app.inject({ method: 'GET', url: '/usage', headers: auth() });
    expect(usage.json().nachrichten.used).toBe(1);

    const liste = await app.inject({ method: 'GET', url: '/chats', headers: auth() });
    expect(liste.json().map((c: { id: string }) => c.id)).toContain(chatId);
  });

  it('POST /klausuren legt Klausur + Lernplan + Testklausur 1 an', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/klausuren',
      headers: auth(),
      payload: {
        fachId,
        themaIds: [themaA, themaB],
        titel: 'Mathe Klausur 1',
        datum: '2026-11-20',
      },
    });
    expect(res.statusCode).toBe(201);
    const b = res.json();
    expect(b.klausur.titel).toBe('Mathe Klausur 1');
    expect(b.lernplan.klausurId).toBe(b.klausur.id);
    expect(b.testklausur1.titel).toContain('Testklausur 1');
    expect(b.testklausur1.aufgaben).toHaveLength(2);
    lernplanId = b.lernplan.id;
    testklausur1Id = b.testklausur1.id;

    const detail = await app.inject({
      method: 'GET',
      url: `/klausuren/${b.klausur.id}`,
      headers: auth(),
    });
    expect(detail.json().lernplan.id).toBe(lernplanId);
    expect(detail.json().testklausuren).toHaveLength(1);

    // GET /themen (fächerübergreifend, für themen.html) zählt Klausuren je
    // Thema über Klausur.themaIds mit (kein `_count` möglich, siehe
    // klausurenAnzahlProThema()).
    const alleThemen = await app.inject({ method: 'GET', url: '/themen', headers: auth() });
    const themaAEintrag = alleThemen.json().find((t: { id: string }) => t.id === themaA) as Record<
      string,
      unknown
    >;
    expect(themaAEintrag.anzahlKlausuren).toBe(1);
  });

  it('POST /klausuren mit fremdem themaId → 404', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/klausuren',
      headers: auth(),
      payload: { fachId, themaIds: [crypto.randomUUID()], titel: 'X', datum: '2026-12-01' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('GET /lernplaene/:id gibt Rohzustand + berechneten status (Phase 7)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/lernplaene/${lernplanId}`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().checklist).toEqual({});
    expect(res.json().tageErledigt).toEqual([]);
    expect(res.json().testklausur1Id).toBe(testklausur1Id);
    // Testklausur 1 noch nicht analysiert → aktueller Tag 1
    expect(res.json().status.aktuellerTag).toBe(1);
    expect(res.json().status.tag1.erledigt).toBe(false);
  });

  it('PATCH /lernplaene/:id/checklist — einzelner Punkt und ganzer Tag', async () => {
    const einPunkt = await app.inject({
      method: 'PATCH',
      url: `/lernplaene/${lernplanId}/checklist`,
      headers: auth(),
      payload: { tag: 2, key: 'verstehen-bruchrechnung', checked: true },
    });
    expect(einPunkt.json().checklist['2']['verstehen-bruchrechnung']).toBe(true);

    const ganzerTag = await app.inject({
      method: 'PATCH',
      url: `/lernplaene/${lernplanId}/checklist`,
      headers: auth(),
      payload: { tag: 2, checked: true },
    });
    expect(ganzerTag.json().tageErledigt).toEqual([2]);
  });

  it('chatMap: über POST /chats/:id/nachrichten und PATCH /lernplaene/:id', async () => {
    const mitKontext = await app.inject({
      method: 'POST',
      url: `/chats/${chatId}/nachrichten`,
      headers: auth(),
      payload: { text: 'nochmal bitte', lernplanKontext: { lernplanId, tag: 2 } },
    });
    expect(mitKontext.json().chatMap[`2||${themaA}`]).toBe(chatId);

    const patch = await app.inject({
      method: 'PATCH',
      url: `/lernplaene/${lernplanId}`,
      headers: auth(),
      payload: { tag: 3, modus: 'ueben', themaId: themaA, chatId },
    });
    expect(patch.json().chatMap[`3|ueben|${themaA}`]).toBe(chatId);
  });

  it('GET /lernplaene/:id/lernzettel/dokument → PDF', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/lernplaene/${lernplanId}/lernzettel/dokument`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('GET /testklausuren/:id + /dokument', async () => {
    const t = await app.inject({
      method: 'GET',
      url: `/testklausuren/${testklausur1Id}`,
      headers: auth(),
    });
    expect(t.json().status).toBe('erstellt');
    expect(t.json().aufgaben).toHaveLength(2);
    expect(t.json().ergebnisse).toEqual([]);

    const doc = await app.inject({
      method: 'GET',
      url: `/testklausuren/${testklausur1Id}/dokument`,
      headers: auth(),
    });
    expect(doc.headers['content-type']).toContain('application/pdf');
    expect(doc.rawPayload.subarray(0, 5).toString()).toBe('%PDF-');
    expect(doc.headers['content-disposition']).toContain('inline');
  });

  it('nach Analyse von Testklausur 1 rechnet status.aktuellerTag korrekt (Phase 7)', async () => {
    // Analyse direkt in der DB simulieren (der KI-Endpunkt kommt in Phase 6):
    // themaA schwach (rot), themaB stark (grün).
    const uId = (await prisma.testklausur.findUniqueOrThrow({ where: { id: testklausur1Id } }))
      .userId;
    const zeilen = [
      { themaId: themaA, prozent: 20, note: 5.0, ampel: 'rot' as const },
      { themaId: themaB, prozent: 95, note: 1.3, ampel: 'gruen' as const },
    ];
    await prisma.testklausurErgebnis.createMany({
      data: zeilen.map((z) => ({
        userId: uId,
        testklausurId: testklausur1Id,
        themaId: z.themaId,
        prozent: z.prozent,
        note: z.note,
        erklaerung: 'seed-analyse',
      })),
    });
    await prisma.vorbereitungsstand.createMany({
      data: zeilen.map((z) => ({
        userId: uId,
        testklausurId: testklausur1Id,
        themaId: z.themaId,
        prozent: z.prozent,
        note: z.note,
        ampel: z.ampel,
      })),
    });
    await prisma.testklausur.update({
      where: { id: testklausur1Id },
      data: { status: 'analysiert' },
    });

    const res = await app.inject({
      method: 'GET',
      url: `/lernplaene/${lernplanId}`,
      headers: auth(),
    });
    const s = res.json().status;
    const erwarteteNote = prozentZuNote(Math.round((20 + 95) / 2));
    expect(s.tag1.erledigt).toBe(true);
    expect(s.tag1.schwacheThemen).toEqual([themaA]);
    expect(s.tag1.intensitaet).toBe('tief');
    expect(s.aktuellerTag).toBe(2);
    expect(s.letzteTestNr).toBe(1);
    expect(s.letzteTestNote).toBe(erwarteteNote);

    const klausurDetail = await app.inject({
      method: 'GET',
      url: `/klausuren/${res.json().klausurId}`,
      headers: auth(),
    });
    expect(klausurDetail.json().note).toEqual({ note: erwarteteNote, testNr: 1 });

    // GET /lernplaene/:id bettet klausur/testklausur1 in der data.js-
    // Prototyp-Form ein (app.js liest sie direkt, nicht nur `status`).
    const body = res.json();
    expect(body.klausur).toMatchObject({ id: body.klausurId, themaIds: expect.any(Array) });
    expect(body.testklausur1.status).toBe('analysiert');
    expect(body.testklausur1.aufgaben.length).toBeGreaterThan(0);
    expect(body.testklausur1.ergebnis).toMatchObject({ note: erwarteteNote });
    expect(body.testklausur1.ergebnis.proThema).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ themaId: themaA, erklaerung: 'seed-analyse' }),
      ]),
    );
    expect(body.testklausur1.vorbereitung.proThema).toEqual(
      expect.arrayContaining([expect.objectContaining({ themaId: themaA, ampel: 'rot' })]),
    );
  });

  it('GET /lernplaene/<unbekannt> → 404', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/lernplaene/${crypto.randomUUID()}`,
      headers: auth(),
    });
    expect(res.statusCode).toBe(404);
  });
});
