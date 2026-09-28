import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { HttpError } from '../lib/http.js';
import { parse } from '../lib/validate.js';
import { fehlerMelden } from '../lib/sentry.js';

/**
 * Kündigungsbutton nach §312k BGB (2026-09-28): „Verträge hier kündigen" im
 * Footer → `marketing/kuendigen/` → `POST /kuendigung`. Kein Login (darf
 * nicht verlangt werden). Rate-Limit wie das Kontaktformular (3/min/IP).
 *
 * - Gehört die E-Mail einem Account-Inhaber mit laufendem Abo und ist es eine
 *   ordentliche Kündigung zum nächstmöglichen Zeitpunkt (oder zu einem Datum
 *   bis zum Periodenende): automatisch zum Periodenende kündigen — dieselbe
 *   Logik wie `POST /abo/kuendigen` in der App.
 * - Sonst (außerordentlich, späteres Datum, kein Abo gefunden): nicht
 *   automatisch, Kopie an KONTAKT_EMPFAENGER zur manuellen Bearbeitung.
 * - Immer: Eingangsbestätigung per Mail an die angegebene Adresse (Inhalt,
 *   Eingang mit Datum/Uhrzeit, Vertragsende bzw. „wir melden uns") + interne
 *   Kopie. Die Antwort ist für jede E-Mail gleich — sie verrät nicht, ob es
 *   ein Konto gibt; das Enddatum steht nur in der Mail an diese Adresse.
 */

const body = z
  .object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().toLowerCase().email().max(320),
    art: z.enum(['ordentlich', 'ausserordentlich']),
    grund: z.string().trim().max(2000).optional(),
    zeitpunkt: z.enum(['naechstmoeglich', 'datum']),
    datum: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    // Honeypot wie beim Kontaktformular
    website: z.string().max(200).optional(),
  })
  .refine((b) => b.art !== 'ausserordentlich' || !!b.grund, { path: ['grund'] })
  .refine((b) => b.zeitpunkt !== 'datum' || !!b.datum, { path: ['datum'] });

const ZONE = 'Europe/Berlin';
const tagDe = (d: Date) =>
  d.toLocaleDateString('de-DE', { timeZone: ZONE, day: 'numeric', month: 'long', year: 'numeric' });
const zeitDe = (d: Date) =>
  `${tagDe(d)} um ${d.toLocaleTimeString('de-DE', { timeZone: ZONE, hour: '2-digit', minute: '2-digit' })} Uhr`;

/** Abo-Status, bei denen noch etwas zu kündigen ist. */
const KUENDBAR = new Set(['test', 'aktiv', 'pausiert', 'zahlung_offen']);

export async function kuendigungRoutes(app: FastifyInstance): Promise<void> {
  const { prisma, zahlung, mail } = app;

  app.post('/kuendigung', async (req, reply) => {
    const data = parse(body, req.body);
    const eingang = new Date();
    const antwort = { ok: true, eingangAm: eingang.toISOString() };
    if (data.website) return reply.send(antwort);

    const wunschDatum = data.zeitpunkt === 'datum' ? new Date(`${data.datum}T00:00:00Z`) : null;
    if (
      wunschDatum &&
      wunschDatum.getTime() <
        Date.UTC(eingang.getUTCFullYear(), eingang.getUTCMonth(), eingang.getUTCDate())
    ) {
      throw new HttpError(400, 'validierung', { datum: 'liegt in der Vergangenheit' });
    }

    // Nur Account-Inhaber:innen haben ein eigenes Abo (Kind-Profile nicht).
    const user = await prisma.user.findUnique({ where: { email: data.email } });
    const abo = user?.aboId ? await prisma.abo.findUnique({ where: { id: user.aboId } }) : null;
    const eigenes = abo && abo.ownerUserId === user!.id ? abo : null;
    const endeMoeglich = eigenes
      ? eigenes.status === 'test' && eigenes.trialEndetAm
        ? eigenes.trialEndetAm
        : eigenes.aktuellerZeitraumEnde
      : null;

    let automatisch = false;
    let ergebnisText: string;
    let konto = 'kein Konto/Abo zu dieser E-Mail';
    if (eigenes && endeMoeglich) {
      konto = `User ${user!.id}, Abo ${eigenes.id} (${eigenes.status}, ${eigenes.paket}/${eigenes.intervall}, endet regulär ${tagDe(endeMoeglich)})`;
    }

    const autoMoeglich =
      eigenes &&
      endeMoeglich &&
      data.art === 'ordentlich' &&
      (!wunschDatum || wunschDatum.getTime() <= endeMoeglich.getTime());

    if (autoMoeglich && eigenes.status === 'gekuendigt') {
      automatisch = true;
      ergebnisText =
        endeMoeglich.getTime() < eingang.getTime()
          ? `Dein Abo ist bereits beendet (seit ${tagDe(endeMoeglich)}). Es wird nichts mehr abgebucht.`
          : `Dein Abo war bereits gekündigt und endet zum ${tagDe(endeMoeglich)}. Bis dahin kannst du Lesify weiter nutzen.`;
    } else if (autoMoeglich && KUENDBAR.has(eigenes.status)) {
      await zahlung.subscriptionKuendigen(eigenes.zahlungsanbieterRef ?? eigenes.id);
      await prisma.abo.update({ where: { id: eigenes.id }, data: { status: 'gekuendigt' } });
      app.zugriffCache.zuruecksetzen();
      automatisch = true;
      ergebnisText =
        eigenes.status === 'test'
          ? `Deine Kündigung ist wirksam: Dein Abo endet mit der Testphase am ${tagDe(endeMoeglich)} — es wird nichts abgebucht.`
          : `Deine Kündigung ist wirksam: Dein Abo endet zum ${tagDe(endeMoeglich)}. Bis dahin kannst du Lesify weiter nutzen, danach wird nichts mehr abgebucht.`;
    } else {
      ergebnisText = eigenes
        ? 'Wir haben deine Kündigung erhalten und prüfen sie. Innerhalb von zwei Werktagen bestätigen wir dir per E-Mail, zu welchem Datum dein Vertrag endet.'
        : 'Wir haben deine Kündigung erhalten. Zu dieser E-Mail-Adresse haben wir kein laufendes Abo gefunden — wir prüfen das und melden uns innerhalb von zwei Werktagen. Falls du mit einer anderen Adresse registriert bist, antworte gern auf diese E-Mail.';
    }

    const mailDaten = {
      name: data.name,
      email: data.email,
      artText:
        data.art === 'ordentlich'
          ? 'ordentliche Kündigung'
          : 'außerordentliche (fristlose) Kündigung',
      grund: data.art === 'ausserordentlich' ? (data.grund ?? null) : null,
      zeitpunktText: wunschDatum ? `zum ${tagDe(wunschDatum)}` : 'zum nächstmöglichen Zeitpunkt',
      eingangText: zeitDe(eingang),
      ergebnisText,
      automatisch,
    };
    req.log.info(
      { kuendigung: { automatisch, art: data.art, zeitpunkt: data.zeitpunkt } },
      'kuendigung',
    );

    const [intern, bestaetigung] = await Promise.allSettled([
      mail.kuendigungInternSenden({ ...mailDaten, konto }),
      mail.kuendigungBestaetigungSenden(mailDaten),
    ]);
    for (const r of [intern, bestaetigung]) {
      if (r.status === 'rejected') {
        req.log.error({ err: r.reason }, 'kuendigung_versand_fehlgeschlagen');
        fehlerMelden(r.reason, { route: 'POST /kuendigung' });
      }
    }
    // Nicht automatisch erledigt und die interne Kopie kam nicht an → die
    // Kündigung wäre verloren; die Person muss es erneut versuchen.
    if (!automatisch && intern.status === 'rejected') {
      throw new HttpError(503, 'kuendigung_versand_fehlgeschlagen');
    }
    return reply.send(antwort);
  });
}
