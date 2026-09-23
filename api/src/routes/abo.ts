import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { aboArtFuerSitze, aboPreis, istGueltigeSitzzahl } from '@lesify/shared';
import { parse } from '../lib/validate.js';
import { oder404 } from '../lib/scope.js';
import { HttpError } from '../lib/http.js';
import { aboDTO } from '../lib/abo.js';
import { inTagen, neuesToken } from '../lib/tokens.js';
import { env, istProd } from '../env.js';

const KIND_EINLADUNG_TAGE = 14;

const einladungBody = z.object({ email: z.string().trim().toLowerCase().email().max(320) });

const paketEnum = z.enum(['starter', 'premium', 'infinite']);
const intervallEnum = z.enum(['monatlich', 'jaehrlich']);

const anlegenBody = z.object({
  paket: paketEnum,
  intervall: intervallEnum,
  sitze: z.number().int().min(1).max(4).optional(),
  // Nur fürs Zahlungsanbieter-Kundenkonto (Stripe Customer.email für Rechnungen) —
  // Login läuft über den Account, der beim Registrieren schon existiert.
  email: z.string().trim().toLowerCase().email().max(320).optional(),
});

const aendernBody = z
  .object({
    paket: paketEnum.optional(),
    intervall: intervallEnum.optional(),
    sitze: z.number().int().min(1).max(4).optional(),
  })
  .refine((o) => Object.keys(o).length > 0, 'nichts zu ändern');

const kindBody = z.object({
  name: z.string().trim().min(1).max(120),
  klassenstufe: z.string().trim().min(1).max(40),
});

export async function aboRoutes(app: FastifyInstance): Promise<void> {
  const { prisma, zahlung } = app;

  // ---- POST /abo/webhook — Callback vom Zahlungsanbieter, KEIN Login ----------
  app.post('/abo/webhook', async (req) => {
    // Echter Roh-Body (vom Content-Type-Parser in app.ts mitgeschnitten) —
    // Stripes HMAC-Signaturprüfung braucht exakt die empfangenen Bytes, kein
    // neu serialisiertes JSON. Der Fake-Anbieter parst denselben String.
    const roh = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body ?? {});
    const sig = req.headers['stripe-signature'];
    const erg = zahlung.webhookVerarbeiten(roh, typeof sig === 'string' ? sig : undefined);

    const abo = await prisma.abo.findFirst({ where: { zahlungsanbieterRef: erg.aboRef } });
    if (!abo) return { ok: true, ignoriert: 'abo_unbekannt' };
    // „Rechnung bezahlt" heilt nur eine offene Zahlung bzw. beendet die Trial —
    // eine laufende Kündigung/Pause darf es nicht still wieder auf `aktiv` setzen.
    const nurRechnung = erg.typ.startsWith('invoice.') || erg.typ === 'zahlung_erfolgreich';
    if (
      nurRechnung &&
      erg.neuerStatus === 'aktiv' &&
      !['zahlung_offen', 'test'].includes(abo.status)
    ) {
      return { ok: true, unveraendert: true };
    }
    if (abo.status === erg.neuerStatus && !erg.endetAm) return { ok: true, unveraendert: true };
    const offen = erg.neuerStatus === 'zahlung_offen';
    await prisma.abo.update({
      where: { id: abo.id },
      data: {
        status: erg.neuerStatus,
        // 30-Tage-Frist startet beim ersten Fehlschlag und läuft bei weiteren
        // Fehlschlägen NICHT neu an; jeder andere Status beendet sie.
        zahlungOffenSeit: offen ? (abo.zahlungOffenSeit ?? new Date()) : null,
        loeschWarnungAm: offen ? abo.loeschWarnungAm : null,
        ...(erg.endetAm ? { aktuellerZeitraumEnde: erg.endetAm } : {}),
      },
    });
    app.zugriffCache.zuruecksetzen();
    return { ok: true, status: erg.neuerStatus };
  });

  // ---- alles Weitere in eigenem Kontext mit Login-Zwang --------------------
  app.register(async (authed) => {
    authed.addHook('preHandler', app.requireAuth);

    // Liefert das AKTUELLE Abo des Users — über `User.aboId` (Relation
    // `UserAktivesAbo`), nicht per `Abo.ownerUserId`-Suche. Ein User kann
    // über die Zeit mehrere Abo-Zeilen ansammeln (Neuabschluss nach echtem
    // Vertragsende, siehe `POST /abo` unten); `ownerUserId` allein wäre
    // nicht deterministisch, welche davon die aktive ist (Bug 2026-09-17 —
    // vorher blockierte jede jemals angelegte Abo-Zeile für immer jede
    // weitere, weil `findFirst({ownerUserId})` unabhängig vom Status griff).
    const eigenesAbo = async (userId: string) => {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { aboId: true } });
      return user?.aboId ? prisma.abo.findUnique({ where: { id: user.aboId } }) : null;
    };

    // Ein Abo blockiert einen Neuabschluss nur, solange es nicht endgültig
    // vorbei ist: `gekuendigt`/`pausiert` behalten bis `aktuellerZeitraumEnde`
    // noch Zugriff und laufende Abrechnung — erst danach ist der Platz
    // wirklich frei für ein neues Abo (z. B. echtes Re-Signup nach Kündigung).
    const istAktuellesAboBlockierend = (abo: { status: string; aktuellerZeitraumEnde: Date }) =>
      !(abo.status === 'gekuendigt' && abo.aktuellerZeitraumEnde <= new Date());

    // GET /abo — aktuelles Abo des Vertragsinhabers
    authed.get('/abo', async (req) => {
      const abo = oder404(await eigenesAbo(req.userId));
      return aboDTO(abo);
    });

    // POST /abo — Checkout-Abschluss: Stripe-Subscription mit 14-Tage-Trial
    authed.post('/abo', async (req, reply) => {
      const body = parse(anlegenBody, req.body);
      const sitze = body.sitze ?? 1;
      const art = aboArtFuerSitze(sitze);
      if (!istGueltigeSitzzahl(art, sitze)) {
        throw new HttpError(400, 'validierung', { sitze: 'ungültige Sitzzahl' });
      }
      const bestehendes = await eigenesAbo(req.userId);
      if (bestehendes && istAktuellesAboBlockierend(bestehendes)) {
        throw new HttpError(409, 'abo_vorhanden');
      }

      const preis = aboPreis({ paket: body.paket, art, sitze, intervall: body.intervall });
      const sub = await zahlung.subscriptionAnlegen({
        userId: req.userId,
        email: body.email,
        paket: body.paket,
        art,
        sitze,
        intervall: body.intervall,
        betragCent: preis.betragCent,
      });

      const abo = await prisma.abo.create({
        data: {
          ownerUserId: req.userId,
          paket: body.paket,
          art,
          sitze,
          intervall: body.intervall,
          angebot: preis.angebotKey,
          status: sub.status,
          trialEndetAm: sub.trialEndetAm,
          aktuellerZeitraumEnde: sub.aktuellerZeitraumEnde,
          zahlungsanbieterRef: sub.ref,
        },
      });
      await prisma.user.update({
        where: { id: req.userId },
        data: { aboId: abo.id, trialEndetAm: null },
      });
      // Bestehende Kind-Profile (Neuabschluss nach abgelaufener Kündigung)
      // hängen sonst weiter am alten, beendeten Abo → blieben gesperrt.
      await prisma.user.updateMany({
        where: { parentUserId: req.userId },
        data: { aboId: abo.id },
      });
      app.zugriffCache.zuruecksetzen();

      // clientSecret nur beim echten Stripe-Adapter gesetzt — das Frontend
      // ruft damit stripe.confirmSetup (Trial, seti_…) oder confirmPayment
      // (pi_…) auf. Beim Fake-Anbieter fehlt es; checkout.js bleibt dann im
      // reinen Validierungs-/Demo-Zustand.
      return reply
        .code(201)
        .send({ ...aboDTO(abo), clientSecret: sub.clientSecret ?? null, subscriptionId: sub.ref });
    });

    // Zielzustand einer Änderung — geteilt von PATCH /abo und GET /abo/vorschau,
    // damit die Vorschau exakt das zeigt, was PATCH danach ausführt.
    const zielZustand = (
      abo: { paket: string; intervall: string; sitze: number; geplanteSitze: number | null },
      body: { paket?: string; intervall?: string; sitze?: number },
    ) => {
      const paket = (body.paket ?? abo.paket) as 'starter' | 'premium' | 'infinite';
      const intervall = (body.intervall ?? abo.intervall) as 'monatlich' | 'jaehrlich';
      const zielSitze = body.sitze ?? abo.sitze;
      // Sitzverringerung: nicht sofort. `geplanteSitze` merken; wirksam zum
      // `aktuellerZeitraumEnde`, sobald genug Kind-Profile entfernt sind
      // (Job `abo-geplante-aenderungen`). Restliche Änderungen greifen sofort.
      const sitzeJetzt = zielSitze < abo.sitze ? abo.sitze : zielSitze;
      const geplanteSitze =
        zielSitze < abo.sitze ? zielSitze : zielSitze > abo.sitze ? null : abo.geplanteSitze;
      const art = aboArtFuerSitze(sitzeJetzt);
      if (!istGueltigeSitzzahl(art, sitzeJetzt) || (geplanteSitze != null && geplanteSitze < 1)) {
        throw new HttpError(400, 'validierung', { sitze: 'ungültige Sitzzahl' });
      }
      return { paket, intervall, zielSitze, sitzeJetzt, geplanteSitze, art };
    };

    // GET /abo/vorschau?sitze=&paket=&intervall= — was eine Änderung kostet,
    // BEVOR sie ausgeführt wird (Entscheidung 2026-09-23: Eltern sehen vor
    // jeder Sitz-/Tarifänderung, was mit der Abrechnung passiert).
    authed.get<{ Querystring: Record<string, string | undefined> }>(
      '/abo/vorschau',
      async (req) => {
        const q = req.query;
        const body = parse(aendernBody, {
          ...(q.paket ? { paket: q.paket } : {}),
          ...(q.intervall ? { intervall: q.intervall } : {}),
          ...(q.sitze ? { sitze: Number(q.sitze) } : {}),
        });
        const abo = oder404(await eigenesAbo(req.userId));
        const z = zielZustand(abo, body);
        const alt = aboPreis({
          paket: abo.paket,
          art: aboArtFuerSitze(abo.sitze),
          sitze: abo.sitze,
          intervall: abo.intervall,
        });
        const imTest = abo.status === 'test';

        // Nur weniger Sitze, sonst nichts geändert → nichts Sofortiges, neuer
        // Preis ab dem nächsten Zeitraum.
        const nurVerringerung =
          z.geplanteSitze != null &&
          z.paket === abo.paket &&
          z.intervall === abo.intervall &&
          z.sitzeJetzt === abo.sitze;
        if (nurVerringerung) {
          const spaeter = aboPreis({
            paket: z.paket,
            art: aboArtFuerSitze(z.geplanteSitze!),
            sitze: z.geplanteSitze!,
            intervall: z.intervall,
          });
          return {
            wirksam: 'periodenende',
            wirksamAm: abo.aktuellerZeitraumEnde,
            imTest,
            sitze: { vorher: abo.sitze, nachher: z.geplanteSitze },
            aktuell: { betragCent: alt.betragCent, intervall: abo.intervall },
            neu: { betragCent: spaeter.betragCent, intervall: z.intervall },
            anteiligCent: 0,
            naechsteAbbuchung: { am: abo.aktuellerZeitraumEnde, betragCent: spaeter.betragCent },
          };
        }

        const neu = aboPreis({
          paket: z.paket,
          art: z.art,
          sitze: z.sitzeJetzt,
          intervall: z.intervall,
        });
        const v = await zahlung.aenderungVorschau(abo.zahlungsanbieterRef ?? abo.id, {
          intervall: z.intervall,
          betragCent: neu.betragCent,
          alterBetragCent: alt.betragCent,
          zeitraumEnde: abo.aktuellerZeitraumEnde,
          imTest,
        });
        return {
          wirksam: 'sofort',
          wirksamAm: new Date(),
          imTest,
          sitze: { vorher: abo.sitze, nachher: z.sitzeJetzt },
          aktuell: { betragCent: alt.betragCent, intervall: abo.intervall },
          neu: { betragCent: neu.betragCent, intervall: z.intervall },
          anteiligCent: v.anteiligCent,
          naechsteAbbuchung: { am: v.naechsteAbbuchungAm, betragCent: v.naechsteAbbuchungCent },
        };
      },
    );

    // PATCH /abo — Tarif-/Intervall-/Sitzwechsel (Proration beim Anbieter)
    authed.patch('/abo', async (req) => {
      const body = parse(aendernBody, req.body);
      const abo = oder404(await eigenesAbo(req.userId));
      const { paket, intervall, sitzeJetzt, geplanteSitze, art } = zielZustand(abo, body);

      const preis = aboPreis({ paket, art, sitze: sitzeJetzt, intervall });
      const { aktuellerZeitraumEnde } = await zahlung.subscriptionAendern(
        abo.zahlungsanbieterRef ?? abo.id,
        { intervall, betragCent: preis.betragCent },
      );

      const neu = await prisma.abo.update({
        where: { id: abo.id },
        data: {
          paket,
          intervall,
          sitze: sitzeJetzt,
          geplanteSitze,
          art,
          angebot: preis.angebotKey,
          aktuellerZeitraumEnde,
        },
      });
      return aboDTO(neu);
    });

    // POST /abo/kuendigen — zum Zeitraumende, kein sofortiger Zugriffsverlust
    authed.post('/abo/kuendigen', async (req) => {
      const abo = oder404(await eigenesAbo(req.userId));
      await zahlung.subscriptionKuendigen(abo.zahlungsanbieterRef ?? abo.id);
      const neu = await prisma.abo.update({
        where: { id: abo.id },
        data: { status: 'gekuendigt' },
      });
      app.zugriffCache.zuruecksetzen();
      return aboDTO(neu);
    });

    // POST /abo/pausieren — Sommerpause, Inhalte bleiben
    authed.post('/abo/pausieren', async (req) => {
      const abo = oder404(await eigenesAbo(req.userId));
      await zahlung.subscriptionPausieren(abo.zahlungsanbieterRef ?? abo.id);
      const neu = await prisma.abo.update({
        where: { id: abo.id },
        data: { status: 'pausiert' },
      });
      app.zugriffCache.zuruecksetzen();
      return aboDTO(neu);
    });

    // POST /abo/reaktivieren — hebt Kündigung oder Pause auf
    // (Entscheidung 2026-09-13: fehlte bisher, `eltern-abo.html` hatte einen
    // Button ohne Gegenstück). Der Zielstatus ist NICHT immer `aktiv`: ein
    // während der Trial-Phase gekündigtes/pausiertes Abo bleibt danach
    // `test` (Bug 2026-09-17 — vorher hart `aktiv` geschrieben, obwohl
    // Stripe weiterhin `trialing` meldete).
    authed.post('/abo/reaktivieren', async (req) => {
      const abo = oder404(await eigenesAbo(req.userId));
      if (abo.status !== 'gekuendigt' && abo.status !== 'pausiert') {
        throw new HttpError(409, 'abo_nicht_reaktivierbar', { status: abo.status });
      }
      const { status } = await zahlung.subscriptionReaktivieren(abo.zahlungsanbieterRef ?? abo.id);
      const neu = await prisma.abo.update({
        where: { id: abo.id },
        data: { status },
      });
      app.zugriffCache.zuruecksetzen();
      return aboDTO(neu);
    });

    // POST /abo/zahlungsportal — Stripe-Billing-Portal (Zahlungsmethode ändern,
    // offene Rechnung begleichen, Belege). Vor allem der Ausweg aus
    // `zahlung_offen` (2026-09-23).
    authed.post('/abo/zahlungsportal', async (req) => {
      const abo = oder404(await eigenesAbo(req.userId));
      const url = await zahlung.zahlungsportalUrl(
        abo.zahlungsanbieterRef ?? abo.id,
        `${env.MARKETING_URL}/app/eltern-abo.html`,
      );
      return { url };
    });

    // ---- Kind-Profile im Familien-Abo (max. Abo.sitze) --------------------
    authed.get('/abo/kinder', async (req) => {
      const kinder = await prisma.user.findMany({
        where: { parentUserId: req.userId },
        orderBy: { createdAt: 'asc' },
      });
      return kinder.map((k) => ({
        id: k.id,
        name: k.name,
        klassenstufe: k.klassenstufe,
        // Einladung = E-Mail gesetzt (via POST .../einladung) — kein eigenes
        // Statusfeld nötig, siehe Phase-11-Entscheidung 2026-09-13.
        eingeladen: !!k.email,
      }));
    });

    // Auch ein Einzelplatz-Abo (`art = einzel`, `sitze = 1`) darf genau EIN
    // Kind-Profil anlegen — das Elternkonto besitzt immer nur das Abo, nie
    // selbst den Lernaccount (Eltern-Kind-Modell, `backend-planning.md`
    // §1: „1–4 Kind-Profile"). `belegt + 1 > abo.sitze` reicht als Grenze
    // für beide Fälle; ein zusätzliches `art`-Gate war hier falsch (Bug
    // 2026-09-18 — blockierte jedes Solo-Abo mit `409 kein_familienabo`,
    // obwohl `checkout-erfolg/` genau dorthin verlinkt).
    authed.post('/abo/kinder', async (req, reply) => {
      const body = parse(kindBody, req.body);
      const abo = oder404(await eigenesAbo(req.userId));

      const belegt = await prisma.user.count({ where: { parentUserId: req.userId } });
      if (belegt + 1 > abo.sitze) {
        throw new HttpError(409, 'sitze_ausgeschoepft', { sitze: abo.sitze, belegt });
      }

      const kind = await prisma.user.create({
        data: {
          name: body.name,
          klassenstufe: body.klassenstufe,
          rolle: 'schueler',
          parentUserId: req.userId,
          aboId: abo.id,
          passwordHash: 'kind:kein-login', // Phase 12: echte Einladung/Passwort-Setzung
          einstellungen: { create: {} },
        },
      });
      return reply
        .code(201)
        .send({ id: kind.id, name: kind.name, klassenstufe: kind.klassenstufe });
    });

    authed.delete<{ Params: { id: string } }>('/abo/kinder/:id', async (req) => {
      const kind = oder404(
        await prisma.user.findFirst({ where: { id: req.params.id, parentUserId: req.userId } }),
      );
      // Cascade löscht alle Inhalte des Sitzes (Phase-0-Entscheidung).
      await prisma.user.delete({ where: { id: kind.id } });
      return { ok: true };
    });

    const eigenesKind = (parentId: string, kindId: string) =>
      prisma.user.findFirst({ where: { id: kindId, parentUserId: parentId } });

    // POST /abo/kinder/:id/einladung — E-Mail setzen + Passwort-Token ausgeben.
    // Das Elternkonto bürgt für die E-Mail → direkt `emailVerifiedAt`. Das Kind
    // setzt sein Passwort über den bestehenden `POST /auth/passwort-zuruecksetzen`.
    authed.post<{ Params: { id: string } }>('/abo/kinder/:id/einladung', async (req) => {
      const body = parse(einladungBody, req.body);
      const kind = oder404(await eigenesKind(req.userId, req.params.id));

      const belegt = await prisma.user.findFirst({ where: { email: body.email } });
      if (belegt && belegt.id !== kind.id) throw new HttpError(409, 'email_vergeben');

      const token = neuesToken();
      await prisma.$transaction([
        prisma.user.update({
          where: { id: kind.id },
          data: { email: body.email, emailVerifiedAt: new Date() },
        }),
        prisma.verificationToken.updateMany({
          where: { userId: kind.id, typ: 'passwort_reset', eingeloestAm: null },
          data: { eingeloestAm: new Date() },
        }),
        prisma.verificationToken.create({
          data: {
            userId: kind.id,
            typ: 'passwort_reset',
            tokenHash: token.hash,
            ablaeuftAm: inTagen(KIND_EINLADUNG_TAGE),
          },
        }),
      ]);
      const eltern = await prisma.user.findUnique({ where: { id: req.userId } });
      try {
        await app.mail.kindEinladungSenden({
          an: body.email,
          kindName: kind.name,
          elternName: eltern?.name ?? 'Deine Eltern',
          token: token.roh,
        });
      } catch (err) {
        app.log.error({ err }, 'kind_einladung_versand_fehlgeschlagen');
      }
      return { ok: true, ...(istProd ? {} : { resetToken: token.roh }) };
    });

    // POST /abo/kinder/:id/sitzung — Kontext-Wechsel: eine echte Session für das
    // Kind-Profil ausgeben. Das Elternkonto handelt damit vollständig als Kind;
    // zum Zurückwechseln nutzt es wieder sein eigenes Token.
    authed.post<{ Params: { id: string } }>('/abo/kinder/:id/sitzung', async (req) => {
      const kind = oder404(await eigenesKind(req.userId, req.params.id));
      const token = neuesToken();
      await prisma.session.create({
        data: { userId: kind.id, tokenHash: token.hash, ablaeuftAm: inTagen(7) },
      });
      return { token: token.roh, kindId: kind.id };
    });

    // GET /abo/kinder/:id/zusammenfassung — aggregierte Wochenkennzahlen,
    // **kein** Chat-Wortlaut. Für das Elternkonto immer verfügbar (Familien-Abo);
    // ein dediziertes Kind-Opt-out ist Nach-Launch-Thema (Phase 17).
    authed.get<{ Params: { id: string } }>('/abo/kinder/:id/zusammenfassung', async (req) => {
      const kind = oder404(await eigenesKind(req.userId, req.params.id));

      const seit = inTagen(-7);
      const [
        faecher,
        themen,
        chatsWoche,
        nachrichtenWoche,
        lernzettel,
        testklausurenWoche,
        klausuren,
        faecherRows,
        klausurenRows,
      ] = await prisma.$transaction([
        prisma.fach.count({ where: { userId: kind.id } }),
        prisma.thema.count({ where: { userId: kind.id } }),
        prisma.chat.count({ where: { userId: kind.id, erstelltAm: { gte: seit } } }),
        prisma.nachricht.count({
          where: { userId: kind.id, rolle: 'user', erstelltAm: { gte: seit } },
        }),
        prisma.lernzettel.count({ where: { userId: kind.id } }),
        prisma.testklausur.count({ where: { userId: kind.id, erstelltAm: { gte: seit } } }),
        prisma.klausur.count({ where: { userId: kind.id, datum: { gte: new Date() } } }),
        // Metadaten je Fach/Klausur (Name/Datum + Anzahl) — bewusst KEIN
        // Chat-/Lernzettel-Inhalt und keine Noten (siehe Kartentext auf
        // eltern-datenschutz.html).
        prisma.fach.findMany({
          where: { userId: kind.id },
          orderBy: { name: 'asc' },
          include: { _count: { select: { themen: true } } },
        }),
        prisma.klausur.findMany({
          where: { userId: kind.id, datum: { gte: new Date() } },
          orderBy: { datum: 'asc' },
          take: 10,
          include: { fach: true },
        }),
      ]);

      return {
        kindId: kind.id,
        name: kind.name,
        klassenstufe: kind.klassenstufe,
        zeitraum: { von: seit, bis: new Date() },
        faecher,
        themen,
        chatsDieWoche: chatsWoche,
        nachrichtenDieWoche: nachrichtenWoche,
        lernzettelGesamt: lernzettel,
        testklausurenDieWoche: testklausurenWoche,
        anstehendeKlausuren: klausuren,
        faecherListe: faecherRows.map((f) => ({
          name: f.name,
          farbe: f.farbe,
          themen: f._count.themen,
        })),
        anstehendeKlausurenListe: klausurenRows.map((k) => ({
          fach: k.fach.name,
          datum: k.datum.toISOString().slice(0, 10),
        })),
      };
    });
  });
}
