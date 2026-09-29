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
  /** Optionaler Zusatzblock unter dem Kleingedruckten (z. B. Widerrufsbelehrung) */
  anhang?: { ueberschrift: string; absaetze: string[]; klartext: string[] };
}

export interface FertigeMail {
  subject: string;
  html: string;
  text: string;
}

function rendern(m: MailInhalt): FertigeMail {
  const anhang = m.anhang
    ? `<h2 style="margin:28px 0 12px;padding-top:24px;border-top:1px solid #e2e7ea;font-size:17px;line-height:1.3;font-weight:700;color:#101214;">${escapeHtml(m.anhang.ueberschrift)}</h2>` +
      m.anhang.absaetze
        .map(
          (p) =>
            `<p style="margin:0 0 12px;font-size:14px;line-height:1.55;color:#172128;">${p}</p>`,
        )
        .join('')
    : '';
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
      ${anhang}
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
    ...(m.anhang ? [m.anhang.ueberschrift.toUpperCase(), ...m.anhang.klartext] : []),
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

/**
 * Passwort-Reset eines Kind-Profils — geht an die **Eltern** (Entscheidung
 * 2026-09-25: Kinder ohne E-Mail, Reset läuft über das Elternkonto).
 */
export function kindPasswortResetMail(input: { kindName: string; link: string }): FertigeMail {
  const kind = escapeHtml(input.kindName);
  return rendern({
    betreff: `Neues Passwort für ${input.kindName} — Lesify`,
    vorschau: `Für das Lesify-Profil von ${input.kindName} wurde ein neues Passwort angefordert.`,
    ueberschrift: 'Neues Passwort für dein Kind',
    absaetze: [
      'Hallo,',
      `für das Lesify-Profil von <strong>${kind}</strong> wurde ein neues Passwort angefordert. Über den Button kannst du eins vergeben und es an ${kind} weitergeben.`,
      'Alternativ kannst du das Passwort jederzeit im Eltern-Bereich unter „Kinder &amp; Zugänge" ändern.',
    ],
    button: { text: 'Passwort vergeben', link: input.link },
    hinweis:
      'Der Link ist 1 Tag gültig und nur einmal nutzbar. Niemand hat das angefordert? Dann ignoriere diese E-Mail — das Passwort bleibt unverändert.',
    klartext: [
      'Hallo,',
      `für das Lesify-Profil von ${input.kindName} wurde ein neues Passwort angefordert. Über den folgenden Link kannst du eins vergeben und es weitergeben. Alternativ im Eltern-Bereich unter „Kinder & Zugänge".`,
    ],
  });
}

export function kindEinladungMail(input: {
  kindName: string;
  elternName: string;
  link: string;
}): FertigeMail {
  return rendern({
    betreff: `${input.elternName} hat dich zu Lesify eingeladen`,
    vorschau: 'Vergib dein Passwort und leg los.',
    ueberschrift: 'Du wurdest zu Lesify eingeladen',
    absaetze: [
      `Hallo ${escapeHtml(input.kindName)},`,
      `${escapeHtml(input.elternName)} hat für dich ein Lesify-Profil angelegt. Vergib jetzt dein Passwort, dann kannst du dich anmelden und mit dem Lernen starten.`,
    ],
    button: { text: 'Passwort festlegen', link: input.link },
    hinweis:
      'Der Link ist 14 Tage gültig und nur einmal nutzbar. Du kennst diese Einladung nicht? Dann ignoriere diese E-Mail.',
    klartext: [
      `Hallo ${input.kindName},`,
      `${input.elternName} hat für dich ein Lesify-Profil angelegt. Vergib jetzt dein Passwort, dann kannst du dich anmelden und mit dem Lernen starten.`,
    ],
  });
}

/** Kontaktformular → Support-Postfach. Schlicht (interne Mail), Reply-To setzt der Mailer. */
export function kontaktMail(input: {
  name: string;
  email: string;
  thema: string;
  nachricht: string;
}): FertigeMail {
  const zeilen = escapeHtml(input.nachricht).replace(/\n/g, '<br>');
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"></head>
<body style="font-family:${FONT};font-size:15px;line-height:1.6;color:#172128;">
<p style="margin:0 0 4px;"><b>Von:</b> ${escapeHtml(input.name)} &lt;${escapeHtml(input.email)}&gt;</p>
<p style="margin:0 0 16px;"><b>Thema:</b> ${escapeHtml(input.thema)}</p>
<div style="padding:16px;border:1px solid #e2e7ea;border-radius:10px;background:#f8fafb;">${zeilen}</div>
<p style="margin:16px 0 0;font-size:12px;color:#6e8494;">Über das Kontaktformular auf lesify.de — „Antworten" geht direkt an die Absender:in.</p>
</body></html>`;
  const text = `Von: ${input.name} <${input.email}>\nThema: ${input.thema}\n\n${input.nachricht}`;
  return { subject: `[Kontakt] ${input.thema} — ${input.name}`, html, text };
}

/** Zahlung seit 23 Tagen offen → 7 Tage vor der Löschung der Kind-Profile (Job `zahlung-offen-loeschung`). */
export function zahlungOffenWarnungMail(input: {
  name: string;
  loeschungAm: string;
  link: string;
}): FertigeMail {
  const satz = `Für dein Lesify-Abo ist seit mehreren Wochen eine Zahlung offen. Wenn sie bis zum ${input.loeschungAm} nicht beglichen ist, werden die Kind-Profile in deinem Konto samt aller Inhalte (Fächer, Chats, Lernzettel, Dateien) endgültig gelöscht und das Abo beendet.`;
  return rendern({
    betreff: 'Zahlung offen — Kind-Profile werden in 7 Tagen gelöscht',
    vorschau: `Bitte aktualisiere deine Zahlungsmethode bis zum ${input.loeschungAm}.`,
    ueberschrift: 'Deine Zahlung ist noch offen',
    absaetze: [
      `Hallo ${escapeHtml(input.name)},`,
      escapeHtml(satz),
      'Bis dahin können deine Kinder ihre Inhalte weiter ansehen, aber nichts Neues anlegen. Sobald die Zahlung durch ist, läuft alles sofort wieder normal.',
    ],
    button: { text: 'Zahlungsmethode aktualisieren', link: input.link },
    hinweis:
      'Du hast bereits bezahlt? Dann kannst du diese E-Mail ignorieren — es kann bis zu einem Tag dauern, bis die Zahlung bei uns ankommt.',
    klartext: [
      `Hallo ${input.name},`,
      satz,
      'Bis dahin können deine Kinder ihre Inhalte weiter ansehen, aber nichts Neues anlegen. Sobald die Zahlung durch ist, läuft alles sofort wieder normal.',
    ],
  });
}

/**
 * Kündigung über den Kündigungsbutton (§312k BGB, 2026-09-28). Die
 * Eingangsbestätigung muss Inhalt, Datum + Uhrzeit des Eingangs und den
 * Zeitpunkt nennen, zu dem der Vertrag endet (oder dass wir ihn noch klären).
 */
export interface KuendigungMailDaten {
  name: string;
  email: string;
  /** „ordentlich" oder „außerordentlich" — schon lesbar formatiert */
  artText: string;
  grund: string | null;
  /** z. B. „zum nächstmöglichen Zeitpunkt" oder „zum 31. Dezember 2026" */
  zeitpunktText: string;
  /** „28. September 2026 um 14:03 Uhr" */
  eingangText: string;
  /** Ergebnis in einem Satz (Enddatum bzw. „wir melden uns") */
  ergebnisText: string;
}

function kuendigungZeilen(d: KuendigungMailDaten): [string, string][] {
  return [
    ['Eingegangen', d.eingangText],
    ['Name', d.name],
    ['E-Mail', d.email],
    ['Vertrag', 'Lesify-Abonnement'],
    ['Art der Kündigung', d.artText],
    ...(d.grund ? ([['Grund', d.grund]] as [string, string][]) : []),
    ['Gewünschter Zeitpunkt', d.zeitpunktText],
  ];
}

export function kuendigungBestaetigungMail(
  d: KuendigungMailDaten & { automatisch: boolean; link: string },
): FertigeMail {
  const zeilen = kuendigungZeilen(d);
  const tabelle = zeilen.map(([k, v]) => `<b>${escapeHtml(k)}:</b> ${escapeHtml(v)}`).join('<br>');
  const nichtDu =
    'Du hast nicht gekündigt? Dann kannst du die Kündigung im Eltern-Bereich unter „Abo &amp; Sitze" mit einem Klick zurücknehmen oder uns einfach antworten.';
  return rendern({
    betreff: 'Eingangsbestätigung deiner Kündigung',
    vorschau: d.ergebnisText,
    ueberschrift: 'Deine Kündigung ist eingegangen',
    absaetze: [
      `Hallo ${escapeHtml(d.name)},`,
      escapeHtml(d.ergebnisText),
      `Das hast du uns geschickt:<br>${tabelle}`,
      ...(d.automatisch ? [nichtDu] : []),
    ],
    button: d.automatisch
      ? { text: 'Abo ansehen', link: d.link }
      : { text: 'Kontakt aufnehmen', link: `${SITE_URL}/kontakt/` },
    hinweis:
      'Bitte bewahre diese E-Mail als Nachweis deiner Kündigung auf. Bei Fragen antworte einfach auf diese Nachricht oder schreib an kontakt@lesify.de.',
    klartext: [
      `Hallo ${d.name},`,
      d.ergebnisText,
      `Das hast du uns geschickt:\n${zeilen.map(([k, v]) => `${k}: ${v}`).join('\n')}`,
      ...(d.automatisch ? [nichtDu.replace('&amp;', '&')] : []),
    ],
  });
}

/** Interne Kopie an KONTAKT_EMPFAENGER — Nachweis + ggf. manuelle Bearbeitung. */
export function kuendigungInternMail(
  d: KuendigungMailDaten & { automatisch: boolean; konto: string },
): FertigeMail {
  const zeilen: [string, string][] = [
    ...kuendigungZeilen(d),
    ['Konto/Abo', d.konto],
    ['Ergebnis', d.ergebnisText],
  ];
  const html = `<!doctype html><html lang="de"><head><meta charset="utf-8"></head>
<body style="font-family:${FONT};font-size:15px;line-height:1.6;color:#172128;">
${d.automatisch ? '' : '<p style="margin:0 0 12px;padding:10px 14px;border-radius:8px;background:#fff4d6;"><b>Manuell bearbeiten</b> — nicht automatisch gekündigt.</p>'}
${zeilen.map(([k, v]) => `<p style="margin:0 0 4px;"><b>${escapeHtml(k)}:</b> ${escapeHtml(v)}</p>`).join('\n')}
<p style="margin:16px 0 0;font-size:12px;color:#6e8494;">Über „Verträge hier kündigen" auf lesify.de — „Antworten" geht direkt an die Person.</p>
</body></html>`;
  const text = zeilen.map(([k, v]) => `${k}: ${v}`).join('\n');
  return {
    subject: `[Kündigung]${d.automatisch ? '' : ' [manuell]'} ${d.name} <${d.email}>`,
    html,
    text,
  };
}

/* ---------- Vertragsbestätigung nach dem Abschluss (§312f BGB) ----------
 * Stripe schickt beim Start einer Testphase nichts (0-€-Rechnung) — ohne diese
 * Mail hätten Kund:innen bis zur ersten Abbuchung keine Bestätigung auf einem
 * dauerhaften Datenträger (Testdurchgang 2026-09-29). Widerrufsbelehrung und
 * Muster-Formular wörtlich wie AGB §11 (marketing/agb/index.html) — bei
 * Änderungen dort hier mitziehen. */
const ANBIETER = 'Jannik Born, Lesify, Bergstraße 81, 35418 Buseck';
const ANBIETER_TELEFON = '015170868969';

export interface AboBestaetigungDaten {
  name: string;
  /** z. B. „Premium" bzw. „Premium · Familie mit 2 Plätzen" */
  tarif: string;
  /** „monatlich" | „jährlich" */
  abrechnung: string;
  /** z. B. „19,99 € pro Monat" */
  preis: string;
  /** Normalpreis bei Angebot, z. B. „24,99 € pro Monat" */
  normalpreis: string | null;
  bestelltAm: string;
  /** Ende der Testphase (= erste Abbuchung) oder null ohne Testphase */
  testphaseBis: string | null;
  link: string;
}

const WIDERRUF_TEXT = [
  'Schließt eine sorgeberechtigte Person als Verbraucher:in ein Abo ab, gilt das gesetzliche Widerrufsrecht:',
  `Widerrufsrecht. Du hast das Recht, binnen vierzehn Tagen ohne Angabe von Gründen diesen Vertrag zu widerrufen. Die Widerrufsfrist beträgt vierzehn Tage ab dem Tag des Vertragsschlusses. Um dein Widerrufsrecht auszuüben, musst du uns (${ANBIETER}, Telefon: ${ANBIETER_TELEFON}, kontakt@lesify.de) mittels einer eindeutigen Erklärung (z. B. per E-Mail oder Telefon) über deinen Entschluss, diesen Vertrag zu widerrufen, informieren. Zur Wahrung der Widerrufsfrist reicht es aus, dass du die Mitteilung über die Ausübung des Widerrufsrechts vor Ablauf der Widerrufsfrist absendest.`,
  'Folgen des Widerrufs. Wenn du diesen Vertrag widerrufst, erstatten wir dir alle Zahlungen, die wir von dir erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag zurück, an dem die Mitteilung über deinen Widerruf bei uns eingegangen ist. Hast du verlangt, dass die Leistung während der Widerrufsfrist beginnen soll, so hast du uns einen angemessenen Betrag zu zahlen, der dem Anteil der bis zu dem Zeitpunkt, zu dem du uns von der Ausübung des Widerrufsrechts unterrichtest, bereits erbrachten Leistung im Vergleich zum Gesamtumfang der im Vertrag vorgesehenen Leistungen entspricht.',
  'Da jeder Tarif ohnehin mit einer 14-tägigen kostenlosen Testphase beginnt und eine Kündigung während dieser Zeit keine Kosten auslöst (siehe §4 der AGB), läuft das Widerrufsrecht in der Praxis parallel zur Testphase — ein Widerruf ist zusätzlich zur jederzeitigen Kündigung möglich.',
  'Muster-Widerrufsformular',
  '(Wenn du den Vertrag widerrufen willst, kannst du dieses Formular ausfüllen und an uns zurücksenden.)',
  `An ${ANBIETER}, kontakt@lesify.de:\nHiermit widerrufe(n) ich/wir den von mir/uns abgeschlossenen Vertrag über die Nutzung von Lesify.\nBestellt am: __________\nName des/der Verbraucher(s): __________\nAnschrift des/der Verbraucher(s): __________\nDatum: __________`,
];

function widerrufHtml(t: string): string {
  for (const fett of ['Widerrufsrecht.', 'Folgen des Widerrufs.', 'Muster-Widerrufsformular']) {
    if (t.startsWith(fett)) return `<b>${fett}</b>${escapeHtml(t.slice(fett.length))}`;
  }
  return escapeHtml(t).replace(/\n/g, '<br>');
}

export function aboBestaetigungMail(d: AboBestaetigungDaten): FertigeMail {
  const zeilen: [string, string][] = [
    ['Tarif', d.tarif],
    ['Abrechnung', d.abrechnung],
    ['Preis', d.normalpreis ? `${d.preis} (Angebotspreis, regulär ${d.normalpreis})` : d.preis],
    ['Bestellt am', d.bestelltAm],
    [
      'Testphase',
      d.testphaseBis
        ? `kostenlos bis ${d.testphaseBis}, danach erste Abbuchung`
        : 'ohne Testphase, erste Abbuchung sofort',
    ],
    ['Vertragspartner', ANBIETER],
  ];
  const tabelle = zeilen.map(([k, v]) => `<b>${escapeHtml(k)}:</b> ${escapeHtml(v)}`).join('<br>');
  const kuendigung = `Du kannst jederzeit zum Ende des laufenden Abrechnungszeitraums kündigen, in der Testphase zu deren Ende — im Eltern-Bereich unter „Abo & Sitze" oder ohne Anmeldung unter ${SITE_URL}/kuendigen/.`;
  const agb = `Es gelten unsere Nutzungsbedingungen (AGB): ${SITE_URL}/agb/ — die Widerrufsbelehrung steht unten in dieser E-Mail.`;
  return rendern({
    betreff: `Deine Lesify-Bestellung: ${d.tarif}`,
    vorschau: d.testphaseBis
      ? `Testphase bis ${d.testphaseBis} — alle Vertragsdaten auf einen Blick.`
      : 'Dein Abo läuft — alle Vertragsdaten auf einen Blick.',
    ueberschrift: 'Danke für deine Bestellung',
    absaetze: [
      `Hallo ${escapeHtml(d.name)},`,
      'hiermit bestätigen wir deinen Vertrag über die Nutzung von Lesify:',
      tabelle,
      escapeHtml(kuendigung),
      escapeHtml(agb),
    ],
    button: { text: 'Zum Eltern-Bereich', link: d.link },
    hinweis:
      'Bitte bewahre diese E-Mail als Vertragsbestätigung auf. Rechnungen und Zahlungsbelege schickt dir unser Zahlungsdienstleister Stripe separat. Bei Fragen antworte einfach auf diese Nachricht.',
    klartext: [
      `Hallo ${d.name},`,
      'hiermit bestätigen wir deinen Vertrag über die Nutzung von Lesify:',
      zeilen.map(([k, v]) => `${k}: ${v}`).join('\n'),
      kuendigung,
      agb,
    ],
    anhang: {
      ueberschrift: 'Widerrufsbelehrung',
      absaetze: WIDERRUF_TEXT.map(widerrufHtml),
      klartext: WIDERRUF_TEXT,
    },
  });
}
