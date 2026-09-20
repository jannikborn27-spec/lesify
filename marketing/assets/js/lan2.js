/* =========================================================
   Lesify — Landingpage-Variante /lan2/
   Die Demo-Sections (Klausur, KI-Chat, Organisation, Lernzettel)
   zeigen statt interaktiver Mocks die Mockup-Bilder der Hero-
   Slideshow (assets/img/lan2/mockup-*.webp, zugeschnitten aus
   hero-nw-fin/). Pro Section 5 Layouts, umschaltbar über das
   Dev-Panel unten rechts (localStorage['lesify:lan2:{key}:v']).
   ========================================================= */
(function () {
  'use strict';

  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>';

  var LAYOUTS = [['1', 'Stage'], ['2', 'Bleed'], ['3', 'Panel'], ['4', 'Callouts'], ['5', 'Sticky']];

  var SECTIONS = [
    { key: 'kv', label: 'Klausur', eb: 'Klausurvorbereitung', accent: 'var(--fach-blue)',
      h: 'Mit strukturierter Klausurvorbereitung zu besseren Noten.',
      lead: 'Zwei Testklausuren, sieben Lerntage und ein mitwachsender Lernzettel greifen ineinander: So werden Schwachstellen gezielt ausgemerzt und dein Kind gewinnt Schritt für Schritt Sicherheit für den Klausurtag.',
      img: 'mockup-klausur', alt: 'Lesify auf dem Tablet: Lernplan zur Mathe-Klausur, Tag 4 „Schwachstellen festigen“ mit Checkliste',
      points: [
        { t: 'Testklausur 1', d: 'Zeigt sofort, wo noch Lücken sind — mit Note und Ampel je Thema.' },
        { t: 'Sieben Lerntage', d: 'Aus dem Ergebnis entsteht ein fester Tagesplan mit Checkliste.' },
        { t: 'Ein Lernzettel, der wächst', d: 'Jede geübte Schwachstelle landet automatisch auf dem Zettel.' },
        { t: 'Testklausur 2', d: 'Prüft den Fortschritt, bevor es am Klausurtag ernst wird.' }
      ] },
    { key: 'chat', label: 'Chat', eb: 'KI-Chat', accent: 'var(--fach-teal)',
      h: 'Für Schüler entwickelt: eine KI, die erklärt statt vorsagt.',
      lead: 'Erklären, üben, mündlich abfragen, Hausaufgaben besprechen: vier Modi, passend zu Fach und Thema. Die KI kennt Klassenstufe und Stoff und fragt nach, statt nur Ergebnisse auszugeben.',
      img: 'mockup-chat', alt: 'Lesify KI-Chat auf dem Tablet: Biologie „Ökosystem Wald“ mit Auswertung der Übungsaufgaben und Zusammenfassung',
      points: [
        { t: 'Thema erklären', d: 'Verständlich, Schritt für Schritt, auf Klassenstufe angepasst.' },
        { t: 'Üben & abfragen', d: 'Aufgaben mit Punkten und Feedback — wie eine echte Klausur.' },
        { t: 'Hausaufgaben-Hilfe', d: 'Der Lösungsweg wird erklärt und hinterfragt, nicht abgenommen.' },
        { t: 'Immer verfügbar', d: 'Rund um die Uhr, auch abends vor der Klausur.' }
      ] },
    { key: 'org', label: 'Orga', eb: 'Organisation', accent: 'var(--fach-rose)',
      h: 'Ob Chats, Lernzettel, Dokumente — alles nach Fach und Thema geordnet.',
      lead: 'Schluss mit unordentlichen Ordnern, Collegeblöcken und Zettelwirtschaft: Jeder Chat, jedes Dokument und jeder Lernzettel wird einem Fach und Thema zugeordnet — alles leicht auffindbar, alles am richtigen Platz.',
      img: 'mockup-organisation', alt: 'Lesify Themenseite „Gedichtanalyse“ im Fach Deutsch mit Chats, Lernzetteln, Dateien und Klausuren',
      points: [
        { t: 'Fach → Thema', d: 'Jedes Fach ist in Themen sortiert, mit eigener Farbe.' },
        { t: 'Alles an einem Ort', d: 'Chats, Lernzettel und Dateien liegen beim passenden Thema.' },
        { t: 'Klausuren im Blick', d: 'Termine und Ergebnisse gehören direkt zum Fach.' },
        { t: 'Sofort wiedergefunden', d: 'Vom Verlauf bis zur Suche: nichts geht mehr verloren.' }
      ] },
    { key: 'lz', label: 'Zettel', eb: 'Lernzettel', accent: 'var(--fach-amber)',
      h: 'Ein Lernzettel, der die wichtigsten Infos automatisch notiert.',
      lead: 'Vor jeder Klausur fasst ein Lernzettel alle wichtigen Themen kompakt auf einem Blatt zusammen — und lässt sich im Chat gemeinsam mit der KI überarbeiten, bis er perfekt passt.',
      img: 'mockup-lernzettel', alt: 'Lesify Lernzettel „If-Sätze Type 1 und Type 2“ neben dem Chat zum gemeinsamen Überarbeiten',
      points: [
        { t: 'Entsteht von selbst', d: 'Aus Chats und Übungen wird ein sauberer Zettel pro Thema.' },
        { t: 'Gemeinsam überarbeiten', d: 'Im Chat sagen, was fehlt — die KI passt den Zettel an.' },
        { t: 'Übersichten & Checklisten', d: 'Tabellen, Beispiele und eine Checkliste für den Klausurtag.' },
        { t: 'Als PDF mitnehmen', d: 'Ausdrucken oder am Handy lernen, wann immer es passt.' }
      ] }
  ];

  function pad(i) { return (i + 1 < 10 ? '0' : '') + (i + 1); }

  function media(s, cls) {
    return '<figure class="l2-media ' + (cls || '') + '"><img src="/assets/img/lan2/' + s.img + '.webp" alt="' + s.alt +
      '" width="1416" height="1117" loading="lazy" decoding="async"></figure>';
  }
  function head(s, center) {
    return '<div class="l2-head' + (center ? ' is-center' : '') + '"><span class="l2-eb">' + s.eb + '</span>' +
      '<h2 class="l2-h">' + s.h + '</h2><p class="l2-lead">' + s.lead + '</p></div>';
  }
  function cta() {
    return '<a class="l2-cta" href="/preise/">Kostenlos starten ' + ARROW + '</a>';
  }

  /* 1 · Stage — zentrierter Kopf, riesiges Mockup, 4 Punkte als Spalten */
  function v1(s) {
    return '<div class="container l2-1">' + head(s, true) + media(s, 'l2-1__media') +
      '<ol class="l2-cols">' + s.points.map(function (p, i) {
        return '<li><span class="l2-num">' + pad(i) + '</span><b>' + p.t + '</b><span>' + p.d + '</span></li>';
      }).join('') + '</ol></div>';
  }

  /* 2 · Bleed — Text links, Mockup läuft über den Seitenrand hinaus */
  function v2(s) {
    return '<div class="container l2-2"><div class="l2-2__text">' + head(s) +
      '<ul class="l2-checks">' + s.points.map(function (p) {
        return '<li><span class="l2-check">' + CHECK + '</span><span><b>' + p.t + '</b> — ' + p.d + '</span></li>';
      }).join('') + '</ul>' + cta() + '</div>' + media(s, 'l2-2__media') + '</div>';
  }

  /* 3 · Panel — getönte Karte, Mockup ragt unten angeschnitten hinein */
  function v3(s) {
    return '<div class="container"><div class="l2-3"><div class="l2-3__top">' + head(s) +
      '<ul class="l2-3__pts">' + s.points.map(function (p) {
        return '<li><span class="l2-check">' + CHECK + '</span><b>' + p.t + '</b><span>' + p.d + '</span></li>';
      }).join('') + '</ul></div>' + media(s, 'l2-3__media') + '</div></div>';
  }

  /* 4 · Callouts — dunkel, Mockup mittig, Punkte links/rechts daneben */
  function v4(s) {
    var c = function (p, i) {
      return '<li class="l2-call" style="order:' + i + '"><span class="l2-num">' + pad(i) + '</span><b>' + p.t + '</b><span>' + p.d + '</span></li>';
    };
    var P = s.points;
    return '<div class="container l2-4">' + head(s, true) + '<div class="l2-4__grid">' +
      '<ul class="l2-4__side is-l">' + c(P[0], 0) + c(P[2], 2) + '</ul>' +
      media(s, 'l2-4__media') +
      '<ul class="l2-4__side is-r">' + c(P[1], 1) + c(P[3], 3) + '</ul></div></div>';
  }

  /* 5 · Sticky — Mockup klebt beim Scrollen, rechts nummerierte Schritte */
  function v5(s) {
    return '<div class="container l2-5"><div class="l2-5__stick">' + media(s, 'l2-5__media') + '</div>' +
      '<div class="l2-5__text">' + head(s) + '<ol class="l2-steps">' + s.points.map(function (p, i) {
        return '<li><span class="l2-num">' + pad(i) + '</span><div><b>' + p.t + '</b><span>' + p.d + '</span></div></li>';
      }).join('') + '</ol>' + cta() + '</div></div>';
  }

  var RENDER = { '1': v1, '2': v2, '3': v3, '4': v4, '5': v5 };

  function stored(key) {
    try { var v = localStorage.getItem('lesify:lan2:' + key + ':v'); if (RENDER[v]) return v; } catch (e) {}
    return null;
  }
  function store(key, v) { try { localStorage.setItem('lesify:lan2:' + key + ':v', v); } catch (e) {} }

  var io = null;
  function reveal(el) {
    var items = el.querySelectorAll('.l2-head, .l2-media, .l2-cols li, .l2-checks li, .l2-3__pts li, .l2-call, .l2-steps li, .l2-cta');
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      items.forEach(function (n) { n.classList.add('is-in'); });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    }
    items.forEach(function (n) { n.classList.add('l2-rv'); io.observe(n); });
  }

  function build(s, i, v) {
    var el = document.getElementById(s.key);
    if (!el) return;
    el.setAttribute('data-v', v);
    el.classList.toggle('is-flip', i % 2 === 1);
    el.style.setProperty('--l2-a', s.accent);
    el.innerHTML = RENDER[v](s);
    reveal(el);
  }

  var state = {};
  function buildAll() {
    SECTIONS.forEach(function (s, i) {
      state[s.key] = stored(s.key) || '1';
      build(s, i, state[s.key]);
    });
  }

  /* ---------- Dev-Switcher ---------- */
  function row(label, key, active) {
    return '<div class="layout-dev-row"><span>' + label + '</span><div class="layout-dev-seg">' +
      LAYOUTS.map(function (o) {
        return '<button type="button" data-l2k="' + key + '" data-l2v="' + o[0] + '" title="' + o[0] + ' · ' + o[1] + '"' +
          (o[0] === active ? ' class="is-on"' : '') + '>' + o[0] + '</button>';
      }).join('') + '</div></div>';
  }
  function mountDev() {
    var panel = document.createElement('div');
    panel.className = 'layout-dev is-lab l2-dev';
    try { if (localStorage.getItem('lesify:lan2:min') === '1') panel.classList.add('is-min'); } catch (e) {}
    var html = '<button type="button" class="layout-dev-title" data-l2min>Lan2 · Layouts</button>' + row('Alle', 'all', '');
    SECTIONS.forEach(function (s) { html += row(s.label, s.key, state[s.key]); });
    html += '<div class="l2-dev-names">' + LAYOUTS.map(function (o) { return o[0] + ' ' + o[1]; }).join(' · ') + '</div>';
    panel.innerHTML = html;
    panel.addEventListener('click', function (e) {
      if (e.target.closest('[data-l2min]')) {
        panel.classList.toggle('is-min');
        try { localStorage.setItem('lesify:lan2:min', panel.classList.contains('is-min') ? '1' : '0'); } catch (err) {}
        return;
      }
      var b = e.target.closest('[data-l2k]');
      if (!b) return;
      var key = b.getAttribute('data-l2k'), v = b.getAttribute('data-l2v');
      var keys = key === 'all' ? SECTIONS.map(function (s) { return s.key; }) : [key];
      keys.forEach(function (k) {
        var idx = SECTIONS.findIndex(function (s) { return s.key === k; });
        state[k] = v; store(k, v);
        build(SECTIONS[idx], idx, v);
        panel.querySelectorAll('[data-l2k="' + k + '"]').forEach(function (x) { x.classList.toggle('is-on', x.getAttribute('data-l2v') === v); });
      });
      if (key === 'all') panel.querySelectorAll('[data-l2k="all"]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
    });
    document.body.appendChild(panel);
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildAll();
    mountDev();
  });
})();
