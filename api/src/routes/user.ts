import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { oder404 } from '../lib/scope.js';
import { userDTO } from '../lib/dto.js';
import { pruefePasswort } from '../lib/password.js';
import { HttpError } from '../lib/http.js';

const profilPatch = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    klassenstufe: z.string().trim().min(1).max(40).optional(),
  })
  .refine((o) => o.name !== undefined || o.klassenstufe !== undefined, 'nichts zu ändern');

const einstellungenPatch = z
  .object({
    erinnerungVorKlausuren: z.boolean().optional(),
    woechentlicheZusammenfassung: z.boolean().optional(),
    kiTonfall: z.enum(['freundlich', 'direkt', 'motivierend']).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, 'nichts zu ändern');

export async function userRoutes(app: FastifyInstance): Promise<void> {
  const { prisma } = app;
  app.addHook('preHandler', app.requireAuth);

  app.get('/user', async (req) => {
    const user = oder404(await prisma.user.findUnique({ where: { id: req.userId } }));
    return userDTO(user);
  });

  app.patch('/user', async (req) => {
    const body = parse(profilPatch, req.body);
    const user = await prisma.user.update({ where: { id: req.userId }, data: body });
    return userDTO(user);
  });

  app.get('/user/einstellungen', async (req) => {
    const e = await prisma.einstellungen.upsert({
      where: { userId: req.userId },
      update: {},
      create: { userId: req.userId },
    });
    return e;
  });

  app.patch('/user/einstellungen', async (req) => {
    const body = parse(einstellungenPatch, req.body);
    const e = await prisma.einstellungen.upsert({
      where: { userId: req.userId },
      update: body,
      create: { userId: req.userId, ...body },
    });
    return e;
  });

  // ---- DSGVO Art. 15 — Datenexport (alle personenbezogenen Daten als JSON) ----
  app.get('/user/export', async (req, reply) => {
    const uid = req.userId;
    const [
      user,
      einstellungen,
      abo,
      faecher,
      themen,
      chats,
      lernzettel,
      dateien,
      klausuren,
      lernplaene,
      testklausuren,
      usage,
    ] = await prisma.$transaction([
      prisma.user.findUnique({ where: { id: uid } }),
      prisma.einstellungen.findUnique({ where: { userId: uid } }),
      prisma.abo.findFirst({ where: { ownerUserId: uid } }),
      prisma.fach.findMany({ where: { userId: uid } }),
      prisma.thema.findMany({ where: { userId: uid } }),
      prisma.chat.findMany({ where: { userId: uid }, include: { nachrichten: true } }),
      prisma.lernzettel.findMany({ where: { userId: uid }, include: { revisionen: true } }),
      prisma.datei.findMany({ where: { userId: uid } }),
      prisma.klausur.findMany({ where: { userId: uid } }),
      prisma.lernplan.findMany({ where: { userId: uid } }),
      prisma.testklausur.findMany({
        where: { userId: uid },
        include: { aufgaben: true, ergebnisse: true, vorbereitung: true },
      }),
      prisma.usage.findMany({ where: { userId: uid } }),
    ]);

    const kinder =
      user?.rolle === 'elternteil'
        ? await prisma.user.findMany({
            where: { parentUserId: uid },
            select: { id: true, name: true, klassenstufe: true },
          })
        : [];

    reply.header('Content-Disposition', 'attachment; filename="lesify-datenexport.json"');
    return {
      exportiertAm: new Date().toISOString(),
      hinweis: 'Vollständiger Export der zu deinem Konto gespeicherten Daten (DSGVO Art. 15).',
      user: user && { ...user, passwordHash: undefined },
      einstellungen,
      abo,
      kinder,
      faecher,
      themen,
      chats,
      lernzettel,
      dateien,
      klausuren,
      lernplaene,
      testklausuren,
      usage,
    };
  });

  // ---- DSGVO Art. 17 — Konto & alle Inhalte hart löschen ----
  app.post('/user/loeschen', async (req) => {
    const body = parse(z.object({ passwort: z.string().min(1).max(200) }), req.body);
    const user = oder404(await prisma.user.findUnique({ where: { id: req.userId } }));
    const ok = user.passwordHash.startsWith('kind:')
      ? false
      : await pruefePasswort(user.passwordHash, body.passwort);
    if (!ok) throw new HttpError(401, 'passwort_falsch');

    // Phase 5: vor dem Löschen die Objektspeicher-Keys aller Dateien einsammeln
    // und im Bucket entfernen (inkl. der Kind-Profile).
    const kinder = await prisma.user.findMany({
      where: { parentUserId: req.userId },
      select: { id: true },
    });
    await prisma.$transaction([
      ...kinder.map((k) => prisma.user.delete({ where: { id: k.id } })),
      prisma.user.delete({ where: { id: req.userId } }),
    ]);
    // Cascade räumt Einstellungen, Fächer/Themen/Chats/…, Sessions, Abo (owner) mit.
    return { geloescht: true, kindProfileGeloescht: kinder.length };
  });
}
