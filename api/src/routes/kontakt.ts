import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { HttpError } from '../lib/http.js';
import { parse } from '../lib/validate.js';

const body = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(320),
  thema: z.string().trim().min(1).max(160),
  nachricht: z.string().trim().min(1).max(5000),
  // Honeypot: per CSS verstecktes Feld. Echte Nutzer lassen es leer; ist es
  // gefüllt, tun wir so als ob (200) und verwerfen still.
  website: z.string().max(200).optional(),
});

export async function kontaktRoutes(app: FastifyInstance): Promise<void> {
  // POST /kontakt — kein Login nötig. IP-Rate-Limit läuft global (§7, Phase 15,
  // Klasse „kontakt"). Zustellung per Resend an KONTAKT_EMPFAENGER
  // (kontakt@lesify.de, Entscheidung 2026-09-23), Reply-To = Absender:in.
  app.post('/kontakt', async (req, reply) => {
    const data = parse(body, req.body);

    if (data.website) {
      // Bot: still schlucken, so tun als ob ok.
      return reply.send({ ok: true });
    }

    req.log.info(
      { kontakt: { name: data.name, email: data.email, thema: data.thema } },
      'kontaktformular',
    );
    // Anders als bei Registrierung/Reset: hier gibt es keinen zweiten Weg zur
    // Nachricht — schlägt der Versand fehl, muss die Person das erfahren.
    try {
      await app.mail.kontaktSenden(data);
    } catch (err) {
      req.log.error({ err }, 'kontakt_versand_fehlgeschlagen');
      throw new HttpError(503, 'kontakt_versand_fehlgeschlagen');
    }
    return reply.send({ ok: true });
  });
}
