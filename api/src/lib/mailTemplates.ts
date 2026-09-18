/**
 * E-Mail-Vorlagen (HTML + Klartext). Mail-Clients kennen kein externes CSS und
 * keine Webfonts — deshalb Tabellen-Layout mit Inline-Styles und System-Fonts.
 * Farben aus dem Fog-Blue-Ton von marketing.css (--ink-*, --paper).
 */

// Öffentlich erreichbare Absolut-URL (Mail-Clients laden keine localhost-Bilder).
const LOGO_URL = 'https://www.lesify.de/assets/img/logo.png';
const SITE_URL = 'https://www.lesify.de';

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
}

interface MailInhalt {
  betreff: string;
  /** Vorschautext neben dem Betreff im Posteingang */
  vorschau: string;
  ueberschrift: string;
  /** Absätze (bereits HTML-sicher) */
  absaetze: string[];
  button: { text: string; link: string };
  /** Kleingedrucktes unter dem Button */
  hinweis: string;
  /** Klartext-Absätze (ohne HTML) */
  klartext: string[];
}

export interface FertigeMail {
  subject: string;
  html: string;
  text: string;
}

function rendern(m: MailInhalt): FertigeMail {
  const absaetze = m.absaetze
    .map((p) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#172128;">${p}</p>`)
    .join('');

  const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${escapeHtml(m.betreff)}</title>
</head>
<body style="margin:0;padding:0;background:#f8fafb;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f8fafb;">${escapeHtml(m.vorschau)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafb;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
    <tr><td style="padding:0 0 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="padding-right:10px;"><img src="${LOGO_URL}" width="36" height="36" alt="" style="display:block;border:0;border-radius:9px;"></td>
        <td style="font-family:${FONT};font-size:22px;font-weight:700;letter-spacing:-0.02em;color:#101214;">Lesify</td>
      </tr></table>
    </td></tr>
    <tr><td style="background:#ffffff;border:1px solid #e2e7ea;border-radius:16px;padding:36px 32px;font-family:${FONT};">
      <h1 style="margin:0 0 20px;font-size:24px;line-height:1.25;font-weight:700;letter-spacing:-0.02em;color:#101214;">${escapeHtml(m.ueberschrift)}</h1>
      ${absaetze}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 24px;"><tr>
        <td style="background:#101214;border-radius:10px;">
          <a href="${m.button.link}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">${escapeHtml(m.button.text)}</a>
        </td>
      </tr></table>
      <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:#516676;">Der Button funktioniert nicht? Kopiere diesen Link in deinen Browser:</p>
      <p style="margin:0 0 20px;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${m.button.link}" style="color:#516676;">${escapeHtml(m.button.link)}</a></p>
      <p style="margin:0;padding-top:20px;border-top:1px solid #e2e7ea;font-size:13px;line-height:1.5;color:#516676;">${m.hinweis}</p>
    </td></tr>
    <tr><td align="center" style="padding:24px 8px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:#6e8494;">
      Lesify &middot; Lernen mit KI für Schüler:innen<br>
      <a href="${SITE_URL}/impressum/" style="color:#6e8494;">Impressum</a> &middot;
      <a href="${SITE_URL}/datenschutz/" style="color:#6e8494;">Datenschutz</a> &middot;
      <a href="${SITE_URL}/kontakt/" style="color:#6e8494;">Kontakt</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    ...m.klartext,
    `${m.button.text}:\n${m.button.link}`,
    m.hinweis.replace(/<[^>]+>/g, ''),
    `— Lesify\n${SITE_URL}`,
  ].join('\n\n');

  return { subject: m.betreff, html, text };
}

export function emailBestaetigungMail(input: { name: string; link: string }): FertigeMail {
  return rendern({
    betreff: 'Bitte bestätige deine E-Mail-Adresse — Lesify',
    vorschau: 'Ein Klick, dann ist dein Lesify-Konto bestätigt.',
    ueberschrift: 'Willkommen bei Lesify!',
    absaetze: [
      `Hallo ${escapeHtml(input.name)},`,
      'schön, dass du dabei bist. Bitte bestätige noch kurz deine E-Mail-Adresse, damit wir sicher sind, dass sie dir gehört.',
    ],
    button: { text: 'E-Mail-Adresse bestätigen', link: input.link },
    hinweis:
      'Der Link ist 7 Tage gültig. Du hast dich nicht bei Lesify registriert? Dann kannst du diese E-Mail einfach ignorieren.',
    klartext: [
      `Hallo ${input.name},`,
      'schön, dass du dabei bist. Bitte bestätige noch kurz deine E-Mail-Adresse, damit wir sicher sind, dass sie dir gehört.',
    ],
  });
}

export function passwortResetMail(input: { link: string }): FertigeMail {
  return rendern({
    betreff: 'Passwort zurücksetzen — Lesify',
    vorschau: 'Vergib ein neues Passwort für dein Lesify-Konto.',
    ueberschrift: 'Neues Passwort vergeben',
    absaetze: [
      'Hallo,',
      'für dein Lesify-Konto wurde ein neues Passwort angefordert. Über den Button kannst du eins vergeben.',
    ],
    button: { text: 'Passwort zurücksetzen', link: input.link },
    hinweis:
      'Der Link ist 1 Tag gültig und nur einmal nutzbar. Du hast das nicht angefordert? Dann ignoriere diese E-Mail — dein Passwort bleibt unverändert.',
    klartext: [
      'Hallo,',
      'für dein Lesify-Konto wurde ein neues Passwort angefordert. Über den folgenden Link kannst du eins vergeben.',
    ],
  });
}
