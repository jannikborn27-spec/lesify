import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { oder404 } from '../lib/scope.js';
import { userDTO } from '../lib/dto.js';

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
}
