import { kuendigungBestaetigungMail, kuendigungInternMail } from './mailTemplates.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeMailGateway, type MailGateway } from './mailer.js';

describe('FakeMailGateway (loggt statt zu versenden, ohne RESEND_API_KEY)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('emailBestaetigungSenden loggt einen Link mit dem übergebenen Token', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mail: MailGateway = new FakeMailGateway();
    await mail.emailBestaetigungSenden({ an: 'a@b.de', name: 'Alex', token: 'tok123' });

    expect(spy).toHaveBeenCalledTimes(1);
    const geloggt = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(geloggt.mailFake).toBe('email_bestaetigung');
    expect(geloggt.an).toBe('a@b.de');
    expect(geloggt.link).toContain('/email-bestaetigen/?token=tok123');
  });

  it('passwortResetSenden loggt einen Link mit dem übergebenen Token', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mail: MailGateway = new FakeMailGateway();
    await mail.passwortResetSenden({ an: 'a@b.de', token: 'reset456' });

    expect(spy).toHaveBeenCalledTimes(1);
    const geloggt = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(geloggt.mailFake).toBe('passwort_reset');
    expect(geloggt.an).toBe('a@b.de');
    expect(geloggt.link).toContain('/passwort-zuruecksetzen/?token=reset456');
  });

  it('kontaktSenden loggt Empfänger (KONTAKT_EMPFAENGER) und Reply-To', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mail: MailGateway = new FakeMailGateway();
    await mail.kontaktSenden({ name: 'Alex', email: 'a@b.de', thema: 'Frage', nachricht: 'Hallo' });

    expect(spy).toHaveBeenCalledTimes(1);
    const geloggt = JSON.parse(spy.mock.calls[0]![0] as string);
    expect(geloggt.mailFake).toBe('kontakt');
    expect(geloggt.an).toBe('kontakt@lesify.de');
    expect(geloggt.replyTo).toBe('a@b.de');
  });
});

describe('Kündigungs-Mails (§312k BGB)', () => {
  const d = {
    name: 'Kim <Test>',
    email: 'kim@example.de',
    artText: 'ordentliche Kündigung',
    grund: null,
    zeitpunktText: 'zum nächstmöglichen Zeitpunkt',
    eingangText: '28. September 2026 um 14:03 Uhr',
    ergebnisText: 'Deine Kündigung ist wirksam: Dein Abo endet zum 12. Oktober 2026.',
  };

  it('Eingangsbestätigung nennt Inhalt, Eingangszeit und Vertragsende — HTML-sicher', () => {
    const m = kuendigungBestaetigungMail({ ...d, automatisch: true, link: 'https://x.test/abo' });
    for (const teil of [
      '28. September 2026 um 14:03 Uhr',
      '12. Oktober 2026',
      'ordentliche Kündigung',
      'Lesify-Abonnement',
    ]) {
      expect(m.html).toContain(teil);
      expect(m.text).toContain(teil);
    }
    expect(m.html).toContain('Kim &lt;Test&gt;');
    expect(m.html).not.toContain('Kim <Test>');
    expect(m.text).toContain('zurücknehmen');
  });

  it('interne Kopie markiert manuelle Fälle', () => {
    const m = kuendigungInternMail({
      ...d,
      automatisch: false,
      konto: 'kein Konto/Abo zu dieser E-Mail',
    });
    expect(m.subject).toContain('[manuell]');
    expect(m.html).toContain('Manuell bearbeiten');
  });
});
