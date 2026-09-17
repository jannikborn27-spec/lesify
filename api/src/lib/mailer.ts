import { Resend } from 'resend';
import { env, istProd } from '../env.js';

/**
 * E-Mail-Versand (Phase 10, §5): Double-Opt-in- und Passwort-Reset-Mails.
 * Zahlungs-/Abo-/Beleg-Mails bleiben bei Stripe (siehe backend-planning.md §0).
 *
 * Ohne `RESEND_API_KEY` läuft ein deterministisches `FakeMailGateway` (loggt
 * statt zu versenden) — wie `FakeKiClient`/`FakeZahlungsGateway`/
 * `FakeStorageGateway`.
 */
export interface MailGateway {
  emailBestaetigungSenden(input: { an: string; name: string; token: string }): Promise<void>;
  passwortResetSenden(input: { an: string; token: string }): Promise<void>;
}

function bestaetigungsLink(token: string): string {
  return `${env.MARKETING_URL}/email-bestaetigen/?token=${encodeURIComponent(token)}`;
}
function resetLink(token: string): string {
  return `${env.MARKETING_URL}/passwort-zuruecksetzen/?token=${encodeURIComponent(token)}`;
}

/** Deterministischer Platzhalter — loggt statt zu versenden. Default in Dev/Test ohne Resend-Key. */
export class FakeMailGateway implements MailGateway {
  async emailBestaetigungSenden(input: { an: string; name: string; token: string }): Promise<void> {
    console.log(
      JSON.stringify({
        mailFake: 'email_bestaetigung',
        an: input.an,
        link: bestaetigungsLink(input.token),
      }),
    );
  }

  async passwortResetSenden(input: { an: string; token: string }): Promise<void> {
    console.log(
      JSON.stringify({
        mailFake: 'passwort_reset',
        an: input.an,
        link: resetLink(input.token),
      }),
    );
  }
}

/** Echtes Resend-Adapter, aktiv sobald `RESEND_API_KEY` gesetzt ist (siehe `getMailGateway`). */
export class ResendMailGateway implements MailGateway {
  private readonly resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  async emailBestaetigungSenden(input: { an: string; name: string; token: string }): Promise<void> {
    const link = bestaetigungsLink(input.token);
    const { error } = await this.resend.emails.send({
      from: env.EMAIL_ABSENDER,
      to: input.an,
      subject: 'Bitte E-Mail-Adresse bestätigen — Lesify',
      html: `<p>Hallo ${escapeHtml(input.name)},</p><p>bitte bestätige deine E-Mail-Adresse für dein Lesify-Konto:</p><p><a href="${link}">E-Mail-Adresse bestätigen</a></p><p>Der Link ist 7 Tage gültig.</p>`,
      text: `Hallo ${input.name},\n\nbitte bestätige deine E-Mail-Adresse für dein Lesify-Konto:\n${link}\n\nDer Link ist 7 Tage gültig.`,
    });
    if (error)
      throw new Error(`Resend-Versand fehlgeschlagen (email_bestaetigung): ${error.message}`);
  }

  async passwortResetSenden(input: { an: string; token: string }): Promise<void> {
    const link = resetLink(input.token);
    const { error } = await this.resend.emails.send({
      from: env.EMAIL_ABSENDER,
      to: input.an,
      subject: 'Passwort zurücksetzen — Lesify',
      html: `<p>Hallo,</p><p>hier kannst du ein neues Passwort für dein Lesify-Konto vergeben:</p><p><a href="${link}">Passwort zurücksetzen</a></p><p>Der Link ist 1 Tag gültig. Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>`,
      text: `Hallo,\n\nhier kannst du ein neues Passwort für dein Lesify-Konto vergeben:\n${link}\n\nDer Link ist 1 Tag gültig. Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.`,
    });
    if (error) throw new Error(`Resend-Versand fehlgeschlagen (passwort_reset): ${error.message}`);
  }
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

let instanz: MailGateway | undefined;

/** Prozessweiter Gateway (in Tests via buildApp ersetzbar). */
export function getMailGateway(): MailGateway {
  if (!instanz) {
    if (env.RESEND_API_KEY) {
      instanz = new ResendMailGateway(env.RESEND_API_KEY);
    } else {
      if (istProd) {
        console.error(
          JSON.stringify({
            mailFakeGatewayInProd: true,
            warnung:
              'RESEND_API_KEY fehlt in Produktion — Double-Opt-in-/Passwort-Reset-Mails werden nur geloggt, nicht versendet.',
          }),
        );
      }
      instanz = new FakeMailGateway();
    }
  }
  return instanz;
}
