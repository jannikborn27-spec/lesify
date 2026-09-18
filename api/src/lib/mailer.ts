import { Resend } from 'resend';
import { env, istProd } from '../env.js';
import { emailBestaetigungMail, kindEinladungMail, passwortResetMail } from './mailTemplates.js';

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
  kindEinladungSenden(input: {
    an: string;
    kindName: string;
    elternName: string;
    token: string;
  }): Promise<void>;
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

  async kindEinladungSenden(input: {
    an: string;
    kindName: string;
    elternName: string;
    token: string;
  }): Promise<void> {
    console.log(
      JSON.stringify({ mailFake: 'kind_einladung', an: input.an, link: resetLink(input.token) }),
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
    const mail = emailBestaetigungMail({ name: input.name, link: bestaetigungsLink(input.token) });
    const { error } = await this.resend.emails.send({
      from: env.EMAIL_ABSENDER,
      to: input.an,
      ...mail,
    });
    if (error)
      throw new Error(`Resend-Versand fehlgeschlagen (email_bestaetigung): ${error.message}`);
  }

  async passwortResetSenden(input: { an: string; token: string }): Promise<void> {
    const mail = passwortResetMail({ link: resetLink(input.token) });
    const { error } = await this.resend.emails.send({
      from: env.EMAIL_ABSENDER,
      to: input.an,
      ...mail,
    });
    if (error) throw new Error(`Resend-Versand fehlgeschlagen (passwort_reset): ${error.message}`);
  }

  async kindEinladungSenden(input: {
    an: string;
    kindName: string;
    elternName: string;
    token: string;
  }): Promise<void> {
    const mail = kindEinladungMail({
      kindName: input.kindName,
      elternName: input.elternName,
      link: resetLink(input.token),
    });
    const { error } = await this.resend.emails.send({
      from: env.EMAIL_ABSENDER,
      to: input.an,
      ...mail,
    });
    if (error) throw new Error(`Resend-Versand fehlgeschlagen (kind_einladung): ${error.message}`);
  }
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
