import { beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../app.js';
import { getPrisma } from '../db.js';
import {
  abgelaufeneTokenLoeschen,
  alteUsageZeilenLoeschen,
  inhalteAelterAlsEinJahrLoeschen,
} from './jobs.js';

const hatDb = !!process.env.DATABASE_URL;

describe.runIf(hatDb)('Wartungs-Jobs (Supabase)', () => {
  const app = buildApp({ logger: false });
  const prisma = getPrisma();
  let userId = '';
  let fachId = '';
  let themaId = '';

  beforeAll(async () => {
    await app.ready();
    const email = `jobs+${crypto.randomUUID()}@jobs.lesify.test`;
    const passwort = 'jobs-test-pass-1234';
    await app.inject({
      method: 'POST',
      url: '/auth/registrieren',
      payload: { rolle: 'schueler', name: 'Jobs', klassenstufe: '8. Klasse', email, passwort },
    });
    const token = (
      await app.inject({ method: 'POST', url: '/auth/login', payload: { email, passwort } })
    ).json().token;
    const auth = { authorization: `Bearer ${token}` };
    userId = (await app.inject({ method: 'GET', url: '/auth/me', headers: auth })).json().user.id;
    fachId = (
      await app.inject({
        method: 'POST',
        url: '/faecher',
        headers: auth,
        payload: { name: 'Mathe', icon: 'mathematik' },
      })
    ).json().id;
    themaId = (
      await app.inject({
        method: 'POST',
        url: '/themen',
        headers: auth,
        payload: { fachId, name: 'Bruchrechnung' },
      })
    ).json().id;
  });

  it('inhalte-aufbewahrung löscht >1 Jahr alte Inhalte, jüngere bleiben', async () => {
    const alt = new Date();
    alt.setUTCFullYear(alt.getUTCFullYear() - 2);
    const jung = new Date();

    const mkChat = (erstelltAm: Date) =>
      prisma.chat.create({
        data: { userId, fachId, themaId, titel: 't', modus: null, erstelltAm },
      });
    const mkLernzettel = (erstelltAm: Date) =>
      prisma.lernzettel.create({
        data: { userId, fachId, themaId, titel: 'lz', content: '# lz', erstelltAm },
      });

    const altChat = await mkChat(alt);
    const jungChat = await mkChat(jung);
    const altLz = await mkLernzettel(alt);
    const jungLz = await mkLernzettel(jung);

    const stat = await inhalteAelterAlsEinJahrLoeschen(prisma);
    expect(stat.chats).toBeGreaterThanOrEqual(1);
    expect(stat.lernzettel).toBeGreaterThanOrEqual(1);

    expect(await prisma.chat.findUnique({ where: { id: altChat.id } })).toBeNull();
    expect(await prisma.lernzettel.findUnique({ where: { id: altLz.id } })).toBeNull();
    expect(await prisma.chat.findUnique({ where: { id: jungChat.id } })).not.toBeNull();
    expect(await prisma.lernzettel.findUnique({ where: { id: jungLz.id } })).not.toBeNull();

    // Fach/Thema/User bleiben unangetastet.
    expect(await prisma.user.findUnique({ where: { id: userId } })).not.toBeNull();
    expect(await prisma.fach.findUnique({ where: { id: fachId } })).not.toBeNull();
  });

  it('usage-historie entfernt Zeilen älter als 12 Monate', async () => {
    await prisma.usage.create({
      data: {
        userId,
        monat: '2000-01',
        nachrichtenLimit: 100,
        dateienLimit: 20,
        lernzettelLimit: 5,
        testklausurenLimit: 1,
      },
    });
    const r = await alteUsageZeilenLoeschen(prisma);
    expect(r.geloescht).toBeGreaterThanOrEqual(1);
    expect(
      await prisma.usage.findUnique({ where: { userId_monat: { userId, monat: '2000-01' } } }),
    ).toBeNull();
  });

  it('token-hygiene löscht abgelaufene Sessions', async () => {
    await prisma.session.create({
      data: {
        userId,
        tokenHash: `abgelaufen-${crypto.randomUUID()}`,
        ablaeuftAm: new Date(Date.now() - 86_400_000),
      },
    });
    const r = await abgelaufeneTokenLoeschen(prisma);
    expect(r.sessions).toBeGreaterThanOrEqual(1);
  });
});
