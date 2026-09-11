/* =========================================================
   Lesify — Data layer
   Seed content + a localStorage-backed store so things created
   in the UI persist across pages. Grade math, Ampel-Logik und
   der Lernplan-Flow (aktueller Tag, schwache Themen, ob Testklausur 2
   nötig ist) rechnen hier ECHT — keine Fake-Werte beim Anzeigen,
   nur die Quelle (KI-Antworten) ist simuliert.
   ========================================================= */

(function (global) {
  'use strict';

  var DB_KEY = 'lesify_db_v2';

  function slugify(str) {
    return String(str)
      .toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  /* ---------------------------------------------------------
     Notenlogik — deutsche Skala 1 (sehr gut) bis 6 (ungenügend)
     --------------------------------------------------------- */

  function prozentZuNote(prozent) {
    var note = 6 - (clamp(prozent, 0, 100) / 100) * 5;
    return Math.round(note * 10) / 10;
  }
  var AMPEL_GRUEN_MAX_NOTE = 2.5; // Note <= 2.5 (~70%) gilt als sicher

  function noteLabel(note) {
    if (note <= 1.5) return 'sehr gut';
    if (note <= 2.5) return 'gut';
    if (note <= 3.5) return 'befriedigend';
    if (note <= 4.5) return 'ausreichend';
    if (note <= 5.5) return 'mangelhaft';
    return 'ungenügend';
  }

  // Lernplan-Sprech für die drei Ampel-Stufen einer Testklausur (stark/wackelig/
  // schwach) — bewusst getrennt von noteLabel (das sind Schulnoten-Labels wie
  // "gut"/"befriedigend"). Reine Anzeige, keine eigene Rechenlogik.
  var TIER_LABEL = { gruen: 'stark', gelb: 'wackelig', rot: 'schwach' };
  function tierLabel(ampel) { return TIER_LABEL[ampel] || ampel; }

  // Gesamt-Ampel für eine Note (z. B. Klausurvorbereitungsnote auf Karten) —
  // gruen/gelb wie AMPEL_GRUEN_MAX_NOTE, rot ab der deutschen Bestehensgrenze (4.0).
  function noteAmpel(note) {
    if (note <= AMPEL_GRUEN_MAX_NOTE) return 'gruen';
    if (note <= 4.0) return 'gelb';
    return 'rot';
  }

  /* ---------------------------------------------------------
     Fach-Farben — kuratierte Palette, frei wählbar pro Fach
     (Einstellungen/Wayfinding), keine Statusbedeutung wie Ampel.
     --------------------------------------------------------- */

  var FACH_COLORS = [
    { key: 'blue', name: 'Blau', base: '#007dae', ink: '#00699c', bg: '#e5f5fd' },
    { key: 'rose', name: 'Rosé', base: '#c4334f', ink: '#b6143f', bg: '#ffebec' },
    { key: 'amber', name: 'Amber', base: '#c26f00', ink: '#913b00', bg: '#ffeedd' },
    { key: 'teal', name: 'Türkis', base: '#009176', ink: '#006e54', bg: '#e5f6f1' },
    { key: 'terracotta', name: 'Terrakotta', base: '#985535', ink: '#89401c', bg: '#fdeee8' },
    { key: 'violet', name: 'Violett', base: '#654db6', ink: '#5031a1', bg: '#f1efff' },
    { key: 'pink', name: 'Pink', base: '#b84999', ink: '#931a77', bg: '#feecf7' },
    { key: 'graphit', name: 'Graphit', base: '#516676', ink: '#101214', bg: '#edf1f3' }
  ];

  function getFachColor(key) {
    var found = null;
    for (var i = 0; i < FACH_COLORS.length; i++) { if (FACH_COLORS[i].key === key) { found = FACH_COLORS[i]; break; } }
    return found || FACH_COLORS[FACH_COLORS.length - 1];
  }

  /* ---------------------------------------------------------
     Fach-Icons — vordefinierte Fächer bekommen beim Anlegen ein
     passendes Icon-Symbol statt des Anfangsbuchstabens. Wählt der
     Nutzer ein eigenes Fach abseits dieser Liste, bleibt es beim
     Buchstaben-Avatar (icon: null).
     --------------------------------------------------------- */

  var FACH_ICONS = {
    mathematik: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="1.3" fill="currentColor" stroke="none"/><path d="M12 5.3 5.5 20"/><path d="M12 5.3 18.5 20"/><path d="M8.7 20H6.3"/><path d="M17.7 20h-2.4"/><path d="M8.8 12.6a4.6 4.6 0 0 1 6.4 0"/></svg>',
    deutsch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M9 9h6"/><path d="M9 12h6"/><path d="M9 15h3"/></svg>',
    englisch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21V4"/><path d="M6 4.5c2-1.3 4-1.3 6 0s4 1.3 6 0v10c-2 1.3-4 1.3-6 0s-4-1.3-6 0Z"/></svg>',
    franzoesisch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21V4"/><path d="M6 4.5c2-1.3 4-1.3 6 0s4 1.3 6 0v10c-2 1.3-4 1.3-6 0s-4-1.3-6 0Z"/></svg>',
    spanisch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21V4"/><path d="M6 4.5c2-1.3 4-1.3 6 0s4 1.3 6 0v10c-2 1.3-4 1.3-6 0s-4-1.3-6 0Z"/></svg>',
    latein: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M4 21V10.5M8 21V10.5M12 21V10.5M16 21V10.5M20 21V10.5"/><path d="M2.5 10.5h19L12 3Z"/></svg>',
    biologie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 4C10 4 4 10 4 20c10 0 16-6 16-16Z"/><path d="M6 18c4-4 8-8 12-12"/></svg>',
    chemie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3h4"/><path d="M10.5 3v6.2L5.7 18a2 2 0 0 0 1.8 2.9h9a2 2 0 0 0 1.8-2.9L13.5 9.2V3"/><path d="M8 15.5h8"/></svg>',
    physik: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/></svg>',
    geschichte: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12M6 21h12"/><path d="M7.5 3c0 4 3 5 4.5 6-1.5 1-4.5 2-4.5 6M16.5 3c0 4-3 5-4.5 6 1.5 1 4.5 2 4.5 6"/></svg>',
    erdkunde: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.4 3.8 5.6 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.6-3.8-9S9.5 5.4 12 3Z"/><path d="M4.5 7.5h15M4.5 16.5h15"/></svg>',
    politik: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M12 5 4 8l3 6.5h-6L4 8"/><path d="M12 5l8 3-3 6.5h6L20 8"/><path d="M8 21h8"/></svg>',
    religion: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c-1.8 2.4-2.8 4.6-2.8 6.6a2.8 2.8 0 1 0 5.6 0C14.8 6.6 13.8 4.4 12 2Z"/><path d="M6 21c0-4 2.7-6.5 6-6.5s6 2.5 6 6.5"/></svg>',
    kunst: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 8 0 1 0 0 16c1 0 1.6-.7 1.6-1.5 0-.4-.2-.8-.2-1.2 0-.9.7-1.3 1.6-1.3H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z"/><circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="9.5" cy="7.3" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="7.3" r="1" fill="currentColor" stroke="none"/><circle cx="16.5" cy="11" r="1" fill="currentColor" stroke="none"/></svg>',
    musik: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5.5l10-2v12.5"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/></svg>',
    sport: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/><path d="M5.3 5.3c2 1.6 3 3.9 3 6.7s-1 5.1-3 6.7M18.7 5.3c-2 1.6-3 3.9-3 6.7s1 5.1 3 6.7"/></svg>',
    informatik: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="12" rx="1.8"/><path d="M8 9.5 5.8 11l2.2 1.5M16 9.5l2.2 1.5-2.2 1.5M13.2 8.5l-2.4 7"/><path d="M9 21h6"/></svg>',
    wirtschaft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V6M16 20v-8M20 20v-4"/><path d="M4 20h18"/></svg>'
  };

  var FACH_PRESETS = [
    { name: 'Mathematik', icon: 'mathematik' },
    { name: 'Deutsch', icon: 'deutsch' },
    { name: 'Englisch', icon: 'englisch' },
    { name: 'Französisch', icon: 'franzoesisch' },
    { name: 'Spanisch', icon: 'spanisch' },
    { name: 'Latein', icon: 'latein' },
    { name: 'Biologie', icon: 'biologie' },
    { name: 'Chemie', icon: 'chemie' },
    { name: 'Physik', icon: 'physik' },
    { name: 'Geschichte', icon: 'geschichte' },
    { name: 'Erdkunde', icon: 'erdkunde' },
    { name: 'Politik', icon: 'politik' },
    { name: 'Religion', icon: 'religion' },
    { name: 'Kunst', icon: 'kunst' },
    { name: 'Musik', icon: 'musik' },
    { name: 'Sport', icon: 'sport' },
    { name: 'Informatik', icon: 'informatik' },
    { name: 'Wirtschaft', icon: 'wirtschaft' }
  ];

  function getFachIconSvg(iconKey) {
    return FACH_ICONS[iconKey] || null;
  }

  /* ---------------------------------------------------------
     Seed data
     --------------------------------------------------------- */

  var SEED = {
    faecher: [
      { id: 'mathematik', name: 'Mathematik', klasse: '8. Klasse', initial: 'M', farbe: 'blue', icon: 'mathematik' },
      { id: 'deutsch', name: 'Deutsch', klasse: '8. Klasse', initial: 'D', farbe: 'rose', icon: 'deutsch' },
      { id: 'englisch', name: 'Englisch', klasse: '8. Klasse', initial: 'E', farbe: 'amber', icon: 'englisch' },
      { id: 'biologie', name: 'Biologie', klasse: '8. Klasse', initial: 'B', farbe: 'teal', icon: 'biologie' },
      { id: 'geschichte', name: 'Geschichte', klasse: '9. Klasse', initial: 'G', farbe: 'terracotta', icon: 'geschichte' }
    ],

    themen: [
      { id: 'bruchrechnung', fachId: 'mathematik', name: 'Bruchrechnung', beschreibung: 'Kürzen, Erweitern und Rechnen mit Brüchen — die Grundlage für Prozent- und Verhältnisrechnung.' },
      { id: 'lineare-gleichungen', fachId: 'mathematik', name: 'Lineare Gleichungen', beschreibung: 'Gleichungen und Gleichungssysteme lösen, grafisch und rechnerisch.' },
      { id: 'prozentrechnung', fachId: 'mathematik', name: 'Prozentrechnung', beschreibung: 'Grundwert, Prozentwert und Prozentsatz im Alltag anwenden.' },
      { id: 'flaechenberechnung', fachId: 'mathematik', name: 'Flächenberechnung', beschreibung: 'Flächeninhalte von Dreieck, Trapez und zusammengesetzten Figuren.' },

      { id: 'gedichtanalyse', fachId: 'deutsch', name: 'Gedichtanalyse', beschreibung: 'Metrik, Reimschema und sprachliche Mittel systematisch untersuchen.' },
      { id: 'eroerterung', fachId: 'deutsch', name: 'Erörterung', beschreibung: 'Argumente strukturieren und eine schlüssige Erörterung aufbauen.' },
      { id: 'satzglieder', fachId: 'deutsch', name: 'Satzglieder', beschreibung: 'Subjekt, Prädikat und Objekte sicher bestimmen.' },

      { id: 'simple-past-present-perfect', fachId: 'englisch', name: 'Simple Past vs. Present Perfect', beschreibung: 'Wann welche Zeitform — Signalwörter und typische Fehler.' },
      { id: 'vocabulary-environment', fachId: 'englisch', name: 'Vocabulary: Environment', beschreibung: 'Wortschatz rund um Klima und Umwelt sicher anwenden.' },
      { id: 'essay-writing', fachId: 'englisch', name: 'Essay Writing', beschreibung: 'Aufbau, Struktur und sprachliche Verbindungen für Essays.' },

      { id: 'zellbiologie', fachId: 'biologie', name: 'Zellbiologie', beschreibung: 'Aufbau und Funktion von Tier- und Pflanzenzellen.' },
      { id: 'genetik-vererbung', fachId: 'biologie', name: 'Genetik: Vererbung', beschreibung: 'Mendelsche Regeln und Erbgänge verstehen.' },
      { id: 'oekosystem-wald', fachId: 'biologie', name: 'Ökosystem Wald', beschreibung: 'Nahrungsnetze, Stoffkreisläufe und Artenvielfalt im Wald.' },

      { id: 'weimarer-republik', fachId: 'geschichte', name: 'Weimarer Republik', beschreibung: 'Entstehung, Krisen und Scheitern der ersten deutschen Demokratie.' },
      { id: 'kalter-krieg', fachId: 'geschichte', name: 'Kalter Krieg', beschreibung: 'Blockbildung, Wettrüsten und Stellvertreterkonflikte.' }
    ],

    chats: [
      { id: 'c1', fachId: 'mathematik', themaId: 'bruchrechnung', titel: 'Erklär mir das Kürzen von Brüchen', modus: 'erklaeren', updated: 'vor 2 Stunden', messages: [
        { role: 'user', text: 'Kannst du mir erklären, wie man Brüche kürzt? Ich verstehe nicht, warum man einfach durch dieselbe Zahl teilen darf.' },
        { role: 'ai', text: 'Gerne! Ein Bruch verändert seinen Wert nicht, wenn du Zähler und Nenner durch dieselbe Zahl teilst — du teilst ja quasi beide „Hälften" gleich stark, das Verhältnis bleibt gleich. Nimm 8/12: teilbar durch 4 → 2/3. Möchtest du es an einer eigenen Aufgabe üben?' },
        { role: 'user', text: 'Ja, gib mir bitte eine Aufgabe mit größeren Zahlen.' },
        { role: 'ai', text: 'Kürze 126/210 so weit wie möglich. Tipp: Suche zuerst den größten gemeinsamen Teiler von 126 und 210.' }
      ] },
      { id: 'c2', fachId: 'mathematik', themaId: 'lineare-gleichungen', titel: 'Hilfe bei Textaufgabe Gleichungssystem', modus: 'hausaufgaben', updated: 'gestern', messages: [
        { role: 'user', text: 'Zwei Zahlen: Die Summe ist 34, die Differenz ist 8. Wie stelle ich das Gleichungssystem auf?' },
        { role: 'ai', text: 'Nenne die Zahlen x und y. Aus dem Text folgt: x + y = 34 und x − y = 8. Wenn du beide Gleichungen addierst, fällt y weg — probier das mal und sag mir, was du für x bekommst.' }
      ] },
      { id: 'c3', fachId: 'deutsch', themaId: 'gedichtanalyse', titel: 'Metrik und Reimschema erklären', modus: 'erklaeren', updated: 'vor 3 Tagen', messages: [
        { role: 'user', text: 'Was ist der Unterschied zwischen Jambus und Trochäus?' },
        { role: 'ai', text: 'Beim Jambus folgt auf eine unbetonte eine betonte Silbe (taTUM), beim Trochäus umgekehrt (TAMta). Lies laut „Der Mond ist aufgegangen" — spürst du das TAMta-Muster? Das ist ein Trochäus.' }
      ] },
      { id: 'c4', fachId: 'englisch', themaId: 'essay-writing', titel: 'Feedback zu meinem Essay-Aufbau', modus: 'hausaufgaben', updated: 'vor 5 Tagen', messages: [
        { role: 'user', text: 'Ist es okay, wenn mein Essay nur zwei Argumente im Hauptteil hat?' },
        { role: 'ai', text: 'Zwei starke, gut belegte Argumente sind besser als drei schwache. Achte darauf, dass jedes Argument einen eigenen Absatz mit Beispiel bekommt und dass du im Fazit beide wieder aufgreifst.' }
      ] },
      { id: 'c5', fachId: 'biologie', themaId: 'zellbiologie', titel: 'Unterschied Mitochondrien und Chloroplasten', modus: 'erklaeren', updated: 'vor 1 Woche', messages: [
        { role: 'user', text: 'Warum haben nur Pflanzenzellen Chloroplasten?' },
        { role: 'ai', text: 'Chloroplasten betreiben Fotosynthese — sie wandeln Lichtenergie in chemische Energie um. Das brauchen nur Organismen, die sich selbst über Sonnenlicht ernähren, also Pflanzen und Algen. Mitochondrien dagegen haben fast alle Zellen, da sie für die Energiegewinnung aus Nährstoffen zuständig sind.' }
      ] },
      { id: 'c6', fachId: 'mathematik', themaId: 'bruchrechnung', titel: 'Rendering-Test: Stochastik-Formeln', modus: 'erklaeren', updated: 'gerade eben', messages: [
        { role: 'user', text: 'Kannst du mir ein paar Stochastik-Formeln zum Testen zusammenstellen — mit Brüchen, Wurzeln, Summen, einer Tabelle und einem Codeblock? Ich will sehen, wie das hier dargestellt wird.' },
        { role: 'ai', text: "# Stochastik – Rendering-Test\n\n## 1. Inline-Formeln\nDie Wahrscheinlichkeit ist $P(A) = \\frac{1}{2}$ und der Erwartungswert $E(X) = 3{,}5$.\nGriechische Zeichen inline: $\\mu$, $\\sigma$, $\\Omega$, $\\lambda$.\n\n## 2. Abgesetzte Formeln\n$$P(A) = \\frac{\\text{günstige Ergebnisse}}{\\text{mögliche Ergebnisse}}$$\n\n$$P(X=k) = \\binom{n}{k} \\, p^k \\, (1-p)^{\\,n-k}$$\n\n## 3. Brüche & verschachtelte Brüche\n$$P(A \\mid B) = \\frac{P(A \\cap B)}{P(B)} = \\frac{\\frac{1}{6}}{\\frac{1}{2}} = \\frac{1}{3}$$\n\n## 4. Wurzeln & Potenzen\n$$\\sigma = \\sqrt{n \\cdot p \\cdot (1-p)} \\qquad x^{2} + y^{n-1} = z^{k}$$\n\n## 5. Summen & Produkte\n$$E(X) = \\sum_{i=1}^{n} x_i \\cdot P(X = x_i)$$\n\n$$P(\\text{kein Treffer}) = \\prod_{i=1}^{n} (1 - p_i)$$\n\n## 6. Mengen & Operatoren\nEreignisse: $A \\cup B$, $A \\cap B$, $A \\subseteq \\Omega$, $\\bar{A}$, $\\emptyset$.\nUngleichungen: $0 \\leq P(A) \\leq 1$ und $P(A) \\neq P(B)$.\n\n## 7. Gegenereignis / mehrzeilig\n$$P(\\bar{A}) = 1 - P(A)$$\n$$P(A \\cup B) = P(A) + P(B) - P(A \\cap B)$$\n\n## 8. Tabelle (Wahrscheinlichkeitsverteilung)\n| $k$ | 0 | 1 | 2 | 3 |\n|-----|-----|-----|-----|-----|\n| $P(X=k)$ | 0,125 | 0,375 | 0,375 | 0,125 |\n\n## 9. Codeblock (soll NICHT als Formel gerendert werden)\n```python\nfrom math import comb\ndef binom(n, k, p):\n    return comb(n, k) * p**k * (1-p)**(n-k)\n```\n\n## 10. Gemischt: Text, Liste, Formel\nFür die Binomialverteilung gilt:\n- **Erwartungswert:** $\\mu = n \\cdot p$\n- **Varianz:** $\\sigma^2 = n \\cdot p \\cdot (1-p)$\n- **Standardabweichung:** $\\sigma = \\sqrt{n \\cdot p \\cdot (1-p)}$\n\n## 11. Sonderzeichen-Escaping\nDollar in Text (kein Math): Der Preis beträgt 5\\$ pro Stück.\nBackslash & geschweifte Klammern: $\\{x \\in \\mathbb{N} \\mid x > 0\\}$." }
      ] }
    ],

    lernzettel: [
      {
        id: 'l1', fachId: 'mathematik', themaId: 'bruchrechnung', titel: 'Bruchrechnung — Grundlagen & Regeln', updated: 'vor 2 Stunden', freeMessagesUsed: 3,
        content: '## Kürzen und Erweitern\nEin Bruch ändert seinen Wert nicht, wenn Zähler und Nenner mit derselben Zahl multipliziert oder durch dieselbe Zahl geteilt werden.\n\nBeispiel: 8/12 → durch 4 teilen → 2/3\n\n## Gleichnamig machen\nUm Brüche zu addieren oder zu subtrahieren, brauchen sie denselben Nenner (das kgV der Nenner).\n\n## Multiplikation und Division\nZähler mal Zähler, Nenner mal Nenner. Bei Division wird mit dem Kehrwert multipliziert.',
        revisionMessages: [
          { role: 'user', text: 'Kannst du ein Beispiel zum Gleichnamig-Machen ergänzen?' },
          { role: 'ai', text: 'Klar — ich habe im Abschnitt „Gleichnamig machen" ein Beispiel ergänzt: 1/4 + 1/6 → kgV(4,6)=12 → 3/12 + 2/12 = 5/12.' }
        ]
      },
      { id: 'l2', fachId: 'mathematik', themaId: 'prozentrechnung', titel: 'Prozentrechnung im Alltag', updated: 'vor 1 Tag', freeMessagesUsed: 0, content: '## Grundformel\nProzentwert = Grundwert × Prozentsatz / 100\n\n## Typische Anwendungen\nRabatt, Zinsen, Mehrwertsteuer — immer erst den Grundwert identifizieren.', revisionMessages: [] },
      { id: 'l3', fachId: 'deutsch', themaId: 'gedichtanalyse', titel: 'Gedichtanalyse: Aufbau & Fachbegriffe', updated: 'vor 3 Tagen', freeMessagesUsed: 10, content: '## Aufbau einer Gedichtanalyse\n1. Einleitung (Autor, Titel, Erscheinungsjahr, Thema)\n2. Formale Analyse (Metrum, Reimschema, Strophenform)\n3. Inhaltliche Analyse\n4. Sprachliche Mittel und ihre Wirkung\n5. Deutungshypothese\n\n## Wichtige Fachbegriffe\nJambus, Trochäus, Enjambement, Metapher, Anapher.', revisionMessages: [
        { role: 'user', text: 'Füg noch eine Erklärung zu Enjambement hinzu.' },
        { role: 'ai', text: 'Enjambement = ein Satz läuft über das Zeilenende hinaus in die nächste Zeile weiter. Wirkung: erzeugt Lesefluss oder Spannung.' }
      ] },
      { id: 'l4', fachId: 'englisch', themaId: 'vocabulary-environment', titel: 'Environment Vocabulary — Wortliste', updated: 'vor 4 Tagen', freeMessagesUsed: 1, content: '## Key Vocabulary\nclimate change, greenhouse gas, renewable energy, deforestation, sustainability, carbon footprint.\n\n## Useful phrases\n"contribute to global warming", "reduce our environmental impact"', revisionMessages: [] },
      { id: 'l5', fachId: 'biologie', themaId: 'zellbiologie', titel: 'Zellbiologie im Überblick', updated: 'vor 6 Tagen', freeMessagesUsed: 0, content: '## Zellorganellen\nZellkern (Erbgut), Mitochondrien (Energie), bei Pflanzen zusätzlich Chloroplasten (Fotosynthese) und Zellwand.', revisionMessages: [] }
    ],

    dateien: [
      { id: 'd1', fachId: 'mathematik', themaId: 'bruchrechnung', name: 'Bruchrechnung_Uebungsblatt.pdf', typ: 'pdf', groesse: '1.2 MB', updated: 'vor 2 Stunden', status: 'bereit', zusammenfassung: 'Übungsblatt mit 12 Aufgaben zum Kürzen und Erweitern von Brüchen, inkl. Lösungen.' },
      { id: 'd2', fachId: 'mathematik', themaId: 'lineare-gleichungen', name: 'Gleichungssysteme_Skript.pdf', typ: 'pdf', groesse: '860 KB', updated: 'vor 1 Tag', status: 'bereit', zusammenfassung: 'Skript zu Einsetzungs-, Gleichsetzungs- und Additionsverfahren mit Beispielrechnungen.' },
      { id: 'd3', fachId: 'deutsch', themaId: 'gedichtanalyse', name: 'Gedicht_Erlkoenig_Analyse.pdf', typ: 'pdf', groesse: '340 KB', updated: 'vor 3 Tagen', status: 'bereit', zusammenfassung: 'Musteranalyse von Goethes „Erlkönig" mit Fokus auf Metrik und Spannungsaufbau.' },
      { id: 'd4', fachId: 'englisch', themaId: 'essay-writing', name: 'Essay_Draft_V2.docx', typ: 'doc', groesse: '48 KB', updated: 'vor 5 Tagen', status: 'bereit', zusammenfassung: 'Zweiter Entwurf eines Essays zum Thema Klimawandel, drei Absätze im Hauptteil.' },
      { id: 'd5', fachId: 'biologie', themaId: 'zellbiologie', name: 'Zellaufbau_Diagramm.png', typ: 'img', groesse: '2.1 MB', updated: 'vor 1 Woche', status: 'bereit', zusammenfassung: 'Beschriftetes Diagramm einer Tier- und Pflanzenzelle im Vergleich.' },
      { id: 'd6', fachId: 'geschichte', themaId: 'weimarer-republik', name: 'Quellenanalyse_Weimar.pdf', typ: 'pdf', groesse: '610 KB', updated: 'vor 2 Wochen', status: 'bereit', zusammenfassung: 'Quellenanalyse zu einer Rede aus der Weimarer Republik mit Einordnungshilfe.' }
    ],

    klausuren: [
      { id: 'k1', fachId: 'mathematik', themaIds: ['bruchrechnung', 'prozentrechnung', 'flaechenberechnung'], titel: 'Mathe Klausur 1 — 8. Klasse', datum: '2026-09-14' },
      { id: 'k2', fachId: 'mathematik', themaIds: ['lineare-gleichungen'], titel: 'Mathe Klausur 2 — Lineare Gleichungen', datum: '2026-10-02' },
      { id: 'k3', fachId: 'deutsch', themaIds: ['gedichtanalyse'], titel: 'Deutsch Klausur — Gedichtanalyse', datum: '2026-09-20' },
      { id: 'k4', fachId: 'englisch', themaIds: ['vocabulary-environment', 'simple-past-present-perfect'], titel: 'Englisch Vocabulary Test', datum: '2026-09-08' },
      { id: 'k5', fachId: 'biologie', themaIds: ['zellbiologie', 'genetik-vererbung'], titel: 'Bio Klausur — Zellbiologie & Genetik', datum: '2026-10-15' },
      { id: 'k6', fachId: 'geschichte', themaIds: ['weimarer-republik'], titel: 'Geschichte Klausur — Weimarer Republik', datum: '2026-09-28' },

      // --- Bereits geschriebene Klausuren: `datum` liegt in der Vergangenheit.
      // Der Kartenzustand „geschrieben" leitet sich allein aus dem Datum ab
      // (Lesify.klausurVergangen). Die tatsächlich erreichte Note wird bewusst
      // nirgends erfasst — Lesify ist zur Vorbereitung da.
      { id: 'k7', fachId: 'deutsch', themaIds: ['satzglieder'], titel: 'Deutsch Klausur — Satzglieder & Grammatik', datum: '2026-08-05' },
      { id: 'k8', fachId: 'englisch', themaIds: ['essay-writing'], titel: 'Englisch Klausur — Essay Writing', datum: '2026-08-24' },
      { id: 'k9', fachId: 'biologie', themaIds: ['oekosystem-wald'], titel: 'Bio Klausur — Ökosystem Wald', datum: '2026-08-13' },
      { id: 'k10', fachId: 'geschichte', themaIds: ['kalter-krieg'], titel: 'Geschichte Klausur — Kalter Krieg', datum: '2026-07-18' },
      { id: 'k11', fachId: 'mathematik', themaIds: ['bruchrechnung', 'prozentrechnung'], titel: 'Mathe Klausur — Bruch- & Prozentrechnung', datum: '2026-07-31' }
    ],

    // Testklausuren sind eigenständig, können optional an eine Klausur (klausurId)
    // gebunden sein. Ein Lernplan bindet bis zu zwei davon (Tag 1 + Tag 5) —
    // testklausurForKlausur() gibt die zuletzt erstellte zurück (= Testklausur 2,
    // sobald sie existiert).
    testklausuren: [
      {
        id: 't1', klausurId: 'k1', fachId: 'mathematik', themaIds: ['bruchrechnung', 'prozentrechnung', 'flaechenberechnung'],
        titel: 'Testklausur 1 — Mathe Klausur 1 — 8. Klasse', erstelltAm: 'vor 4 Tagen', status: 'analysiert', geloesteDateiName: 'Loesung_Mathe_Testklausur1.pdf',
        aufgaben: [
          { themaId: 'bruchrechnung', frage: 'Kürze 168/294 vollständig und erkläre deinen Rechenweg in mindestens drei Sätzen.' },
          { themaId: 'prozentrechnung', frage: 'Ein Fahrrad kostet ursprünglich 420 €, im Sale 15% reduziert. Berechne den neuen Preis und erkläre deinen Rechenweg.' },
          { themaId: 'flaechenberechnung', frage: 'Berechne den Flächeninhalt eines Trapezes mit a = 8 cm, c = 5 cm und Höhe 4 cm. Erkläre die verwendete Formel.' }
        ],
        ergebnis: {
          note: 3.2, prozent: 56,
          proThema: [
            { themaId: 'bruchrechnung', prozent: 18, note: 5.1, erklaerung: 'Beim Kürzen fehlt der systematische Weg über den größten gemeinsamen Teiler — die Brüche wurden gar nicht oder nur um einen kleinen Faktor gekürzt. Dieses Thema sollte von Grund auf neu aufgebaut werden.' },
            { themaId: 'prozentrechnung', prozent: 92, note: 1.4, erklaerung: 'Sauber gelöst — Grundwert und Prozentsatz korrekt erkannt, Rechenweg nachvollziehbar erklärt.' },
            { themaId: 'flaechenberechnung', prozent: 58, note: 3.1, erklaerung: 'Die Trapezformel wurde richtig angewendet, aber bei der Höhe wurde ein Wert vertauscht — das Endergebnis stimmt dadurch nicht ganz.' }
          ]
        },
        vorbereitung: {
          note: 3.2,
          proThema: [
            { themaId: 'bruchrechnung', prozent: 18, note: 5.1, ampel: 'rot' },
            { themaId: 'prozentrechnung', prozent: 92, note: 1.4, ampel: 'gruen' },
            { themaId: 'flaechenberechnung', prozent: 58, note: 3.1, ampel: 'gelb' }
          ]
        }
      },
      {
        id: 't2', klausurId: 'k4', fachId: 'englisch', themaIds: ['vocabulary-environment', 'simple-past-present-perfect'],
        titel: 'Testklausur 1 — Englisch Vocabulary Test', erstelltAm: 'vor 1 Woche', status: 'analysiert', geloesteDateiName: 'Loesung_Englisch_Test.pdf',
        aufgaben: [
          { themaId: 'vocabulary-environment', frage: 'Write four sentences about climate change using at least six vocabulary words from this topic.' },
          { themaId: 'simple-past-present-perfect', frage: 'Fill in the correct tense: "I ___ (visit) Berlin three times." and "Yesterday I ___ (visit) the museum." Explain your choice.' }
        ],
        ergebnis: {
          note: 2.7, prozent: 66,
          proThema: [
            { themaId: 'vocabulary-environment', prozent: 94, note: 1.3, erklaerung: 'Wortschatz sicher und im richtigen Kontext angewendet.' },
            { themaId: 'simple-past-present-perfect', prozent: 38, note: 4.1, erklaerung: 'Simple Past und Present Perfect werden noch durcheinandergebracht — die Signalwörter („yesterday", „three times") führen nicht zuverlässig zur richtigen Zeitform. Grundlegend wiederholen.' }
          ]
        },
        vorbereitung: {
          note: 2.7,
          proThema: [
            { themaId: 'vocabulary-environment', prozent: 94, note: 1.3, ampel: 'gruen' },
            { themaId: 'simple-past-present-perfect', prozent: 38, note: 4.1, ampel: 'rot' }
          ]
        }
      },
      {
        id: 't3', klausurId: 'k6', fachId: 'geschichte', themaIds: ['weimarer-republik'],
        titel: 'Testklausur 1 — Geschichte Klausur — Weimarer Republik', erstelltAm: 'vor 2 Wochen', status: 'analysiert', geloesteDateiName: 'Loesung_Geschichte_Weimar.pdf',
        aufgaben: [
          { themaId: 'weimarer-republik', frage: 'Erkläre zwei zentrale Krisen der Weimarer Republik zwischen 1919 und 1923 und ihre Folgen.' }
        ],
        ergebnis: {
          note: 3.3, prozent: 55,
          proThema: [
            { themaId: 'weimarer-republik', prozent: 55, note: 3.3, erklaerung: 'Die beiden Krisen (Ruhrbesetzung, Hyperinflation) sind benannt, aber die Folgen bleiben oberflächlich — der Zusammenhang zwischen Geldentwertung und dem Vertrauensverlust in die Demokratie fehlt.' }
          ]
        },
        vorbereitung: {
          note: 3.3,
          proThema: [
            { themaId: 'weimarer-republik', prozent: 55, note: 3.3, ampel: 'gelb' }
          ]
        }
      },
      {
        id: 't4', klausurId: 'k3', fachId: 'deutsch', themaIds: ['gedichtanalyse'],
        titel: 'Testklausur 1 — Deutsch Klausur — Gedichtanalyse', erstelltAm: 'vor 1 Tag', status: 'geloest', geloesteDateiName: 'Loesung_Deutsch_Gedichtanalyse.pdf',
        aufgaben: [
          { themaId: 'gedichtanalyse', frage: 'Analysiere Metrum und Reimschema der ersten Strophe von Goethes „Willkommen und Abschied" und beschreibe die Wirkung.' }
        ],
        ergebnis: null, vorbereitung: null
      },
      {
        id: 't5', klausurId: 'k5', fachId: 'biologie', themaIds: ['zellbiologie', 'genetik-vererbung'],
        titel: 'Testklausur 1 — Bio Klausur — Zellbiologie & Genetik', erstelltAm: 'vor 3 Tagen', status: 'analysiert', geloesteDateiName: 'Loesung_Bio_Testklausur1.pdf',
        aufgaben: [
          { themaId: 'zellbiologie', frage: 'Beschreibe drei Zellorganellen und ihre Funktion im Vergleich Tier- vs. Pflanzenzelle.' },
          { themaId: 'genetik-vererbung', frage: 'Erkläre anhand eines Kreuzungsschemas die 1. Mendelsche Regel.' }
        ],
        ergebnis: {
          note: 1.8, prozent: 85,
          proThema: [
            { themaId: 'zellbiologie', prozent: 88, note: 1.6, erklaerung: 'Zellorganellen und ihre Funktionen sicher im Vergleich Tier-/Pflanzenzelle erklärt.' },
            { themaId: 'genetik-vererbung', prozent: 82, note: 1.9, erklaerung: 'Die 1. Mendelsche Regel wird am Kreuzungsschema korrekt hergeleitet, Uniformität sauber begründet.' }
          ]
        },
        vorbereitung: {
          note: 1.8,
          proThema: [
            { themaId: 'zellbiologie', prozent: 88, note: 1.6, ampel: 'gruen' },
            { themaId: 'genetik-vererbung', prozent: 82, note: 1.9, ampel: 'gruen' }
          ]
        }
      },
      {
        id: 't6', klausurId: 'k2', fachId: 'mathematik', themaIds: ['lineare-gleichungen'],
        titel: 'Testklausur 1 — Mathe Klausur 2 — Lineare Gleichungen', erstelltAm: 'gerade eben', status: 'erstellt', geloesteDateiName: null,
        aufgaben: [
          { themaId: 'lineare-gleichungen', frage: 'Löse das Gleichungssystem: x + y = 34, x − y = 8. Zeige deinen Lösungsweg Schritt für Schritt.' }
        ],
        ergebnis: null, vorbereitung: null
      },
      {
        id: 't2b', klausurId: 'k4', fachId: 'englisch', themaIds: ['simple-past-present-perfect'],
        titel: 'Testklausur 2 — Englisch Vocabulary Test', erstelltAm: 'vor 3 Tagen', status: 'analysiert', geloesteDateiName: 'Loesung_Englisch_Test2.pdf',
        aufgaben: [
          { themaId: 'simple-past-present-perfect', frage: 'Fill in the correct tense and explain: "She ___ (live) in Kiel since 2019." / "Last summer we ___ (travel) to Sweden."' }
        ],
        ergebnis: {
          note: 3.0, prozent: 61,
          proThema: [
            { themaId: 'simple-past-present-perfect', prozent: 61, note: 3.0, erklaerung: 'Deutlich besser als beim ersten Versuch — Present Perfect für Erfahrungen sitzt jetzt meistens. Bei „last summer" kippt die Zeitform aber noch gelegentlich ins Present Perfect.' }
          ]
        },
        vorbereitung: {
          note: 3.0,
          proThema: [
            { themaId: 'simple-past-present-perfect', prozent: 61, note: 3.0, ampel: 'gelb' }
          ]
        }
      },
      {
        id: 't3b', klausurId: 'k6', fachId: 'geschichte', themaIds: ['weimarer-republik'],
        titel: 'Testklausur 2 — Geschichte Klausur — Weimarer Republik', erstelltAm: 'vor 5 Tagen', status: 'analysiert', geloesteDateiName: 'Loesung_Geschichte_Weimar2.pdf',
        aufgaben: [
          { themaId: 'weimarer-republik', frage: 'Erläutere die Ursache-Folge-Kette von den Reparationen bis zur Hyperinflation 1923 und ihre Wirkung auf das Vertrauen in die Demokratie.' }
        ],
        ergebnis: {
          note: 2.1, prozent: 78,
          proThema: [
            { themaId: 'weimarer-republik', prozent: 78, note: 2.1, erklaerung: 'Jetzt mit klarer Ursache-Folge-Kette: Reparationen → Ruhrbesetzung → Gelddruck → Hyperinflation → Radikalisierung. Das sitzt.' }
          ]
        },
        vorbereitung: {
          note: 2.1,
          proThema: [
            { themaId: 'weimarer-republik', prozent: 78, note: 2.1, ampel: 'gruen' }
          ]
        }
      }
    ],

    // Ein Lernplan pro Klausur (1:1), 7 Tage von klausur.datum − 7 bis zur Klausur.
    // Deckt beim Seed eine Bandbreite an Zuständen ab (Tag 1 / Tag 3 / Tag 6 /
    // fertig / all-stark-Kurzschluss), damit der Flow ohne manuelles Durchklicken
    // testbar ist. Abgehakte Aufgaben je Lerntag stehen in `checklist`; die Seeds
    // nutzen noch den Legacy-Marker `tageErledigt` (Teilmenge {2,3,4,6,7}), den
    // lernplanStatus als „alle Punkte des Tages gehakt" liest und setLernplanCheck
    // beim ersten echten Haken nach `checklist` migriert. Tag 1/5 ergeben sich
    // aus dem Status der jeweiligen Testklausur.
    lernplaene: [
      // k1 — Tag 3: Testklausur 1 analysiert (mix stark/wackelig/schwach), Tag 2 erledigt, Lernzettel gestartet.
      {
        id: 'lp1', klausurId: 'k1', testklausur1Id: 't1', testklausur2Id: null,
        tageErledigt: [2], erstelltAm: 'vor 4 Tagen',
        lernzettel: {
          content: '# Lernzettel\n\n### Bruchrechnung\nWichtigste Regel, typischer Fehler und ein Merksatz zu Bruchrechnung — automatisch aus deinen Chats und Dateien zu diesem Thema zusammengefasst.\n\n### Flächenberechnung\nWichtigste Regel, typischer Fehler und ein Merksatz zu Flächenberechnung — automatisch aus deinen Chats und Dateien zu diesem Thema zusammengefasst.',
          aktualisiertAm: 'vor 2 Tagen'
        }
      },
      // k2 — Tag 1: Testklausur 1 gerade erstellt, noch nicht gelöst.
      { id: 'lp2', klausurId: 'k2', testklausur1Id: 't6', testklausur2Id: null, tageErledigt: [], lernzettel: null, erstelltAm: 'gerade eben' },
      // k3 — Tag 1: Testklausur 1 gelöst, bereit zur Analyse.
      { id: 'lp3', klausurId: 'k3', testklausur1Id: 't4', testklausur2Id: null, tageErledigt: [], lernzettel: null, erstelltAm: 'vor 1 Tag' },
      // k4 — Tag 6: beide Testklausuren analysiert, ein Thema in Testklausur 2 noch wackelig, Lernzettel mit angehängten Abschnitten.
      {
        id: 'lp4', klausurId: 'k4', testklausur1Id: 't2', testklausur2Id: 't2b',
        tageErledigt: [2, 3, 4], erstelltAm: 'vor 1 Woche',
        lernzettel: {
          content: '# Lernzettel\n\n### Simple Past vs. Present Perfect\nWichtigste Regel, typischer Fehler und ein Merksatz zu Simple Past vs. Present Perfect — automatisch aus deinen Chats und Dateien zu diesem Thema zusammengefasst.\n\n### Simple Past vs. Present Perfect\nWichtigste Regel, typischer Fehler und ein Merksatz zu Simple Past vs. Present Perfect — automatisch aus deinen Chats und Dateien zu diesem Thema zusammengefasst.\n\n### Simple Past vs. Present Perfect\nWichtigste Regel, typischer Fehler und ein Merksatz zu Simple Past vs. Present Perfect — automatisch aus deinen Chats und Dateien zu diesem Thema zusammengefasst.',
          aktualisiertAm: 'vor 2 Tagen'
        }
      },
      // k5 — Kurzschluss: Testklausur 1 komplett stark, Tage 2–4/6 nichts zu tun, Testklausur 2 nicht nötig.
      { id: 'lp5', klausurId: 'k5', testklausur1Id: 't5', testklausur2Id: null, tageErledigt: [], lernzettel: null, erstelltAm: 'vor 3 Tagen' },
      // k6 — fertig: Tag 7 abgeschlossen, beide Testklausuren analysiert.
      {
        id: 'lp6', klausurId: 'k6', testklausur1Id: 't3', testklausur2Id: 't3b',
        tageErledigt: [2, 3, 4, 6, 7], erstelltAm: 'vor 2 Wochen',
        lernzettel: {
          content: '# Lernzettel\n\n### Weimarer Republik\nWichtigste Regel, typischer Fehler und ein Merksatz zu Weimarer Republik — automatisch aus deinen Chats und Dateien zu diesem Thema zusammengefasst.\n\n### Weimarer Republik\nWichtigste Regel, typischer Fehler und ein Merksatz zu Weimarer Republik — automatisch aus deinen Chats und Dateien zu diesem Thema zusammengefasst.',
          aktualisiertAm: 'vor 4 Tagen'
        }
      }
    ],

    // Abo/Tarif des aktiven Profils. `paket` steuert alle Monats-Limits
    // (siehe Lesify.PLAN_LIMITS), `familie` ist gesetzt, wenn dieses Profil
    // Teil eines Familien-Pakets ist (Sitzzahl 2–4; jedes Kind hat das
    // volle Tarif-Kontingent, Nutzung wird nicht geteilt/übertragen).
    // `status`: aktiv | gekuendigt | pausiert (Sommerpause). `familie` wird erst
    // gesetzt, wenn dieses Profil ein Familien-Abo hält (Sitzzahl 2–4) —
    // im Prototyp durch `Lesify.setRolle('elternteil')`.
    plan: { paket: 'premium', intervall: 'monatlich', status: 'aktiv', familie: null },

    // Familien-/Elternkonto (Backend: `User.rolle = elternteil`, besitzt das
    // `Abo`, verwaltet 1–4 Kind-Profile über `parentUserId`). Im Prototyp wird
    // der Eltern-Bereich über den Dev-Schalter auf einstellungen.html
    // (`Lesify.setRolle('elternteil')`) aktiviert. Die Wochen-Kennzahlen je Kind
    // spiegeln exakt `GET /abo/kinder/:id/zusammenfassung` (kein Chat-Wortlaut).
    familie: {
      elternName: 'Sabine Berger',
      elternEmail: 'sabine.berger@example.com',
      einwilligungAm: '2026-08-14',
      kinder: [
        {
          id: 'kind-mara', name: 'Mara Berger', klasse: '8. Klasse', farbe: 'violet',
          email: 'mara.berger@example.com', eingeladen: true, aktiv: true,
          letzteAktivitaet: 'vor 3 Stunden',
          erinnerungVorKlausuren: true, woechentlicheZusammenfassung: true,
          woche: {
            faecher: 6, themen: 14, chatsDieWoche: 9, nachrichtenDieWoche: 63,
            lernzettelGesamt: 11, testklausurenDieWoche: 2, anstehendeKlausuren: 2
          }
        },
        {
          id: 'kind-jonas', name: 'Jonas Berger', klasse: '6. Klasse', farbe: 'teal',
          email: 'jonas.berger@example.com', eingeladen: true, aktiv: true,
          letzteAktivitaet: 'vor 2 Tagen',
          erinnerungVorKlausuren: true, woechentlicheZusammenfassung: false,
          woche: {
            faecher: 4, themen: 7, chatsDieWoche: 2, nachrichtenDieWoche: 11,
            lernzettelGesamt: 3, testklausurenDieWoche: 0, anstehendeKlausuren: 1
          }
        },
        {
          id: 'kind-lea', name: 'Lea Berger', klasse: '9. Klasse', farbe: 'amber',
          email: null, eingeladen: false, aktiv: false,
          letzteAktivitaet: null,
          erinnerungVorKlausuren: true, woechentlicheZusammenfassung: true,
          woche: {
            faecher: 0, themen: 0, chatsDieWoche: 0, nachrichtenDieWoche: 0,
            lernzettelGesamt: 0, testklausurenDieWoche: 0, anstehendeKlausuren: 0
          }
        }
      ]
    },

    // Verbrauchszähler des laufenden Monats. Die Obergrenzen kommen aus
    // dem Tarif (Lesify.usage() mischt used + limit), nicht von hier.
    usage: {
      nachrichten: { used: 168 },
      dateien: { used: 24 },
      lernzettel: { used: 7 },
      testklausuren: { used: 2 },
      resetDatum: '2026-10-01'
    },

    // `rolle`: schueler | elternteil. Steuert im Prototyp, welche Nav-Variante
    // und welcher Bereich (Schüler-App vs. eltern.html) gezeigt wird.
    user: { name: 'Jannik B.', klasse: '8. Klasse', rolle: 'schueler' },

    settings: {
      erinnerungVorKlausuren: true,
      woechentlicheZusammenfassung: false,
      ki_tonfall: 'freundlich',
      // Erscheinungsbild der App (nur eingeloggter Bereich, nicht Marketing).
      // Wird beim Seitenaufbau als data-theme="dark" am <html> gesetzt.
      darkMode: false
    }
  };

  /* ---------------------------------------------------------
     localStorage overlay (user-created content + Live-Zustand)
     --------------------------------------------------------- */

  function emptyStore() {
    return {
      faecher: [], themen: [], chats: [], lernzettel: [], dateien: [], klausuren: [],
      testklausuren: [], testklausurOverrides: {}, lernplaene: [], lernplanOverrides: {},
      fachOverrides: {}, usageDelta: { nachrichten: 0, dateien: 0, lernzettel: 0, testklausuren: 0 },
      planOverride: null, userOverride: null, settingsOverride: null,
      // Eltern-Zugang (Phase 12): `rolleOverride` schaltet den Eltern-Bereich frei
      // (Dev-Schalter), `kinder` wird nach der ersten Mutation zur Quelle der
      // Kind-Liste, `elternModus` hält den Kontext-Wechsel „Als Kind ansehen".
      rolleOverride: null, kinder: null, elternModus: null
    };
  }

  function readStore() {
    try {
      var raw = global.localStorage.getItem(DB_KEY);
      if (!raw) return emptyStore();
      var parsed = JSON.parse(raw);
      var base = emptyStore();
      for (var key in base) { if (parsed[key] !== undefined) base[key] = parsed[key]; }
      return base;
    } catch (e) {
      return emptyStore();
    }
  }

  function writeStore(store) {
    try { global.localStorage.setItem(DB_KEY, JSON.stringify(store)); } catch (e) { /* storage unavailable */ }
  }

  var store = readStore();
  function persist() { writeStore(store); }

  /* ---------------------------------------------------------
     Public API
     --------------------------------------------------------- */

  var Lesify = {};
  Lesify.prozentZuNote = prozentZuNote;
  Lesify.noteLabel = noteLabel;
  Lesify.noteAmpel = noteAmpel;
  Lesify.tierLabel = tierLabel;
  Lesify.AMPEL_GRUEN_MAX_NOTE = AMPEL_GRUEN_MAX_NOTE;
  Lesify.FACH_COLORS = FACH_COLORS;
  Lesify.getFachColor = getFachColor;
  Lesify.FACH_PRESETS = FACH_PRESETS;
  Lesify.getFachIconSvg = getFachIconSvg;

  function withFachOverride(f) {
    var override = store.fachOverrides[f.id];
    if (!override) return f;
    var clone = {};
    for (var key in f) { clone[key] = f[key]; }
    for (var key2 in override) { clone[key2] = override[key2]; }
    return clone;
  }
  Lesify.faecher = function () { return SEED.faecher.concat(store.faecher).map(withFachOverride); };
  Lesify.themen = function (fachId) {
    var all = SEED.themen.concat(store.themen);
    return fachId ? all.filter(function (t) { return t.fachId === fachId; }) : all;
  };
  Lesify.chats = function (themaId) {
    var all = SEED.chats.concat(store.chats);
    return themaId ? all.filter(function (c) { return c.themaId === themaId; }) : all;
  };
  Lesify.lernzettel = function (themaId) {
    var all = SEED.lernzettel.concat(store.lernzettel);
    return themaId ? all.filter(function (l) { return l.themaId === themaId; }) : all;
  };
  Lesify.dateien = function (themaId) {
    var all = SEED.dateien.concat(store.dateien);
    return themaId ? all.filter(function (d) { return d.themaId === themaId; }) : all;
  };
  Lesify.klausuren = function (fachOrThemaId) {
    var all = SEED.klausuren.concat(store.klausuren);
    if (!fachOrThemaId) return all;
    return all.filter(function (k) { return k.fachId === fachOrThemaId || k.themaIds.indexOf(fachOrThemaId) !== -1; });
  };
  // Eine Klausur gilt als „bereits geschrieben", sobald ihr Datum vor dem
  // heutigen Tag liegt (reine Datumsableitung, kein eigenes Statusfeld). Die
  // UI zeigt solche Klausuren gedämpft/„erledigt" statt mit Countdown/Lernplan.
  Lesify.klausurVergangen = function (k) {
    if (!k || !k.datum) return false;
    var p = String(k.datum).split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    var heute = new Date();
    heute.setHours(0, 0, 0, 0);
    return d < heute;
  };

  function withOverride(t) {
    var override = store.testklausurOverrides[t.id];
    if (!override) return t;
    var clone = JSON.parse(JSON.stringify(t));
    for (var key in override) { clone[key] = override[key]; }
    return clone;
  }
  Lesify.testklausuren = function (fachOrThemaId) {
    var all = SEED.testklausuren.concat(store.testklausuren).map(withOverride);
    if (!fachOrThemaId) return all;
    return all.filter(function (t) { return t.fachId === fachOrThemaId || t.themaIds.indexOf(fachOrThemaId) !== -1; });
  };
  Lesify.testklausurenForKlausur = function (klausurId) {
    return Lesify.testklausuren().filter(function (t) { return t.klausurId === klausurId; });
  };
  // Eine Klausur hat bis zu zwei Testklausuren (Tag 1 + Tag 5). Diese Helfer gibt
  // die zuletzt erstellte zurück (= Testklausur 2, sobald vorhanden).
  Lesify.testklausurForKlausur = function (klausurId) {
    return Lesify.testklausurenForKlausur(klausurId).slice(-1)[0];
  };
  // „Die" Note einer Klausur für Karten/Übersichten. Es gibt KEINE fortlaufend
  // aktualisierte „Vorbereitungsnote" mehr — nur die zwei eingefrorenen
  // Testklausur-Noten. Angezeigt wird die Note der zuletzt abgeschlossenen
  // (analysierten) Testklausur: Testklausur 2, sobald sie analysiert ist, sonst
  // Testklausur 1. Rückgabe: { note, testNr, testklausur } | null.
  Lesify.klausurNote = function (klausurId) {
    var tks = Lesify.testklausurenForKlausur(klausurId);
    for (var i = tks.length - 1; i >= 0; i--) {
      var t = tks[i];
      if (t.status === 'analysiert' && t.ergebnis) {
        return { note: t.ergebnis.note, testNr: Math.min(i + 1, 2), testklausur: t };
      }
    }
    return null;
  };
  Lesify.testklausurenForThema = function (themaId) {
    return Lesify.testklausuren().filter(function (t) { return t.themaIds.indexOf(themaId) !== -1; });
  };

  /* ---- Lernplan: 1:1 zur Klausur, gleiches Seed+Store+Override-Muster wie Testklausur ---- */

  function withLernplanOverride(lp) {
    var override = store.lernplanOverrides[lp.id];
    if (!override) return lp;
    var clone = JSON.parse(JSON.stringify(lp));
    for (var key in override) { clone[key] = override[key]; }
    return clone;
  }
  Lesify.lernplaene = function () {
    return SEED.lernplaene.concat(store.lernplaene).map(withLernplanOverride);
  };
  Lesify.getLernplan = function (id) {
    return Lesify.lernplaene().find(function (lp) { return lp.id === id; });
  };
  Lesify.getLernplanFuerKlausur = function (klausurId) {
    return Lesify.lernplaene().filter(function (lp) { return lp.klausurId === klausurId; }).slice(-1)[0];
  };
  function saveLernplanOverride(id, patch) {
    var current = store.lernplanOverrides[id] || {};
    for (var key in patch) { current[key] = patch[key]; }
    store.lernplanOverrides[id] = current;
    persist();
    return withLernplanOverride(SEED.lernplaene.concat(store.lernplaene).find(function (lp) { return lp.id === id; }));
  }

  Lesify.getFach = function (id) { return Lesify.faecher().find(function (f) { return f.id === id; }); };
  Lesify.getFachIcon = function (fachId) {
    var f = Lesify.getFach(fachId);
    return f ? getFachIconSvg(f.icon) : null;
  };
  Lesify.getThema = function (id) { return Lesify.themen().find(function (t) { return t.id === id; }); };
  Lesify.getChat = function (id) { return Lesify.chats().find(function (c) { return c.id === id; }); };
  Lesify.getLernzettel = function (id) { return Lesify.lernzettel().find(function (l) { return l.id === id; }); };
  Lesify.getDatei = function (id) { return Lesify.dateien().find(function (d) { return d.id === id; }); };
  Lesify.getKlausur = function (id) { return Lesify.klausuren().find(function (k) { return k.id === id; }); };
  Lesify.getTestklausur = function (id) { return Lesify.testklausuren().find(function (t) { return t.id === id; }); };

  Lesify.label = function (themaId) {
    var thema = Lesify.getThema(themaId);
    if (!thema) return { fach: '—', thema: '—', fachId: '', themaId: themaId };
    var fach = Lesify.getFach(thema.fachId);
    return { fach: fach ? fach.name : '—', thema: thema.name, fachId: thema.fachId, themaId: thema.id };
  };

  Lesify.countsForThema = function (themaId) {
    return {
      chats: Lesify.chats(themaId).length,
      lernzettel: Lesify.lernzettel(themaId).length,
      dateien: Lesify.dateien(themaId).length,
      klausuren: Lesify.klausuren(themaId).length,
      testklausuren: Lesify.testklausurenForThema(themaId).length
    };
  };
  Lesify.countsForFach = function (fachId) {
    return { themen: Lesify.themen(fachId).length, klausuren: Lesify.klausuren(fachId).length };
  };

  /* ---- creators (persisted) ---- */

  Lesify.addFach = function (data) {
    var farbe = data.farbe || FACH_COLORS[Lesify.faecher().length % FACH_COLORS.length].key;
    var f = { id: uid('fach'), name: data.name, klasse: data.klasse || '', initial: (data.name || '?').trim().charAt(0).toUpperCase(), farbe: farbe, icon: data.icon || null };
    store.faecher.push(f); persist();
    return f;
  };
  Lesify.updateFach = function (id, patch) {
    store.fachOverrides[id] = store.fachOverrides[id] || {};
    for (var key in patch) { store.fachOverrides[id][key] = patch[key]; }
    persist();
    return Lesify.getFach(id);
  };
  Lesify.addThema = function (data) {
    var t = { id: uid('thema'), fachId: data.fachId, name: data.name, beschreibung: data.beschreibung || 'Noch keine Beschreibung hinterlegt.' };
    store.themen.push(t); persist();
    return t;
  };
  Lesify.addChat = function (data) {
    var c = { id: uid('chat'), fachId: data.fachId, themaId: data.themaId, titel: data.titel || 'Neuer Chat', modus: data.modus || null, updated: 'gerade eben', messages: data.messages || [] };
    store.chats.push(c); persist();
    return c;
  };
  Lesify.addDatei = function (data) {
    var d = { id: uid('datei'), fachId: data.fachId, themaId: data.themaId, name: data.name, typ: data.typ || 'pdf', groesse: data.groesse || '—', updated: 'gerade eben', status: 'verarbeitung', zusammenfassung: null };
    store.dateien.push(d); persist();
    return d;
  };
  Lesify.markDateiBereit = function (id, zusammenfassung) {
    var all = store.dateien;
    var item = all.find(function (d) { return d.id === id; });
    if (item) { item.status = 'bereit'; item.zusammenfassung = zusammenfassung; persist(); }
  };
  Lesify.addKlausur = function (data) {
    var k = {
      id: uid('klausur'), fachId: data.fachId, themaIds: data.themaIds, titel: data.titel, datum: data.datum
    };
    store.klausuren.push(k); persist();
    return k;
  };

  /* ---- Lernzettel: vollautomatische Erstellung + Chat-Überarbeitung ---- */

  var LERNZETTEL_ABSCHNITTE = [
    '## Kernpunkte\nBasierend auf allen Chats und Dateien zu diesem Thema wurden die wichtigsten Konzepte automatisch zusammengefasst.',
    '## Wichtige Begriffe\nDie zentralen Fachbegriffe aus deinen Unterlagen, kurz erklärt.',
    '## Typische Aufgaben\nBeispielhafte Aufgabentypen, wie sie in Klausuren zu diesem Thema vorkommen können.'
  ];
  Lesify.addLernzettel = function (data) {
    var thema = Lesify.getThema(data.themaId);
    var content = '# ' + (thema ? thema.name : 'Lernzettel') + '\n\n' + LERNZETTEL_ABSCHNITTE.join('\n\n');
    var l = { id: uid('lz'), fachId: data.fachId, themaId: data.themaId, titel: (thema ? thema.name : 'Thema') + ' — Lernzettel', updated: 'gerade eben', content: content, freeMessagesUsed: 0, revisionMessages: [] };
    store.lernzettel.push(l); persist();
    return l;
  };
  Lesify.addLernzettelRevision = function (id, userText, aiText, contentAppend) {
    var all = SEED.lernzettel.concat(store.lernzettel);
    var item = all.find(function (l) { return l.id === id; });
    if (!item) return null;
    // Seed-Lernzettel liegen nicht im Store — bei erster Bearbeitung dorthin klonen.
    var storeItem = store.lernzettel.find(function (l) { return l.id === id; });
    if (!storeItem) { storeItem = JSON.parse(JSON.stringify(item)); store.lernzettel.push(storeItem); }
    storeItem.revisionMessages.push({ role: 'user', text: userText });
    storeItem.revisionMessages.push({ role: 'ai', text: aiText });
    if (contentAppend) storeItem.content += '\n\n' + contentAppend;
    if (storeItem.freeMessagesUsed < 10) storeItem.freeMessagesUsed++;
    else Lesify.incrementUsage('nachrichten', 1);
    storeItem.updated = 'gerade eben';
    persist();
    return storeItem;
  };

  // Hängt Chat-Nachrichten dauerhaft an einen Chat an (User- wie KI-Nachricht).
  // Ohne diesen Schritt lebt ein aus einem Deep-Link entstandener Chat nur in der
  // lokalen Seiten-Variable und ist nach Reload/Chip-Wechsel weg. Gleiches
  // Seed-zu-Store-Klon-Muster wie addLernzettelRevision.
  Lesify.appendChatMessages = function (chatId, neueNachrichten) {
    var all = SEED.chats.concat(store.chats);
    var item = all.find(function (c) { return c.id === chatId; });
    if (!item) return null;
    var storeItem = store.chats.find(function (c) { return c.id === chatId; });
    if (!storeItem) { storeItem = JSON.parse(JSON.stringify(item)); store.chats.push(storeItem); }
    storeItem.messages = storeItem.messages.concat(neueNachrichten || []);
    storeItem.updated = 'gerade eben';
    persist();
    return storeItem;
  };

  /* ---- Testklausuren: Erstellen → Lösen → Analyse (2× pro Lernplan: Tag 1 + Tag 5) ---- */

  var AUFGABEN_VORLAGEN = {
    'bruchrechnung': 'Kürze {n1}/{n2} vollständig und erkläre deinen Rechenweg in mindestens drei Sätzen.',
    'prozentrechnung': 'Ein Artikel kostet {preis} €, im Sale {rabatt}% reduziert. Berechne den neuen Preis und erkläre deinen Rechenweg.',
    'lineare-gleichungen': 'Löse das Gleichungssystem: x + y = {a}, x − y = {b}. Zeige deinen Lösungsweg.',
    'flaechenberechnung': 'Berechne den Flächeninhalt eines Trapezes mit a = {a} cm, c = {b} cm und Höhe {h} cm.',
    'gedichtanalyse': 'Analysiere Metrum und Reimschema einer selbst gewählten Strophe und beschreibe die Wirkung.',
    'eroerterung': 'Formuliere zwei Pro- und zwei Contra-Argumente zu einem aktuellen Thema deiner Wahl.',
    'satzglieder': 'Bestimme Subjekt, Prädikat und Objekte im folgenden Satz: „Der Lehrer erklärt den Schülern die Aufgabe."',
    'simple-past-present-perfect': 'Fill in the correct tense and explain your choice: "I ___ (visit) Berlin three times." / "Yesterday I ___ (visit) the museum."',
    'vocabulary-environment': 'Write four sentences about climate change using at least six vocabulary words from this topic.',
    'essay-writing': 'Schreibe eine Gliederung (Einleitung, 2 Hauptargumente, Fazit) zu einem Thema deiner Wahl.',
    'zellbiologie': 'Beschreibe drei Zellorganellen und ihre Funktion im Vergleich Tier- vs. Pflanzenzelle.',
    'genetik-vererbung': 'Erkläre anhand eines Kreuzungsschemas die 1. Mendelsche Regel.',
    'oekosystem-wald': 'Beschreibe ein Nahrungsnetz im Wald mit mindestens vier Gliedern.',
    'weimarer-republik': 'Erkläre zwei zentrale Krisen der Weimarer Republik zwischen 1919 und 1923 und ihre Folgen.',
    'kalter-krieg': 'Erkläre die Bedeutung eines Ereignisses deiner Wahl für den Verlauf des Kalten Krieges.'
  };
  function zufallsZahl(min, max) { return Math.floor(min + Math.random() * (max - min)); }
  // Stabiler Pseudo-Lernstand je Thema (~40–89) als Basis für die simulierte
  // Testklausur-Auswertung — ersetzt das entfernte Datenfeld `Thema.mastery`.
  function themaBasis(themaId) {
    var h = 0, s = String(themaId || '');
    for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) | 0; }
    return 40 + Math.abs(h) % 50;
  }
  function aufgabeFuerThema(themaId) {
    var thema = Lesify.getThema(themaId);
    var vorlage = AUFGABEN_VORLAGEN[themaId] || ('Erkläre die wichtigsten Aspekte von ' + (thema ? thema.name : 'diesem Thema') + ' anhand eines Beispiels.');
    var frage = vorlage
      .replace('{n1}', zufallsZahl(60, 240)).replace('{n2}', zufallsZahl(120, 320))
      .replace('{preis}', zufallsZahl(30, 400)).replace('{rabatt}', zufallsZahl(10, 40))
      .replace('{a}', zufallsZahl(4, 14)).replace('{b}', zufallsZahl(2, 10)).replace('{h}', zufallsZahl(3, 9));
    return { themaId: themaId, frage: frage };
  }

  Lesify.addTestklausur = function (data) {
    var themaIds = data.themaIds;
    var t = {
      id: uid('tk'), klausurId: data.klausurId || null, fachId: data.fachId, themaIds: themaIds,
      titel: data.titel, erstelltAm: 'gerade eben', status: 'erstellt', geloesteDateiName: null,
      aufgaben: themaIds.map(aufgabeFuerThema),
      ergebnis: null, vorbereitung: null
    };
    store.testklausuren.push(t); persist();
    return t;
  };

  function saveOverride(id, patch) {
    var current = store.testklausurOverrides[id] || {};
    for (var key in patch) { current[key] = patch[key]; }
    store.testklausurOverrides[id] = current;
    persist();
    return withOverride(SEED.testklausuren.concat(store.testklausuren).find(function (t) { return t.id === id; }));
  }

  Lesify.markTestklausurGeloest = function (id, dateiName) {
    return saveOverride(id, { status: 'geloest', geloesteDateiName: dateiName });
  };

  function erklaerungFuerThema(themaId, prozent) {
    var thema = Lesify.getThema(themaId);
    var name = thema ? thema.name : 'diesem Thema';
    if (prozent >= 85) return 'Sehr sicher gelöst — der Rechenweg/die Argumentation zu ' + name + ' war klar und vollständig.';
    if (prozent >= 70) return 'Gut gelöst — die Grundidee zu ' + name + ' sitzt, einzelne Details waren noch ungenau.';
    if (prozent >= 45) return 'Der Ansatz zu ' + name + ' war erkennbar, aber es gab Lücken im Rechen-/Argumentationsweg. Diese Lücke gezielt üben.';
    return name + ' sollte nochmal von Grund auf wiederholt werden — der Lösungsweg hatte grundlegende Fehler.';
  }

  Lesify.analysiereTestklausur = function (id) {
    var t = Lesify.getTestklausur(id);
    if (!t) return null;
    var proThema = t.themaIds.map(function (themaId) {
      var basis = themaBasis(themaId);
      var prozent = clamp(Math.round(basis + zufallsZahl(-12, 9)), 8, 99);
      var note = prozentZuNote(prozent);
      return { themaId: themaId, prozent: prozent, note: note, erklaerung: erklaerungFuerThema(themaId, prozent) };
    });
    var gesamtProzent = Math.round(proThema.reduce(function (a, p) { return a + p.prozent; }, 0) / proThema.length);
    var ergebnis = { note: prozentZuNote(gesamtProzent), prozent: gesamtProzent, proThema: proThema };

    // Ampel wird direkt bei der Analyse dreistufig vergeben (noteAmpel: ≤2.5 gruen ·
    // ≤4.0 gelb · sonst rot) — im Lernplan als stark / wackelig / schwach angezeigt.
    var vorbereitungProThema = proThema.map(function (p) {
      return { themaId: p.themaId, prozent: p.prozent, note: p.note, ampel: noteAmpel(p.note) };
    });
    var vorbereitung = { note: ergebnis.note, proThema: vorbereitungProThema };

    return saveOverride(id, { status: 'analysiert', ergebnis: ergebnis, vorbereitung: vorbereitung });
  };

  /* ---- Lernplan-Flow: Erstellung, Testklausur 2, Lerntage, Lernzettel, Status ---- */

  // Wird direkt nach Lesify.addKlausur(...) aufgerufen (klausuren.html, thema.html).
  // Legt Testklausur 1 (Tag 1, alle Themen der Klausur) an und dazu genau einen Lernplan.
  Lesify.starteLernplan = function (klausurId) {
    var k = Lesify.getKlausur(klausurId);
    if (!k) return null;
    var tk1 = Lesify.addTestklausur({
      fachId: k.fachId, themaIds: k.themaIds,
      titel: 'Testklausur 1 — ' + k.titel, klausurId: klausurId
    });
    var lp = {
      id: uid('lernplan'), klausurId: klausurId, testklausur1Id: tk1.id,
      testklausur2Id: null, tageErledigt: [], lernzettel: null, chatMap: {}, erstelltAm: 'gerade eben'
    };
    store.lernplaene.push(lp); persist();
    return lp;
  };

  // Kontinuitäts-Zuordnung: bildet "{tag}|{modus}|{themaId}" auf die chatId ab, in
  // der dieser Lernplan-Schritt läuft. So teilen sich mehrere Aufgaben-Punkte
  // desselben Tags mit gleichem Modus + Thema (z. B. Tag 2 „Fehler klären" +
  // „Beispiel dazu") einen fortsetzbaren Chat, statt jedes Mal frisch zu starten.
  // Der Tag steckt bewusst fest im Schlüssel — kein Chat über mehrere Tage.
  function lernplanChatKey(tag, modus, themaId) { return tag + '|' + modus + '|' + themaId; }
  Lesify.getLernplanChatId = function (lernplanId, tag, modus, themaId) {
    var lp = Lesify.getLernplan(lernplanId);
    if (!lp || !lp.chatMap) return null;
    return lp.chatMap[lernplanChatKey(tag, modus, themaId)] || null;
  };
  Lesify.setLernplanChatId = function (lernplanId, tag, modus, themaId, chatId) {
    var lp = Lesify.getLernplan(lernplanId);
    var map = (lp && lp.chatMap) ? JSON.parse(JSON.stringify(lp.chatMap)) : {};
    map[lernplanChatKey(tag, modus, themaId)] = chatId;
    return saveLernplanOverride(lernplanId, { chatMap: map });
  };

  // Tag 5: dieselbe addTestklausur-Mechanik, nur auf die an Tag 1 schwachen/
  // wackeligen Themen beschränkt. testklausur.html löst/analysiert sie unverändert.
  Lesify.starteTestklausur2 = function (lernplanId) {
    var lp = Lesify.getLernplan(lernplanId);
    if (!lp || lp.testklausur2Id) return lp;
    var k = Lesify.getKlausur(lp.klausurId);
    var status = Lesify.lernplanStatus(lernplanId);
    var schwach = status ? status.tag1.schwacheThemen : [];
    var themaIds = schwach.length ? schwach : k.themaIds;
    var tk2 = Lesify.addTestklausur({
      fachId: k.fachId, themaIds: themaIds,
      titel: 'Testklausur 2 — ' + k.titel, klausurId: k.id
    });
    return saveLernplanOverride(lernplanId, { testklausur2Id: tk2.id });
  };

  // Kopiert die verschachtelte checklist-Map, damit Overrides nicht in-place mutiert werden.
  function cloneChecklist(raw) {
    var out = {};
    Object.keys(raw || {}).forEach(function (k) {
      out[k] = {};
      Object.keys(raw[k] || {}).forEach(function (kk) { out[k][kk] = raw[k][kk] === true; });
    });
    return out;
  }

  // Einen einzelnen Checklisten-Punkt eines Lerntags setzen. Der Tag-Status ergibt
  // sich in lernplanStatus daraus (alle Punkte gehakt = Tag erledigt). Beim ersten
  // Schreiben wird ein Legacy-Tag aus tageErledigt in die checklist materialisiert.
  Lesify.setLernplanCheck = function (lernplanId, tag, key, checked) {
    var lp = Lesify.getLernplan(lernplanId);
    if (!lp) return null;
    var s = Lesify.lernplanStatus(lernplanId);
    var keys = (s && s['tag' + tag] && s['tag' + tag].aufgaben) || [];
    var checklist = cloneChecklist(lp.checklist);
    var tagKey = String(tag);
    if (!checklist[tagKey]) {
      var warErledigt = (lp.tageErledigt || []).indexOf(tag) !== -1;
      checklist[tagKey] = {};
      keys.forEach(function (k) { checklist[tagKey][k] = warErledigt; });
    }
    checklist[tagKey][key] = !!checked;
    var tage = (lp.tageErledigt || []).filter(function (t) { return t !== tag; });
    return saveLernplanOverride(lernplanId, { checklist: checklist, tageErledigt: tage });
  };

  // Alle Punkte eines Lerntags auf einmal setzen — für den manuellen
  // „Tag X abschließen"-Button (checked=true) bzw. ein Zurücksetzen.
  Lesify.setLernplanTagChecks = function (lernplanId, tag, checked) {
    var lp = Lesify.getLernplan(lernplanId);
    if (!lp) return null;
    var s = Lesify.lernplanStatus(lernplanId);
    var keys = (s && s['tag' + tag] && s['tag' + tag].aufgaben) || [];
    var checklist = cloneChecklist(lp.checklist);
    checklist[String(tag)] = {};
    keys.forEach(function (k) { checklist[String(tag)][k] = !!checked; });
    var tage = (lp.tageErledigt || []).filter(function (t) { return t !== tag; });
    return saveLernplanOverride(lernplanId, { checklist: checklist, tageErledigt: tage });
  };

  function lernzettelAbschnitt(themaId) {
    var thema = Lesify.getThema(themaId);
    var name = thema ? thema.name : 'diesem Thema';
    return '### ' + name + '\nWichtigste Regel, typischer Fehler und ein Merksatz zu ' + name +
      ' — automatisch aus deinen Chats und Dateien zu diesem Thema zusammengefasst.';
  }

  // Kumulativ: erster Aufruf legt den Lernzettel an, spätere hängen an (Tag 3/4/6).
  Lesify.aktualisiereLernzettel = function (lernplanId, themaIds) {
    var lp = Lesify.getLernplan(lernplanId);
    if (!lp) return null;
    var neu = (themaIds || []).map(lernzettelAbschnitt).join('\n\n');
    var content = lp.lernzettel
      ? lp.lernzettel.content + '\n\n' + neu
      : '# Lernzettel\n\n' + neu;
    return saveLernplanOverride(lernplanId, { lernzettel: { content: content, aktualisiertAm: 'gerade eben' } });
  };

  // Ab so vielen schwachen Themen wird die Behandlung triagiert: die schwersten
  // LERNPLAN_FOKUS_LIMIT bekommen die volle 3-Schritt-Behandlung (fokusThemen),
  // der Rest wird kompakt gebündelt (kurzThemen).
  var LERNPLAN_FOKUS_LIMIT = 3;

  // Einzige Quelle der Wahrheit für alle Lernplan-UI — Seiten rendern nur, was hier
  // berechnet wird (aktueller Tag, schwache Themen, ob Testklausur 2 nötig ist …).
  Lesify.lernplanStatus = function (lernplanId) {
    var lernplan = Lesify.getLernplan(lernplanId);
    if (!lernplan) return null;
    var klausur = Lesify.getKlausur(lernplan.klausurId) || null;
    var testklausur1 = lernplan.testklausur1Id ? (Lesify.getTestklausur(lernplan.testklausur1Id) || null) : null;
    var testklausur2 = lernplan.testklausur2Id ? (Lesify.getTestklausur(lernplan.testklausur2Id) || null) : null;
    var tageErledigt = lernplan.tageErledigt || [];
    function istErledigt(tag) { return tageErledigt.indexOf(tag) !== -1; }

    var tk1Analysiert = !!(testklausur1 && testklausur1.status === 'analysiert' && testklausur1.vorbereitung);
    var klausurThemen = klausur ? klausur.themaIds : (testklausur1 ? testklausur1.themaIds : []);
    var proThema1 = tk1Analysiert ? testklausur1.vorbereitung.proThema.map(function (p) {
      return { themaId: p.themaId, ampel: p.ampel, note: p.note, prozent: p.prozent };
    }) : [];
    // Nach Ampel-Schwere sortiert (rot vor gelb, dann schlechtere Note zuerst),
    // damit fokusThemen/kurzThemen die wirklich schwersten Themen zuerst greifen.
    var schwacheThemen = proThema1
      .filter(function (p) { return p.ampel !== 'gruen'; })
      .sort(function (a, b) {
        var rang = { rot: 0, gelb: 1 };
        if (rang[a.ampel] !== rang[b.ampel]) return rang[a.ampel] - rang[b.ampel];
        return b.note - a.note; // schlechtere Note zuerst
      })
      .map(function (p) { return p.themaId; });
    var fokusThemen = schwacheThemen.slice(0, LERNPLAN_FOKUS_LIMIT);
    var kurzThemen = schwacheThemen.slice(LERNPLAN_FOKUS_LIMIT);
    // Behandlungstiefe: 1 Thema → 'tief' (Tag 3 mehr Aufgaben, Tag 4 Transferaufgabe),
    // 2–3 → 'normal', 4+ → 'triagiert' (Fokus/Kurz-Aufteilung greift).
    var intensitaet = schwacheThemen.length === 0 ? null
      : schwacheThemen.length === 1 ? 'tief'
      : schwacheThemen.length <= LERNPLAN_FOKUS_LIMIT ? 'normal'
      : 'triagiert';
    // Kurzschluss: Testklausur 1 komplett stark → in 2–4/6 ist nichts zu tun.
    var kurzschluss = tk1Analysiert && schwacheThemen.length === 0;

    var tk2Analysiert = !!(testklausur2 && testklausur2.status === 'analysiert' && testklausur2.vorbereitung);
    var stubborn = [], aufgefrischt = [];
    if (tk2Analysiert) {
      testklausur2.vorbereitung.proThema.forEach(function (p) {
        if (p.ampel !== 'gruen') stubborn.push(p.themaId);
        else if (schwacheThemen.indexOf(p.themaId) !== -1) aufgefrischt.push(p.themaId);
      });
    }
    var tag6NichtsZuTun = kurzschluss || (tk2Analysiert && stubborn.length === 0 && aufgefrischt.length === 0);
    var ankerThema7 = schwacheThemen[0] || klausurThemen[0] || null;
    var fachId7 = (testklausur1 && testklausur1.fachId) || (klausur && klausur.fachId) || null;

    // Feste Aufgaben-Reihenfolge je Lerntag als stabile Schlüssel — Grundlage für
    // die abhakbare Checkliste (app.js rendert Label + Chat-Prompt zu jedem Key).
    // Muss mit lpTagAufgaben() in app.js übereinstimmen.
    function aufgabenKeys(n) {
      var K = [];
      if (n === 2) {
        fokusThemen.forEach(function (id) { K.push('fehler:' + id, 'beispiel:' + id, 'check:' + id); });
        if (kurzThemen.length) K.push('kurz');
      } else if (n === 3) {
        fokusThemen.forEach(function (id) { K.push('abfragen:' + id); });
        if (fokusThemen.length >= 2) K.push('gemischt');
        if (fokusThemen.length) K.push('loesungen');
        if (kurzThemen.length) K.push('kurzabfragen');
      } else if (n === 4) {
        fokusThemen.forEach(function (id) { K.push('feynman:' + id); });
        if (fokusThemen.length) K.push('wiederholung');
        if (intensitaet === 'tief') K.push('transfer');
      } else if (n === 6) {
        stubborn.forEach(function (id) { K.push('luecke:' + id); });
        aufgefrischt.forEach(function (id) { K.push('frisch:' + id); });
      } else if (n === 7) {
        if (ankerThema7 && fachId7) K.push('selbsttest');
      }
      return K;
    }
    // Abgehakte Aufgaben je Tag. lernplan.checklist ist maßgeblich; solange ein Tag
    // dort noch keinen Eintrag hat, gilt der Legacy-Weg (Tag stand in tageErledigt →
    // alles abgehakt), bis setLernplanCheck den Tag materialisiert.
    var rawChecks = lernplan.checklist || {};
    function checksFuer(n) {
      var raw = rawChecks[String(n)];
      if (raw) return raw;
      if (istErledigt(n)) {
        var all = {};
        aufgabenKeys(n).forEach(function (k) { all[k] = true; });
        return all;
      }
      return {};
    }
    function aufgabenErledigt(n) {
      var keys = aufgabenKeys(n);
      if (!keys.length) return false;
      var ch = checksFuer(n);
      return keys.every(function (k) { return ch[k] === true; });
    }

    var tag1 = { erledigt: tk1Analysiert, schwacheThemen: schwacheThemen, fokusThemen: fokusThemen,
                 kurzThemen: kurzThemen, intensitaet: intensitaet, proThema: proThema1 };
    function lerntag(tag) {
      return {
        erledigt: kurzschluss || aufgabenErledigt(tag),
        fokusThemen: fokusThemen.slice(),
        kurzThemen: (tag === 4) ? [] : kurzThemen.slice(), // Tag 4 zeigt keine eigene Kurz-Karte
        relevantThemen: fokusThemen.slice(), // Rückwärtskompat-Alias
        aufgaben: aufgabenKeys(tag),
        checks: checksFuer(tag)
      };
    }
    var tag2 = lerntag(2), tag3 = lerntag(3), tag4 = lerntag(4);

    var tag5 = {
      erledigt: tk2Analysiert || kurzschluss,
      noetig: tk1Analysiert && schwacheThemen.length > 0,
      verfuegbar: tk1Analysiert
    };

    var tag6 = {
      erledigt: tag6NichtsZuTun || aufgabenErledigt(6),
      stubborn: stubborn, aufgefrischt: aufgefrischt,
      aufgaben: aufgabenKeys(6), checks: checksFuer(6)
    };
    var tag7 = {
      erledigt: aufgabenErledigt(7),
      aufgaben: aufgabenKeys(7), checks: checksFuer(7)
    };

    var aktuellerTag;
    if (!tk1Analysiert) {
      aktuellerTag = 1;
    } else if (kurzschluss) {
      aktuellerTag = tag7.erledigt ? 'fertig' : 7;
    } else {
      var offeneLerntage = [2, 3, 4].filter(function (tag) { return !(kurzschluss || aufgabenErledigt(tag)); });
      if (!tk2Analysiert && offeneLerntage.length > 0) aktuellerTag = offeneLerntage[0];
      else if (!tk2Analysiert) aktuellerTag = 5;
      else if (!tag6.erledigt) aktuellerTag = 6;
      else if (!tag7.erledigt) aktuellerTag = 7;
      else aktuellerTag = 'fertig';
    }

    // Die anzuzeigende Note = Note der zuletzt abgeschlossenen Testklausur
    // (Testklausur 2, sobald analysiert, sonst Testklausur 1). Keine eigene
    // fortlaufende „Vorbereitungsnote" mehr — siehe Lesify.klausurNote().
    var letzteTestNr = tk2Analysiert ? 2 : (tk1Analysiert ? 1 : null);
    var letzteTestNote = tk2Analysiert ? testklausur2.ergebnis.note
      : (tk1Analysiert ? testklausur1.ergebnis.note : null);

    return {
      lernplan: lernplan, klausur: klausur, testklausur1: testklausur1, testklausur2: testklausur2,
      tag1: tag1, tag2: tag2, tag3: tag3, tag4: tag4, tag5: tag5, tag6: tag6, tag7: tag7,
      aktuellerTag: aktuellerTag, letzteTestNote: letzteTestNote, letzteTestNr: letzteTestNr,
      // Rückwärtskompat-Alias — früher „aktuelle Vorbereitungsnote":
      gesamtnoteAktuell: letzteTestNote
    };
  };

  /* ---- Abo / Tarif ---- */

  // Monats-Kontingente je Sitz — exakt gespiegelt aus
  // frontend/assets/js/stripe-config.js (`limits`). `null` = unbegrenzt.
  // Familien-Pakete geben jedem Kind das volle Kontingent seines Tarifs;
  // die Werte pro Sitz sind identisch zu den Einzelplätzen.
  var PLAN_LIMITS = {
    starter:  { nachrichten: 100,  dateien: 20,  lernzettel: 5,  testklausuren: 1  },
    premium:  { nachrichten: 250,  dateien: 50,  lernzettel: 15, testklausuren: 5  },
    infinite: { nachrichten: null, dateien: 100, lernzettel: 50, testklausuren: 15 }
  };
  var PLAN_NAMES = { starter: 'Starter', premium: 'Premium', infinite: 'Infinite' };
  // Interne Planungswerte (API-Kosten & LTV je Sitz/Monat in €) — nur für
  // spätere Auswertung, nicht in der Schüler-UI zeigen.
  var PLAN_ECONOMICS = {
    starter:  { apiKostenMonat: 1.57,  ltv: 110 },
    premium:  { apiKostenMonat: 4.13,  ltv: 130 },
    infinite: { apiKostenMonat: 11.28, ltv: 180 }
  };

  Lesify.PLAN_LIMITS = PLAN_LIMITS;
  Lesify.PLAN_NAMES = PLAN_NAMES;
  Lesify.PLAN_ECONOMICS = PLAN_ECONOMICS;
  Lesify.PLAN_PAKETE = ['starter', 'premium', 'infinite'];

  Lesify.plan = function () {
    var base = { paket: 'premium', intervall: 'monatlich', status: 'aktiv', familie: null };
    var seed = SEED.plan || base;
    var ov = store.planOverride || {};
    var paket = ov.paket || seed.paket || base.paket;
    if (!PLAN_LIMITS[paket]) paket = 'premium';
    return {
      paket: paket,
      name: PLAN_NAMES[paket],
      intervall: ov.intervall || seed.intervall || 'monatlich',
      status: ov.status || seed.status || 'aktiv',
      familie: ov.familie !== undefined ? ov.familie : (seed.familie || null),
      limits: PLAN_LIMITS[paket],
      economics: PLAN_ECONOMICS[paket]
    };
  };
  // Tarifwechsel (Dev-/Test-Schalter auf einstellungen.html). patch z. B.
  // { paket: 'infinite' } oder { familie: { sitze: 3 } }.
  Lesify.setPlan = function (patch) {
    var cur = store.planOverride || {};
    for (var k in patch) { cur[k] = patch[k]; }
    store.planOverride = cur;
    persist();
    return Lesify.plan();
  };

  /* ---- Usage / Limits ---- */

  // Verbrauch des laufenden Monats + Limit aus dem aktiven Tarif.
  // Jeder Eintrag: { used, limit, resetDatum }. limit === null ⇒ unbegrenzt.
  Lesify.usage = function () {
    var seed = SEED.usage;
    var limits = Lesify.plan().limits;
    var reset = seed.resetDatum;
    function row(art) {
      return {
        used: (seed[art] ? seed[art].used : 0) + (store.usageDelta[art] || 0),
        limit: limits[art],
        resetDatum: reset
      };
    }
    return {
      nachrichten: row('nachrichten'),
      dateien: row('dateien'),
      lernzettel: row('lernzettel'),
      testklausuren: row('testklausuren'),
      resetDatum: reset,
      paket: Lesify.plan().paket,
      planName: Lesify.plan().name
    };
  };
  Lesify.incrementUsage = function (art, n) {
    store.usageDelta[art] = (store.usageDelta[art] || 0) + (n || 1);
    persist();
    return Lesify.usage();
  };

  /* ---- Profil & Einstellungen ---- */

  function initials(name) {
    return String(name || '').split(/\s+/).map(function (p) { return p.charAt(0); }).join('').slice(0, 2).toUpperCase();
  }

  Lesify.getUser = function () {
    // Kontext-Wechsel: solange ein Elternteil „als Kind" unterwegs ist, gibt
    // getUser das Kind-Profil zurück (Sidebar/Profil-Chip zeigen das Kind, die
    // Schüler-Nav greift). Der Eltern-Bereich bleibt über das Banner erreichbar.
    var em = store.elternModus;
    if (em) {
      return { name: em.kindName, klasse: em.kindKlasse || '', rolle: 'schueler', initials: initials(em.kindName) };
    }
    var u = store.userOverride || SEED.user;
    var rolle = store.rolleOverride || u.rolle || SEED.user.rolle || 'schueler';
    if (rolle === 'elternteil') {
      var fam = Lesify.familie();
      return { name: fam.elternName, klasse: 'Elternkonto', rolle: 'elternteil', initials: initials(fam.elternName) };
    }
    return { name: u.name, klasse: u.klasse, rolle: 'schueler', initials: initials(u.name) };
  };
  Lesify.updateUser = function (data) {
    var prev = store.userOverride || SEED.user;
    store.userOverride = { name: data.name, klasse: data.klasse, rolle: prev.rolle || SEED.user.rolle || 'schueler' };
    persist();
    return Lesify.getUser();
  };

  /* ---- Eltern-Zugang / Familien-Abo (Phase 12) ----
     Prototyp-Spiegel von `api/src/routes/abo.ts` (`/abo/kinder*`). Alle
     Kennzahlen kommen aus `SEED.familie` + `store` — kein Backend-Call. */

  // Rolle des Accounts. `elternteil` schaltet den Eltern-Bereich frei; nur ein
  // Elternteil MIT Familien-Abo (plan().familie) landet dort — ein Solo-
  // Elternkonto (rolle=elternteil, familie=null) bleibt wie ein Schüler-Account.
  Lesify.getRolle = function () {
    if (store.elternModus) return 'schueler';
    var u = store.userOverride || SEED.user;
    return store.rolleOverride || u.rolle || SEED.user.rolle || 'schueler';
  };
  Lesify.istElternteil = function () {
    return Lesify.getRolle() === 'elternteil' && !!Lesify.plan().familie;
  };
  // Dev-Schalter (einstellungen.html): Ansicht Schüler ⇄ Elternteil. Beim
  // Wechsel auf `elternteil` wird sichergestellt, dass ein Familien-Abo mit
  // genügend Sitzen für die Seed-Kinder besteht.
  Lesify.setRolle = function (rolle) {
    store.rolleOverride = rolle === 'elternteil' ? 'elternteil' : 'schueler';
    store.elternModus = null; // Rollenwechsel beendet einen laufenden Kontext-Wechsel
    if (store.rolleOverride === 'elternteil') {
      var ov = store.planOverride || {};
      var mind = Math.max(2, Lesify.kinder().length);
      if (!ov.familie) ov.familie = { sitze: Math.min(4, Math.max(3, mind)) };
      store.planOverride = ov;
    }
    persist();
    return Lesify.getRolle();
  };

  function kinderListe() {
    if (store.kinder) return store.kinder;
    return JSON.parse(JSON.stringify((SEED.familie && SEED.familie.kinder) || []));
  }
  function saveKinder(list) { store.kinder = list; persist(); }

  Lesify.familie = function () {
    var f = SEED.familie || {};
    return {
      elternName: f.elternName || 'Elternkonto',
      elternEmail: f.elternEmail || null,
      einwilligungAm: f.einwilligungAm || null,
      kinder: kinderListe()
    };
  };

  // Kind-Liste mit abgeleiteten Feldern (Aktivitäts-Ampel aus den
  // Wochen-Kennzahlen — bewusst KEINE Note, die gibt es im Produkt nicht).
  function kindAktivitaetAmpel(w) {
    if (!w) return 'rot';
    var n = w.nachrichtenDieWoche || 0;
    if (n >= 30) return 'gruen';
    if (n >= 8) return 'gelb';
    return 'rot';
  }
  var AKTIVITAET_LABEL = { gruen: 'Diese Woche aktiv', gelb: 'Wenig aktiv', rot: 'Kaum aktiv' };
  Lesify.kindAktivitaetAmpel = kindAktivitaetAmpel;
  Lesify.kindAktivitaetLabel = function (ampel) { return AKTIVITAET_LABEL[ampel] || ampel; };

  Lesify.kinder = function () {
    return kinderListe().map(function (k) {
      return {
        id: k.id, name: k.name, klasse: k.klasse, farbe: k.farbe || 'graphit',
        email: k.email || null, eingeladen: !!k.eingeladen, aktiv: !!k.aktiv,
        letzteAktivitaet: k.letzteAktivitaet || null,
        erinnerungVorKlausuren: k.erinnerungVorKlausuren !== false,
        woechentlicheZusammenfassung: !!k.woechentlicheZusammenfassung,
        woche: k.woche || {},
        aktivitaetAmpel: kindAktivitaetAmpel(k.woche)
      };
    });
  };
  Lesify.getKind = function (id) {
    return Lesify.kinder().filter(function (k) { return k.id === id; })[0] || null;
  };

  // Spiegelt `GET /abo/kinder/:id/zusammenfassung` — aggregierte Wochenkennzahlen,
  // KEIN Chat-Wortlaut, KEINE Lernzettel-Inhalte, KEINE Noten.
  Lesify.kindZusammenfassung = function (id) {
    var k = Lesify.getKind(id);
    if (!k) return null;
    var w = k.woche || {};
    return {
      kindId: k.id, name: k.name, klasse: k.klasse,
      faecher: w.faecher || 0,
      themen: w.themen || 0,
      chatsDieWoche: w.chatsDieWoche || 0,
      nachrichtenDieWoche: w.nachrichtenDieWoche || 0,
      lernzettelGesamt: w.lernzettelGesamt || 0,
      testklausurenDieWoche: w.testklausurenDieWoche || 0,
      anstehendeKlausuren: w.anstehendeKlausuren || 0,
      aktivitaetAmpel: k.aktivitaetAmpel,
      letzteAktivitaet: k.letzteAktivitaet
    };
  };

  // Kind anlegen — gedeckelt auf plan().familie.sitze (wie `POST /abo/kinder`).
  Lesify.addKind = function (d) {
    var fam = Lesify.plan().familie;
    if (!fam) throw new Error('kein_familienabo');
    var list = kinderListe();
    if (list.length >= fam.sitze) throw new Error('sitze_ausgeschoepft');
    var kind = {
      id: uid('kind'),
      name: String(d.name || '').trim(),
      klasse: String(d.klasse || '').trim(),
      farbe: d.farbe || 'graphit',
      email: null, eingeladen: false, aktiv: false,
      letzteAktivitaet: null,
      erinnerungVorKlausuren: true, woechentlicheZusammenfassung: true,
      woche: { faecher: 0, themen: 0, chatsDieWoche: 0, nachrichtenDieWoche: 0, lernzettelGesamt: 0, testklausurenDieWoche: 0, anstehendeKlausuren: 0 }
    };
    list = list.concat([kind]);
    saveKinder(list);
    return Lesify.getKind(kind.id);
  };
  // Kind entfernen — im echten Backend Cascade-Löschung aller Inhalte des Sitzes.
  Lesify.removeKind = function (id) {
    saveKinder(kinderListe().filter(function (k) { return k.id !== id; }));
    if (store.elternModus && store.elternModus.kindId === id) store.elternModus = null;
    persist();
    return { ok: true };
  };
  // Einladung: E-Mail am Kind-Profil setzen; im Backend gibt es dazu einen
  // Passwort-Token aus, mit dem sich das Kind selbst aktiviert.
  Lesify.kindEinladung = function (id, email) {
    var list = kinderListe();
    var found = null;
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { found = list[i]; break; } }
    if (!found) throw new Error('nicht_gefunden');
    found.email = String(email || '').trim().toLowerCase();
    found.eingeladen = true;
    saveKinder(list);
    return { ok: true, resetLink: 'passwort-zuruecksetzen.html?token=' + uid('demo') };
  };
  Lesify.updateKind = function (id, patch) {
    var list = kinderListe();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) { for (var k in patch) { list[i][k] = patch[k]; } break; }
    }
    saveKinder(list);
    return Lesify.getKind(id);
  };

  /* ---- Kontext-Wechsel „Als Kind ansehen" ---- */
  Lesify.elternModus = function () { return store.elternModus || null; };
  Lesify.wechsleZuKind = function (id) {
    var k = Lesify.getKind(id);
    if (!k) throw new Error('nicht_gefunden');
    store.elternModus = { kindId: k.id, kindName: k.name, kindKlasse: k.klasse };
    persist();
    return store.elternModus;
  };
  Lesify.zurueckZumElternkonto = function () {
    store.elternModus = null;
    persist();
    return { ok: true };
  };

  /* ---- Abo-/Sitzverwaltung (aus einstellungen.html herausgelöst) ---- */
  Lesify.setAboStatus = function (status) {
    return Lesify.setPlan({ status: status });
  };
  // Sitze anpassen: Erhöhung sofort; Verringerung nur bis zur aktuellen
  // Kinderzahl (im Backend `geplanteSitze` + Job zum Periodenende).
  Lesify.setFamilieSitze = function (n) {
    var fam = Lesify.plan().familie || { sitze: 2 };
    var belegt = Lesify.kinder().length;
    var ziel = Math.max(2, Math.min(4, n | 0));
    if (ziel < belegt) throw new Error('sitze_belegt');
    return Lesify.setPlan({ familie: { sitze: ziel } });
  };

  Lesify.getSettings = function () {
    return store.settingsOverride || JSON.parse(JSON.stringify(SEED.settings));
  };
  Lesify.updateSettings = function (patch) {
    var current = Lesify.getSettings();
    for (var key in patch) { current[key] = patch[key]; }
    store.settingsOverride = current;
    persist();
    return current;
  };

  /* ---- Downloads (echte Blob-Downloads, keine Backend-Datei) ---- */

  Lesify.downloadText = function (dateiname, inhalt) {
    var blob = new Blob([inhalt], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = dateiname;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  };

  Lesify.testklausurDokument = function (t) {
    var lines = ['Testklausur — ' + t.titel, 'Erstellt: ' + t.erstelltAm, ''];
    t.aufgaben.forEach(function (a, i) {
      var label = Lesify.label(a.themaId);
      lines.push('Aufgabe ' + (i + 1) + ' (' + label.thema + ')');
      lines.push(a.frage);
      lines.push('');
    });
    lines.push('Viel Erfolg! Löse alle Aufgaben zusammenhängend und lade deine Lösung anschließend als Dokument hoch.');
    return lines.join('\n');
  };

  Lesify.lernzettelDokument = function (lp) {
    if (!lp || !lp.lernzettel) return '# Lernzettel\n\nNoch kein Inhalt — der Lernzettel entsteht automatisch ab Tag 3 deines Lernplans.';
    return lp.lernzettel.content;
  };

  Lesify.slugify = slugify;
  Lesify.uid = uid;

  global.Lesify = Lesify;
})(window);
