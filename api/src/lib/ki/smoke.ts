// `pnpm --filter @lesify/api ki:smoke` — einmaliger End-to-End-Durchlauf aller
// zwölf KI-Calls gegen den **echten** Anthropic-Client (braucht
// `ANTHROPIC_API_KEY` in api/.env + `DATABASE_URL`). Legt einen Wegwerf-User
// an, fährt Upload → Chat → Lernzettel → Testklausur → Analyse → Lernplan und
// gibt pro Schritt Status, einen Antwort-Auszug und die geschätzten Kosten aus
// (aus den `kiUsage`-Logzeilen von `client.ts`). Der User wird am Ende wieder
// gelöscht. Kostet echtes Geld (mit Haiku grob wenige Cent pro Lauf).
import 'dotenv/config';
import { buildApp } from '../../app.js';
import { getPrisma } from '../../db.js';
import { env } from '../../env.js';
import { FakeStorageGateway } from '../storage.js';
import { buildMultipart, pdfMitText } from '../../test-utils/multipart.js';

if (!env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY fehlt in api/.env — Smoke-Test braucht den echten Key.');
  process.exit(1);
}
if (!env.DATABASE_URL) {
  console.error('DATABASE_URL fehlt in api/.env.');
  process.exit(1);
}

// kiUsage-Logzeilen abfangen und je Schritt aufsummieren, statt sie auszugeben.
interface UsageZeile {
  callTyp: string;
  model: string;
  kostenEurMikro: number;
  usage: { inputTokens?: number; outputTokens?: number };
}
let schrittUsage: UsageZeile[] = [];
const alleUsage: UsageZeile[] = [];
const origLog = console.log.bind(console);
console.log = (...args: unknown[]) => {
  if (typeof args[0] === 'string' && args[0].startsWith('{"kiUsage":true')) {
    const z = JSON.parse(args[0]) as UsageZeile;
    schrittUsage.push(z);
    alleUsage.push(z);
    return;
  }
  origLog(...args);
};

const eur = (mikro: number) => `${(mikro / 1_000_000).toFixed(4)} €`;
const auszug = (s: unknown) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .slice(0, 140);

let fehler = 0;
async function schritt<T>(name: string, fn: () => Promise<T>): Promise<T | undefined> {
  schrittUsage = [];
  const t0 = Date.now();
  try {
    const ergebnis = await fn();
    const kosten = schrittUsage.reduce((s, z) => s + z.kostenEurMikro, 0);
    const calls = schrittUsage.map((z) => z.callTyp).join(', ') || '—';
    origLog(
      `✓ ${name}  (${((Date.now() - t0) / 1000).toFixed(1)} s, ${eur(kosten)}; Calls: ${calls})`,
    );
    return ergebnis;
  } catch (e) {
    fehler += 1;
    origLog(`✗ ${name}: ${(e as Error).message}`);
    return undefined;
  }
}

function erwarte(bedingung: unknown, meldung: string): asserts bedingung {
  if (!bedingung) throw new Error(meldung);
}

const app = buildApp({ logger: false, storage: new FakeStorageGateway() });
const prisma = getPrisma();
const email = `smoke+${crypto.randomUUID()}@smoke.lesify.test`;
const passwort = 'smoke-test-pass-1234';
let token = '';
const auth = () => ({ authorization: `Bearer ${token}` });

async function main() {
  await app.ready();
  origLog(`KI-Smoke-Test mit ${env.KI_MODELL_GUENSTIG} / ${env.KI_MODELL_STANDARD}\n`);

  await app.inject({
    method: 'POST',
    url: '/auth/registrieren',
    payload: {
      rolle: 'schueler',
      name: 'Smoke Test',
      klassenstufe: '8. Klasse',
      email,
      passwort,
      einwilligung: true,
    },
  });
  token = (
    await app.inject({ method: 'POST', url: '/auth/login', payload: { email, passwort } })
  ).json().token;
  erwarte(token, 'Login fehlgeschlagen');

  const fachId = (
    await app.inject({
      method: 'POST',
      url: '/faecher',
      headers: auth(),
      payload: { name: 'Mathe', icon: 'mathematik' },
    })
  ).json().id as string;
  const themaA = (
    await app.inject({
      method: 'POST',
      url: '/themen',
      headers: auth(),
      payload: { fachId, name: 'Bruchrechnung' },
    })
  ).json().id as string;
  const themaB = (
    await app.inject({
      method: 'POST',
      url: '/themen',
      headers: auth(),
      payload: { fachId, name: 'Prozentrechnung' },
    })
  ).json().id as string;

  await schritt('Call 01 — Datei-Zusammenfassung (PDF-Upload)', async () => {
    const { body, contentType } = buildMultipart([
      {
        name: 'datei',
        filename: 'brueche.pdf',
        contentType: 'application/pdf',
        data: await pdfMitText(
          'Brüche kürzen: Zähler und Nenner durch denselben Teiler teilen. Beispiel 8/12 = 2/3. Erweitern: beide mit derselben Zahl multiplizieren.',
        ),
      },
    ]);
    const res = await app.inject({
      method: 'POST',
      url: `/themen/${themaA}/dateien`,
      headers: { ...auth(), 'content-type': contentType },
      payload: body,
    });
    erwarte(res.statusCode === 201, `Upload ${res.statusCode}: ${res.body}`);
    let datei = res.json();
    for (let i = 0; i < 120 && datei.status === 'verarbeitung'; i++) {
      await new Promise((r) => setTimeout(r, 500));
      datei = (
        await app.inject({ method: 'GET', url: `/dateien/${datei.id}`, headers: auth() })
      ).json();
    }
    erwarte(datei.status === 'bereit', `Status ${datei.status}`);
    origLog(
      `    Zusammenfassung: ${auszug(datei.zusammenfassung ?? datei.kiZusammenfassung ?? JSON.stringify(datei))}`,
    );
  });

  const chatId = (
    await app.inject({
      method: 'POST',
      url: '/chats',
      headers: auth(),
      payload: { fachId, themaId: themaA, modus: 'erklaeren' },
    })
  ).json().id as string;

  await schritt('Calls 02–07 — Chat-Antwort (Themen-Memory, Modus erklären) + Titel', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/chats/${chatId}/nachrichten`,
      headers: auth(),
      payload: { text: 'Wie kürze ich 8/12 und warum darf ich das?' },
    });
    erwarte(res.statusCode === 200, `${res.statusCode}: ${res.body}`);
    const antwort = res.json().nachrichten.at(-1).text as string;
    erwarte(!antwort.includes('Platzhalter'), 'Antwort ist noch Platzhalter — Fake-Client aktiv?');
    origLog(`    Antwort: ${auszug(antwort)}`);
    const chat = (
      await app.inject({ method: 'GET', url: `/chats/${chatId}`, headers: auth() })
    ).json();
    origLog(`    Titel: ${chat.titel}`);
  });

  await schritt('Chat — Folgefrage (Prompt-Caching)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/chats/${chatId}/nachrichten`,
      headers: auth(),
      payload: { text: 'Kannst du mir noch ein zweites Beispiel mit 15/25 geben?' },
    });
    erwarte(res.statusCode === 200, `${res.statusCode}: ${res.body}`);
    const cache = schrittUsage.map((z) => JSON.stringify(z.usage)).join(' ');
    origLog(`    Usage: ${cache}`);
  });

  await schritt('Themen-Guard — themenfremde Anfrage wird abgewiesen (kein Call)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/chats/${chatId}/nachrichten`,
      headers: auth(),
      payload: { text: 'Gib mir ein Rezept für Lasagne' },
    });
    erwarte(res.statusCode === 400, `erwartet 400, war ${res.statusCode}`);
  });

  let lernzettelId = '';
  await schritt('Call 08 — Lernzettel-Erstellung', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/themen/${themaA}/lernzettel`,
      headers: auth(),
    });
    erwarte(res.statusCode === 201, `${res.statusCode}: ${res.body}`);
    lernzettelId = res.json().id;
    origLog(`    Inhalt: ${auszug(res.json().content)}`);
  });

  await schritt('Call 09 — Lernzettel-Revision', async () => {
    erwarte(lernzettelId, 'kein Lernzettel aus Call 08');
    const res = await app.inject({
      method: 'POST',
      url: `/lernzettel/${lernzettelId}/revisionen`,
      headers: auth(),
      payload: { text: 'Füge bitte ein Beispiel mit gemischten Zahlen hinzu.' },
    });
    erwarte(res.statusCode === 200, `${res.statusCode}: ${res.body}`);
    origLog(
      `    Antwort: ${auszug(res.json().antwortText ?? res.json().revisionen?.at(-1)?.antwortText)}`,
    );
  });

  let lernplanId = '';
  let testklausur1Id = '';
  await schritt('Call 10 — Testklausur-Erstellung (POST /klausuren)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/klausuren',
      headers: auth(),
      payload: { fachId, themaIds: [themaA, themaB], titel: 'Mathe-Klausur', datum: '2026-12-01' },
    });
    erwarte(res.statusCode === 201, `${res.statusCode}: ${res.body}`);
    lernplanId = res.json().lernplan.id;
    testklausur1Id = res.json().testklausur1.id;
    const aufgaben = res.json().testklausur1.aufgaben as { frage: string }[];
    origLog(`    ${aufgaben.length} Aufgaben, z. B.: ${auszug(aufgaben[0]?.frage)}`);
  });

  await schritt('Call 11 — Testklausur-Analyse', async () => {
    erwarte(testklausur1Id, 'keine Testklausur aus Call 10');
    await app.inject({
      method: 'POST',
      url: `/testklausuren/${testklausur1Id}/loesung`,
      headers: auth(),
      payload: {
        loesungsText: '1) 8/12 = 4/6, weiter weiß ich nicht\n2) 320 × 0,15 = 48, neuer Preis 272',
      },
    });
    const res = await app.inject({
      method: 'POST',
      url: `/testklausuren/${testklausur1Id}/analyse`,
      headers: auth(),
    });
    erwarte(res.statusCode === 200, `${res.statusCode}: ${res.body}`);
    for (const v of res.json().vorbereitung as {
      themaId: string;
      prozent: number;
      note: number;
      ampel: string;
    }[]) {
      origLog(
        `    ${v.themaId === themaA ? 'Bruchrechnung' : 'Prozentrechnung'}: ${v.prozent} % → Note ${v.note} (${v.ampel})`,
      );
    }
  });

  await schritt('Call 12 — Lernplan-Lernzettel', async () => {
    erwarte(lernplanId, 'kein Lernplan aus Call 10');
    const res = await app.inject({
      method: 'POST',
      url: `/lernplaene/${lernplanId}/lernzettel`,
      headers: auth(),
      payload: { themaIds: [themaA] },
    });
    erwarte(res.statusCode === 200, `${res.statusCode}: ${res.body}`);
    origLog(`    Inhalt: ${auszug(res.json().content)}`);
  });

  const gesamt = alleUsage.reduce((s, z) => s + z.kostenEurMikro, 0);
  origLog(`\n${alleUsage.length} KI-Calls, geschätzt ${eur(gesamt)} gesamt, ${fehler} Fehler.`);
}

main()
  .catch((e) => {
    fehler += 1;
    origLog('Abbruch:', e);
  })
  .finally(async () => {
    await prisma.user.delete({ where: { email } }).catch(() => undefined);
    await app.close();
    process.exit(fehler ? 1 : 0);
  });
