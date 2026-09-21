/**
 * Beispiel-Elternaccount für Screenshots (eltern@lesify.de): Familien-Abo
 * Premium (2 Sitze) mit zwei Kindern —
 *   1. Lena M. = der Dev-Account (dev@lesify.de, voller Beispiel-Content),
 *   2. Jonas M. = Kind-Profil ohne eigenen Login mit etwas Content.
 *
 * Aufruf (NACH seed-dev-account.ts):
 *   pnpm --filter ./api exec tsx prisma/seed-eltern-account.ts
 * Idempotent: entfernt zuerst den bisherigen Elternaccount samt Jonas und
 * legt alles neu an. Lena bleibt erhalten und wird wieder verknüpft; wird
 * seed-dev-account.ts danach erneut ausgeführt, behält es die Verknüpfung.
 */
import {
  PrismaClient,
  Rolle,
  KiTonfall,
  ChatModus,
  NachrichtRolle,
  AboPaket,
  AboArt,
  AboIntervall,
  AboStatus,
  TestklausurStatus,
  type Ampel,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PLAN_LIMITS, prozentZuNote, noteAmpel } from '@lesify/shared';
import { hashPasswort } from '../src/lib/password.js';

const prisma = new PrismaClient();
const ELTERN_EMAIL = 'eltern@lesify.de';
const ELTERN_PASSWORT = 'LesifyEltern-2026!';
const DEV_EMAIL = 'dev@lesify.de';

const now = Date.now();
const hoursAgo = (n: number) => new Date(now - n * 3_600_000);
const daysAgo = (n: number) => new Date(now - n * 86_400_000);
const isoDatum = (tageAb: number) => new Date(now + tageAb * 86_400_000).toISOString().slice(0, 10);

async function main() {
  const dev = await prisma.user.findUnique({ where: { email: DEV_EMAIL } });
  if (!dev) throw new Error('Dev-Account fehlt — zuerst seed-dev-account.ts ausführen.');

  // ---- aufräumen: alter Elternaccount + dessen login-lose Kind-Profile
  const alt = await prisma.user.findUnique({ where: { email: ELTERN_EMAIL } });
  if (alt) {
    await prisma.user.deleteMany({ where: { parentUserId: alt.id, email: null } });
    await prisma.user.update({ where: { id: dev.id }, data: { parentUserId: null, aboId: null } });
    await prisma.user.delete({ where: { id: alt.id } }); // Cascade: Abo, Einstellungen, Sessions
  }

  // ---- Elternaccount + Familien-Abo
  const elternId = randomUUID();
  const aboId = randomUUID();
  const periodenEnde = new Date(now);
  periodenEnde.setMonth(periodenEnde.getMonth() + 1, 1);
  await prisma.user.create({
    data: {
      id: elternId,
      name: 'Sabine Müller',
      email: ELTERN_EMAIL,
      rolle: Rolle.elternteil,
      passwordHash: await hashPasswort(ELTERN_PASSWORT),
      emailVerifiedAt: daysAgo(60),
      einwilligungAm: daysAgo(60),
      createdAt: daysAgo(60),
      einstellungen: {
        create: {
          erinnerungVorKlausuren: true,
          woechentlicheZusammenfassung: true,
          kiTonfall: KiTonfall.freundlich,
        },
      },
    },
  });
  await prisma.abo.create({
    data: {
      id: aboId,
      ownerUserId: elternId,
      paket: AboPaket.premium,
      art: AboArt.familie,
      sitze: 2,
      intervall: AboIntervall.monatlich,
      status: AboStatus.aktiv,
      aktuellerZeitraumEnde: periodenEnde,
      erstelltAm: daysAgo(45),
    },
  });
  await prisma.user.update({ where: { id: elternId }, data: { aboId } });

  // ---- Kind 1: Lena (Dev-Account) verknüpfen, gehört jetzt zum Familien-Abo
  const eigenesAboVonLena = await prisma.abo.findMany({
    where: { ownerUserId: dev.id },
    select: { id: true },
  });
  await prisma.user.update({ where: { id: dev.id }, data: { parentUserId: elternId, aboId } });
  if (eigenesAboVonLena.length) {
    await prisma.abo.deleteMany({ where: { id: { in: eigenesAboVonLena.map((a) => a.id) } } });
  }

  // ---- Kind 2: Jonas (6. Klasse, Kind-Profil ohne Login)
  const J = randomUUID();
  await prisma.user.create({
    data: {
      id: J,
      name: 'Jonas Müller',
      klassenstufe: '6. Klasse',
      rolle: Rolle.schueler,
      parentUserId: elternId,
      aboId,
      passwordHash: 'kind:kein-login',
      createdAt: daysAgo(40),
      einstellungen: { create: { erinnerungVorKlausuren: true, kiTonfall: KiTonfall.motivierend } },
    },
  });
  const L = PLAN_LIMITS.premium;
  await prisma.usage.create({
    data: {
      userId: J,
      monat: new Date(now).toISOString().slice(0, 7),
      nachrichtenUsed: 38,
      nachrichtenLimit: L.nachrichten,
      dateienUsed: 2,
      dateienLimit: L.dateien,
      lernzettelUsed: 1,
      lernzettelLimit: L.lernzettel,
      testklausurenUsed: 1,
      testklausurenLimit: L.testklausuren,
    },
  });

  const fMathe = randomUUID();
  const fEnglisch = randomUUID();
  await prisma.fach.createMany({
    data: [
      {
        id: fMathe,
        userId: J,
        name: 'Mathematik',
        klasse: '6. Klasse',
        initial: 'M',
        farbe: 'blue',
        icon: 'mathematik',
      },
      {
        id: fEnglisch,
        userId: J,
        name: 'Englisch',
        klasse: '6. Klasse',
        initial: 'E',
        farbe: 'amber',
        icon: 'englisch',
      },
    ],
  });
  const tBruch = randomUUID();
  const tWinkel = randomUUID();
  const tPast = randomUUID();
  await prisma.thema.createMany({
    data: [
      {
        id: tBruch,
        userId: J,
        fachId: fMathe,
        name: 'Bruchrechnung',
        beschreibung: 'Brüche kürzen, erweitern, addieren und vergleichen.',
      },
      {
        id: tWinkel,
        userId: J,
        fachId: fMathe,
        name: 'Winkel und Dreiecke',
        beschreibung: 'Winkelarten messen und zeichnen, Winkelsumme im Dreieck.',
      },
      {
        id: tPast,
        userId: J,
        fachId: fEnglisch,
        name: 'Simple Past',
        beschreibung: 'Regelmäßige und unregelmäßige Verben in der Vergangenheit.',
      },
    ],
  });

  const chats: {
    fach: string;
    thema: string;
    titel: string;
    modus: ChatModus;
    h: number;
    msgs: [string, string][];
  }[] = [
    {
      fach: fMathe,
      thema: tBruch,
      titel: 'Brüche kürzen — wie geht das?',
      modus: ChatModus.erklaeren,
      h: 5,
      msgs: [
        ['user', 'Wie kürze ich den Bruch 12/18?'],
        [
          'ai',
          'Beim Kürzen teilst du Zähler und Nenner durch dieselbe Zahl. Suche zuerst eine Zahl, durch die **beide** teilbar sind — hier passt die 6:\n\n12 : 6 = 2 und 18 : 6 = 3\n\nAlso ist **12/18 = 2/3**. Der Wert des Bruchs bleibt gleich, nur die Darstellung wird einfacher. 🍕\n\nProbier es selbst mit 15/20!',
        ],
        ['user', '15/20 durch 5 ist 3/4'],
        [
          'ai',
          'Richtig! ✅ 15 : 5 = 3 und 20 : 5 = 4, also **3/4**. Und weil 3 und 4 keinen gemeinsamen Teiler mehr haben, ist der Bruch vollständig gekürzt.',
        ],
      ],
    },
    {
      fach: fEnglisch,
      thema: tPast,
      titel: 'Simple Past: unregelmäßige Verben',
      modus: ChatModus.ueben,
      h: 30,
      msgs: [
        ['user', 'Kannst du mich zu unregelmäßigen Verben abfragen?'],
        [
          'ai',
          'Klar! Bilde die Vergangenheit (Simple Past):\n\n1. go → ?\n2. see → ?\n3. eat → ?\n4. buy → ?',
        ],
        ['user', 'went, saw, ate, bought'],
        [
          'ai',
          'Alle vier richtig! 🎉 go → **went**, see → **saw**, eat → **ate**, buy → **bought**. Willst du noch eine Runde?',
        ],
      ],
    },
  ];
  for (const c of chats) {
    const chatId = randomUUID();
    await prisma.chat.create({
      data: {
        id: chatId,
        userId: J,
        fachId: c.fach,
        themaId: c.thema,
        titel: c.titel,
        modus: c.modus,
        erstelltAm: hoursAgo(c.h + 1),
        aktualisiertAm: hoursAgo(c.h),
      },
    });
    await prisma.nachricht.createMany({
      data: c.msgs.map(([rolle, text], i) => ({
        userId: J,
        chatId,
        rolle: rolle === 'user' ? NachrichtRolle.user : NachrichtRolle.ai,
        text,
        erstelltAm: new Date(hoursAgo(c.h + 1).getTime() + i * 90_000),
        zaehltGegenLimit: rolle === 'user',
      })),
    });
  }

  // Klausur in 6 Tagen + analysierte Testklausur 1 + Lernplan
  const klausurId = randomUUID();
  const tkId = randomUUID();
  await prisma.klausur.create({
    data: {
      id: klausurId,
      userId: J,
      fachId: fMathe,
      themaIds: [tBruch, tWinkel],
      titel: 'Mathe Klausur — Brüche & Winkel',
      datum: new Date(isoDatum(6)),
      erstelltAm: daysAgo(3),
    },
  });
  const ergebnis = [
    {
      themaId: tBruch,
      prozent: 88,
      erklaerung:
        'Brüche werden sicher gekürzt und verglichen. Nur bei einer Addition wurde der gemeinsame Nenner vergessen.',
    },
    {
      themaId: tWinkel,
      prozent: 42,
      erklaerung:
        'Winkelarten sind bekannt, aber die Winkelsumme im Dreieck (180°) wurde nicht angewendet. Dieses Thema sollte noch geübt werden.',
    },
  ];
  await prisma.testklausur.create({
    data: {
      id: tkId,
      userId: J,
      klausurId,
      fachId: fMathe,
      themaIds: [tBruch, tWinkel],
      titel: 'Testklausur 1 — Mathe Klausur — Brüche & Winkel',
      status: TestklausurStatus.analysiert,
      erstelltAm: daysAgo(2),
      aufgaben: {
        create: [
          {
            userId: J,
            themaId: tBruch,
            frage:
              'Berechne 1/4 + 2/3 und kürze das Ergebnis, falls möglich. Schreibe deinen Rechenweg auf.',
            reihenfolge: 0,
          },
          {
            userId: J,
            themaId: tWinkel,
            frage:
              'In einem Dreieck sind die Winkel α = 52° und β = 73° bekannt. Berechne γ und benenne die Dreiecksart.',
            reihenfolge: 1,
          },
        ],
      },
      ergebnisse: {
        create: ergebnis.map((e) => ({
          userId: J,
          themaId: e.themaId,
          prozent: e.prozent,
          note: prozentZuNote(e.prozent),
          erklaerung: e.erklaerung,
        })),
      },
      vorbereitung: {
        create: ergebnis.map((e) => ({
          userId: J,
          themaId: e.themaId,
          prozent: e.prozent,
          note: prozentZuNote(e.prozent),
          ampel: noteAmpel(prozentZuNote(e.prozent)) as Ampel,
        })),
      },
    },
  });
  await prisma.lernplan.create({
    data: {
      userId: J,
      klausurId,
      testklausur1Id: tkId,
      checklist: { '2': { [`fehler:${tWinkel}`]: true, [`beispiel:${tWinkel}`]: true } },
      tageErledigt: [],
      erstelltAm: daysAgo(2),
    },
  });

  console.log(
    'Elternaccount bereit:',
    ELTERN_EMAIL,
    '— Kinder: Lena M. (dev@lesify.de), Jonas Müller',
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
