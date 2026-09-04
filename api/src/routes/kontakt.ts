import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { HttpError } from '../lib/http.js';

const body = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(320),
  thema: z.string().trim().min(1).max(160),
  nachricht: z.string().trim().min(1).max(5000),
  // Honeypot: per CSS verstecktes Feld. Echte Nutzer lassen es leer; ist es
  // gefüllt, tun wir so als ob (200) und verwerfen still.
  website: z.string().max(200).optional(),
});

// einfaches In-Memory-IP-Limit; das „echte" Rate-Limiting kommt in Phase 15.
const fenster = 60_000;
const maxProFenster = 5;
const treffer = new Map<string, number[]>();

function ipLimitUeberschritten(ip: string): boolean {
  const jetzt = Date.now();
  const liste = (treffer.get(ip) ?? []).filter((t) => jetzt - t < fenster);
  liste.push(jetzt);
  treffer.set(ip, liste);
  return liste.length > maxProFenster;
}

export async function kontaktRoutes(app: FastifyInstance): Promise<void> {
  // POST /kontakt — kein Login nötig. Zielsystem (Support-Postfach/Ticket) ist
  // noch offen (Phase 0 / §8) — vorerst nur strukturiertes Logging.
  app.post('/kontakt', async (req, reply) => {
    if (ipLimitUeberschritten(req.ip)) throw new HttpError(429, 'zu_viele_anfragen');
    const data = parse(body, req.body);

    if (data.website) {
      // Bot: still schlucken, so tun als ob ok.
      return reply.send({ ok: true });
    }

    req.log.info(
      { kontakt: { name: data.name, email: data.email, thema: data.thema } },
      'kontaktformular',
    );
    // TODO(Phase 0/§8): an Support-Postfach / Ticketsystem weiterreichen.
    return reply.send({ ok: true });
  });
}
