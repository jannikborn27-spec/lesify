/* =========================================================
   Lesify — Landingpage-Variante /lan2/
   Demo-Sections mit den Mockup-Bildern der Hero-Slideshow
   (assets/img/lan2/mockup-*.webp). Reihenfolge + Layout fest im
   Schwarz/Weiß-Wechsel:
     Klausur (hell, Bleed) · Chat (dunkel, Callouts) ·
     Lernzettel (hell, Bleed) · Organisation (dunkel, Callouts) ·
     Fächer (hell, Original-Design der Startseite).
   Klausur + Organisation sind Slideshows (Punkte-Navigation + Auto-Lauf
   wie zuvor: 7 Lerntage / 3 Seiten). Bilder je Folie: SECTIONS[].imgs —
   aktuell überall dasselbe Bild, später einfach austauschen.
   Der Inhalt ist 1:1 der der Startseite (window.LesifyMkt aus marketing.js);
   das Dev-Panel schaltet je Section zwischen 5 Darstellungen dieses Inhalts
   (localStorage['lesify:lan2:{key}:c']).
   ========================================================= */
(function () {
  'use strict';

  var M = window.LesifyMkt;
  if (!M) return;

  var ARROW =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>';
  function pad(i) {
    return (i + 1 < 10 ? '0' : '') + (i + 1);
  }

  /* ---------- Inhalte (aus marketing.js) ---------- */
  var KVL = M.KVL,
    ORG = M.ORG,
    CHAT = M.CHAT;

  var SECTIONS = [
    { key: 'hero', label: 'Hero', tone: 'light', hero: true, single: true, accent: 'var(--fach-blue)' },
    {
      key: 'kv',
      label: 'Klausur',
      single: true,
      dotsIn: 'text',
      tone: 'light',
      accent: 'var(--fach-blue)',
      eb: KVL.eb,
      h: KVL.h,
      lead: KVL.lead,
      /* Slideshow: 7 Lerntage (wie die Punkte unter der früheren Demo) */
      slides: KVL.days.length,
      slideLabels: KVL.days.map(function (d, i) {
        return 'Tag ' + (i + 1) + ': ' + d.t;
      }),
      slideMs: 3800,
      imgs: ['mockup-klausur'],
      alt: 'Lesify auf dem Tablet: Lernplan zur Mathe-Klausur, Tag 4 „Schwachstellen festigen“ mit Checkliste'
    },
    {
      key: 'chat',
      label: 'Chat',
      single: true,
      tone: 'dark',
      accent: 'var(--fach-teal)',
      eb: CHAT.eb,
      h: CHAT.h,
      lead: CHAT.lead,
      imgs: ['mockup-chat'],
      alt: 'Lesify KI-Chat auf dem Tablet: Biologie „Ökosystem Wald“ mit Auswertung der Übungsaufgaben und Zusammenfassung'
    },
    {
      key: 'lz',
      label: 'Zettel',
      single: true,
      tone: 'light',
      flip: true,
      accent: 'var(--fach-amber)',
      eb: 'Lernzettel',
      h: 'Der ganze Klausurstoff, automatisch kompakt zusammengefasst.',
      lead: 'Aus der gesamten Klausurvorbereitung entsteht ein einziger Lernzettel, der Formeln, Definitionen und alles Wichtige übersichtlich und kompakt vereint.',
      imgs: ['mockup-lernzettel'],
      alt: 'Lesify Lernzettel „If-Sätze Type 1 und Type 2“ neben dem Chat zum gemeinsamen Überarbeiten'
    },
    {
      key: 'org',
      label: 'Orga',
      single: true,
      dotsIn: 'none',
      tone: 'dark',
      accent: 'var(--fach-rose)',
      eb: ORG.eb,
      h: ORG.h,
      lead: ORG.lead,
      /* Slideshow: 3 Seiten (Fach · Thema · Dateien) */
      slides: ORG.steps.length,
      slideLabels: ORG.steps.map(function (st) {
        return st.l;
      }),
      slideMs: 5200,
      imgs: ['mockup-organisation'],
      alt: 'Lesify Themenseite „Gedichtanalyse“ im Fach Deutsch mit Chats, Lernzetteln, Dateien und Klausuren'
    },
    /* Fächer: eigene Section im Original-Design der Startseite (Ghost), kein Dev-Umschalter */
    { key: 'faecher', tone: 'light', fixed: true, accent: 'var(--fach-rose)' }
  ];

  var NAMES = {}; /* Dev-Switcher-Beschriftungen — aktuell keine offenen Varianten */

  /* ---------- Bausteine ---------- */
  /* Mockup als Slideshow-Stapel; Punkte nur, wenn s.slides > 1 (Klausur, Orga).
     `after` liegt im Stapel (z. B. Overlay-Karte). */
  function slideDots(s) {
    var d = '<div class="l2-dots" role="tablist" aria-label="Folie wählen">';
    for (var i = 0; i < s.slides; i++) {
      d +=
        '<button type="button" role="tab" class="l2-dots__d' + (i === 0 ? ' is-active' : '') + '" data-l2dot="' + i + '" aria-label="' + s.slideLabels[i] + '">' + (i + 1) + '</button>';
    }
    return d + '</div>';
  }
  function media(s, cls, after) {
    var n = s.slides || 1,
      pics = '';
    for (var i = 0; i < n; i++) {
      pics +=
        '<img class="l2-slide' + (i === 0 ? ' is-on' : '') + '" src="/assets/img/lan2/' + s.imgs[i % s.imgs.length] + '.webp" alt="' + (i === 0 ? s.alt : '') + '"' +
        (i === 0 ? '' : ' aria-hidden="true"') + ' width="1416" height="1117" loading="lazy" decoding="async">';
    }
    /* Punkte: unter dem Bild (Standard), im Textblock (dotsIn 'text') oder gar nicht (dotsIn 'none') */
    var dots = n > 1 && !s.dotsIn ? slideDots(s) : '';
    return '<figure class="l2-media ' + cls + '"' + (n > 1 ? ' data-l2show' : '') + '><div class="l2-slides">' + pics + (after || '') + '</div>' + dots + '</figure>';
  }
  function head(s, center) {
    return (
      '<div class="l2-head' +
      (center ? ' is-center' : '') +
      '"><span class="l2-eb">' +
      s.eb +
      '</span>' +
      '<h2 class="l2-h">' +
      s.h +
      '</h2><p class="l2-lead">' +
      s.lead +
      '</p></div>'
    );
  }
  function cta(label) {
    return '<a class="l2-cta" href="/preise/">' + label + ' ' + ARROW + '</a>';
  }
  function ico(svg) {
    return '<span class="l2-ico">' + svg + '</span>';
  }
  function li(cls, inner, extra) {
    return '<li class="' + cls + '"' + (extra || '') + '>' + inner + '</li>';
  }
  function colH(t) {
    return '<span class="l2-colh">' + t + '</span>';
  }

  /* Interaktive Tabs: Buttons [data-l2t] + Panels [data-l2p] */

  /* Helle Sections: Text links + Mockup rechts (Bleed), optional Zusatzblock in voller Breite */
  function bleed(s, text, extra, after) {
    return (
      '<div class="l2-inner"><div class="container l2-2"><div class="l2-2__text">' +
      head(s) +
      text +
      '</div>' +
      media(s, 'l2-2__media', after) +
      '</div>' +
      (extra ? '<div class="container l2-extra">' + extra + '</div>' : '') +
      '</div>'
    );
  }
  /* Dunkle Sections: Kopf mittig, Mockup, Inhalt drumherum (je Variante) */

  /* ---------- Klausur (kv, hell) — final: Karten; Kennzahlen-Pills + CTA entfallen, die 7 Lerntage-Punkte stehen im Textblock ---------- */
  var KV = [
    function (s) {
      return bleed(
        s,
        slideDots(s),
        '<ul class="l2-cards c4">' +
          KVL.points
            .map(function (p) {
              return li('', ico(M.KVL_ICON[p.ic]) + '<b>' + p.t + '</b><span>' + p.s + '</span>');
            })
            .join('') +
          '</ul>'
      );
    }
  ];

  /* ---------- KI-Chat (chat, dunkel) — final: Links/Rechts ---------- */
  var CHAT_V = [
    /* Links/Rechts — Text + Perks links, Mockup rechts (wie die hellen Sections), die vier Modi als Karten darunter */
    function (s) {
      return bleed(
        s,
        '<ul class="l2-prow">' +
          CHAT.perks
            .map(function (p) {
              return li('', ico(p.icon) + '<div><b>' + p.title + '</b><span>' + p.text + '</span></div>');
            })
            .join('') +
          '</ul>',
        colH('Die vier Chat-Modi') +
          '<ul class="l2-cards c4">' +
          CHAT.modes
            .map(function (m) {
              return li('', ico(m.i) + '<b>' + m.l + '</b><span>' + m.d + '</span>');
            })
            .join('') +
          '</ul>'
      );
    }
  ];

  /* ---------- Lernzettel (lz, hell) — final: Liste mit 3 Punkten (Icons für Materialien · automatisch · anpassbar) ---------- */
  var LZ_ICO = {
    material:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"></path><path d="M14 3v5h5"></path><path d="M12 17v-6"></path><path d="m9.5 13.5 2.5-2.5 2.5 2.5"></path></svg>',
    auto:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Z"></path><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"></path></svg>',
    edit:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5C4 4.67 4.67 4 5.5 4h13c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5H10l-4 3.5V16h-.5C4.67 16 4 15.33 4 14.5v-9Z"></path><path d="M9 10.5h6"></path><path d="M9 7.5h3"></path></svg>'
  };
  var LZ_POINTS = [
    { ic: 'material', t: 'Aus den eigenen Materialien', s: 'Der komplette Klausurstoff wird eigenständig strukturiert und kompakt zusammengefasst' },
    { ic: 'auto', t: 'Automatisch erstellt', s: 'Der komplette Klausurstoff wird eigenständig strukturiert und kompakt zusammengefasst' },
    { ic: 'edit', t: 'Jederzeit anpassbar', s: 'Über den Chat kann Ihr Kind den Lernzettel jederzeit an die eigenen Bedürfnisse anpassen' }
  ];
  var LZ_V = [
    function (s) {
      return bleed(
        s,
        '<ul class="l2-prow">' +
          LZ_POINTS.map(function (p) {
            return li('', ico(LZ_ICO[p.ic]) + '<div><b>' + p.t + '</b><span>' + p.s + '</span></div>');
          }).join('') +
          '</ul>'
      );
    }
  ];

  /* ---------- Organisation (org, dunkel) — wie Klausur: Text links, Mockup rechts, die drei Karten darunter; Navigation NUR über die Karten ---------- */
  var ORG_V = [
    function (s) {
      return bleed(
        s,
        '',
        '<ul class="l2-cards c3 is-tall">' +
          ORG.points
            .map(function (p, i) {
              return li('', ico(M.ORG_IC[p.ic]) + '<b>' + p.t + '</b><span>' + p.s + '</span>', ' data-l2pt="' + i + '"');
            })
            .join('') +
          '</ul>'
      );
    }
  ];

  /* ---------- Hero (fünf zentrierte Layouts, ohne Dauer-Hintergrundbild, nicht mehr rechts fixiert) ---------- */
  var HERO = M.HERO;
  var HERO_IMGS = ['mockup-klausur', 'mockup-chat', 'mockup-organisation', 'mockup-lernzettel'];
  var CHK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  var CHEV_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"></polyline></svg>';
  var CHEV_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"></polyline></svg>';
  /* Linke Seite 1:1 wie die Startseite: gleiche Klassen/Struktur (.hv9__text …), damit das Original-CSS greift.
     .lab-trust ist dort per CSS ausgeblendet; sichtbar ist nur die Avatar-Zeile (.hv9__trust). */
  function hText() {
    var inits = ['SB', 'MT', 'LK', 'JW', 'FK'],
      tones = ['var(--fach-blue)', 'var(--fach-amber)', 'var(--fach-teal)', 'var(--fach-violet)', 'var(--fach-rose)'];
    return (
      '<div class="hv9__text"><span class="eyebrow">Für Schüler:innen ab Klassenstufe 5 geeignet</span>' +
      '<h1>Weniger Prüfungsstress und <em>bessere Noten</em> ohne teure Nachhilfe.</h1>' +
      '<p class="lab-lead">Kein Chauffieren, kein Stundensatz, kein Streit ums Lernen. Dein Kind arbeitet selbstständig zu Hause mit festem Lernplan und einer KI, die 24/7 für Fragen bereitsteht.</p>' +
      '<div class="lab-cta"><a class="btn btn-primary btn-lg" href="/preise/">Kostenlos starten</a><a class="btn btn-secondary btn-lg" href="/login/">Anmelden</a></div>' +
      '<ul class="lab-trust"><li>' + CHK + ' Keine Kreditkarte nötig</li><li>' + CHK + ' DSGVO-konform, Server in der EU</li><li>' + CHK + ' Monatlich kündbar</li></ul>' +
      '<div class="hv9__trust"><span class="hv9__trust-row">' +
      inits.map(function (x, i) { return '<span class="hv9__trust-av" style="--t:' + tones[i] + '">' + x + '</span>'; }).join('') +
      '</span><span class="hv9__trust-txt"><b>10.000+</b> Familien lernen schon mit Lesify</span></div></div>'
    );
  }
  function hStage() {
    return (
      '<div class="l2h-stage"><div class="l2-slides">' +
      HERO.map(function (f, i) {
        return (
          '<img class="l2-slide' + (i === 0 ? ' is-on' : '') + '" src="/assets/img/lan2/' + HERO_IMGS[i] + '.webp" alt="' + (i === 0 ? 'Lesify auf dem Tablet: ' + f.label : '') + '"' +
          (i === 0 ? ' fetchpriority="high"' : ' aria-hidden="true" loading="lazy"') + ' width="1416" height="1117" decoding="async">'
        );
      }).join('') +
      '</div></div>'
    );
  }
  function hCard() {
    return (
      '<div class="l2h-card"><span class="l2h-prog"></span><div class="l2h-cslides">' +
      HERO.map(function (f, i) {
        return (
          '<div class="l2h-cs' + (i === 0 ? ' is-active' : '') + '" style="--a:' + f.accent + '"><span class="l2h-ci">' + f.icon + '</span><span class="l2h-ce">' + pad(i) + ' — ' + f.label + '</span><div class="l2h-ct">' + f.title + '</div></div>'
        );
      }).join('') +
      '</div><div class="l2h-nav"><span class="l2h-count"><b data-hc>01</b> / ' + pad(HERO.length - 1) + '</span><div class="l2h-dots">' +
      HERO.map(function (f, i) {
        return '<button type="button" data-hd="' + i + '" aria-label="' + f.label + ' anzeigen"' + (i === 0 ? ' class="is-active"' : '') + '></button>';
      }).join('') +
      '</div><span class="l2h-arrows"><button type="button" data-hp aria-label="Vorherige Funktion">' + CHEV_L + '</button><button type="button" data-hn aria-label="Nächste Funktion">' + CHEV_R + '</button></span></div></div>'
    );
  }
  /* Wie die Startseite: Text links, Bühne + Karten rechts — aber im Container statt am rechten Rand fixiert.
     Die fünf Versionen unterscheiden sich in der Position von Slideshow-Karte / Navigation. */
  function split(n, left, right) {
    return '<div class="l2-inner"><div class="container hv9__grid l2h-s l2h-s' + n + '">' + left + '<div class="l2h-wrap">' + right + '</div></div></div>';
  }
  /* final: V6.2 — Textspalte unverändert (Original-Raster), Bühne ~620 px (Mitte zwischen Spaltenbreite und 50vw), Karte als flache Leiste */
  function heroHtml() {
    return split('6 l2h-s2 l2h-k2', hText(), hStage() + hCard());
  }

  var heroCtl = null;
  document.addEventListener('visibilitychange', function () {
    if (!heroCtl) return;
    if (document.hidden) heroCtl.stop();
    else heroCtl.start();
  });
  function initHero(el) {
    if (heroCtl) heroCtl.stop();
    var pics = [].slice.call(el.querySelectorAll('.l2h-stage .l2-slide'));
    var slidesC = [].slice.call(el.querySelectorAll('.l2h-cs'));
    var items = [].slice.call(el.querySelectorAll('[data-hi]'));
    var dots = [].slice.call(el.querySelectorAll('[data-hd]'));
    var count = el.querySelector('[data-hc]');
    var prog = el.querySelector('.l2h-prog');
    var n = pics.length,
      idx = 0,
      timer = null;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function arm() {
      if (!prog || reduce) return;
      prog.style.animation = 'none';
      void prog.offsetWidth;
      prog.style.animation = '';
    }
    function show(i) {
      var next = (i + n) % n;
      if (next !== idx) {
        var prev = pics[idx];
        prev.classList.add('is-prev');
        setTimeout(function () { prev.classList.remove('is-prev'); }, 700);
      }
      idx = next;
      pics.forEach(function (p, k) { p.classList.toggle('is-on', k === idx); });
      slidesC.forEach(function (p, k) { p.classList.toggle('is-active', k === idx); });
      items.forEach(function (p) { p.classList.toggle('is-active', +p.getAttribute('data-hi') === idx); });
      dots.forEach(function (p, k) { p.classList.toggle('is-active', k === idx); });
      if (count) count.textContent = pad(idx);
      el.style.setProperty('--h-a', HERO[idx].accent);
      el.style.setProperty('--hero-accent', HERO[idx].accent);
      arm();
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }
    function start() {
      if (reduce) return;
      stop();
      arm();
      timer = setInterval(function () { show(idx + 1); }, 5200);
    }
    el.querySelectorAll('[data-hp]').forEach(function (b) { b.addEventListener('click', function () { show(idx - 1); start(); }); });
    el.querySelectorAll('[data-hn]').forEach(function (b) { b.addEventListener('click', function () { show(idx + 1); start(); }); });
    dots.forEach(function (d) { d.addEventListener('click', function () { show(+d.getAttribute('data-hd')); start(); }); });
    items.forEach(function (d) { d.addEventListener('click', function () { show(+d.getAttribute('data-hi')); start(); }); });
    heroCtl = { stop: stop, start: start };
    show(0);
    start();
  }

  var RENDER = { kv: KV, chat: CHAT_V, lz: LZ_V, org: ORG_V };

  /* ---------- Slideshow (Punkte + Auto-Lauf wie in der früheren Demo) ---------- */
  var timers = {};
  function initShow(el, s) {
    if (timers[s.key]) {
      clearInterval(timers[s.key]);
      timers[s.key] = null;
    }
    var fig = el.querySelector('[data-l2show]');
    if (!fig) return;
    var pics = [].slice.call(fig.querySelectorAll('.l2-slide'));
    var dots = [].slice.call(el.querySelectorAll('[data-l2dot]'));
    var pts = [].slice.call(el.querySelectorAll('[data-l2pt]'));
    var n = pics.length,
      idx = 0;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function show(i) {
      var next = (i + n) % n;
      if (next !== idx) {
        /* Vorherige Folie bleibt deckend, bis die neue eingeblendet ist (kein Aufblitzen bei gleichem Bild) */
        var prev = pics[idx];
        prev.classList.add('is-prev');
        setTimeout(function () {
          prev.classList.remove('is-prev');
        }, 700);
      }
      idx = next;
      pics.forEach(function (p, pi) {
        p.classList.toggle('is-on', pi === idx);
      });
      dots.forEach(function (d, di) {
        d.classList.toggle('is-active', di === idx);
      });
      pts.forEach(function (p) {
        p.classList.toggle('is-current', +p.getAttribute('data-l2pt') === idx);
      });
    }
    function stop() {
      if (timers[s.key]) {
        clearInterval(timers[s.key]);
        timers[s.key] = null;
      }
    }
    function start() {
      if (reduce) return;
      stop();
      timers[s.key] = setInterval(function () {
        if (fig.offsetParent !== null) show(idx + 1);
      }, s.slideMs);
    }
    dots.forEach(function (d, di) {
      d.addEventListener('click', function () {
        show(di);
        start();
      });
    });
    pts.forEach(function (p) {
      p.style.cursor = 'pointer';
      p.addEventListener('click', function () {
        show(+p.getAttribute('data-l2pt'));
        start();
      });
    });
    show(0);
    if ('IntersectionObserver' in window) {
      var vis = new IntersectionObserver(
        function (es) {
          if (es[0].isIntersecting) {
            start();
            vis.disconnect();
          }
        },
        { threshold: 0.25 }
      );
      vis.observe(fig);
    } else start();
  }

  /* ---------- Build ---------- */
  var MAXV = {};
  function stored(key) {
    try {
      var v = parseInt(localStorage.getItem('lesify:lan2:' + key + ':c'), 10);
      if (v >= 1 && v <= (MAXV[key] || 5)) return v;
    } catch (e) {}
    return 1;
  }
  function store(key, v) {
    try {
      localStorage.setItem('lesify:lan2:' + key + ':c', String(v));
    } catch (e) {}
  }

  var io = null;
  var REVEAL =
    '.l2-head, .l2-media, .l2-prow li, .l2-cards li, .l2-nrow li, .l2-bc, .l2-scard, .l2-dc, .l2-chips li, .l2-snip, .l2-meta, .l2-cta, .l2-tabs';
  function reveal(el) {
    var items = el.querySelectorAll(REVEAL);
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!io) {
      io = new IntersectionObserver(
        function (es) {
          es.forEach(function (e) {
            if (e.isIntersecting) {
              e.target.classList.add('is-in');
              io.unobserve(e.target);
            }
          });
        },
        { rootMargin: '0px 0px -6% 0px', threshold: 0.05 }
      );
    }
    items.forEach(function (n) {
      n.classList.add('l2-rv');
      io.observe(n);
    });
  }

  function build(s, v) {
    var el = document.getElementById(s.key);
    if (!el) return;
    if (s.hero) {
      el.className = 'lab-sec hv9 l2hero';
      el.setAttribute('data-hero-bg', '9');
      el.setAttribute('data-hero-text', '1');
      el.setAttribute('data-hero-color', '1');
      el.innerHTML = heroHtml();
      initHero(el);
      return;
    }
    el.className = 'l2 is-' + s.tone + (s.flip ? ' is-flip' : '') + (s.fixed ? ' is-plain' : '');
    el.style.setProperty('--l2-a', s.accent);
    if (s.fixed) {
      /* Fächer: eigene Section mit Eyebrow/Headline/Lead wie die großen Sections, darunter das Original-Raster
         der Startseite (renderOrgFaecher „Ghost") — dessen eigener Kopf entfällt, damit nichts doppelt steht. */
      el.innerHTML =
        '<div class="container">' +
        head({ eb: 'Fächer', h: M.faecher.h, lead: M.faecher.lead }, true) +
        M.renderOrgFaecher('2') +
        '</div>';
      var oh = el.querySelector('.org-faecher__h');
      if (oh) oh.remove();
      reveal(el);
      return;
    }
    el.setAttribute('data-c', v);
    el.innerHTML = RENDER[s.key][v - 1](s);
    reveal(el);
    initShow(el, s);
  }

  var state = {};
  function buildAll() {
    SECTIONS.forEach(function (s) {
      state[s.key] = s.fixed || s.single ? 1 : stored(s.key);
      build(s, state[s.key]);
    });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-l2t]');
    if (!b) return;
    var box = b.closest('[data-l2tabs]'),
      i = b.getAttribute('data-l2t');
    box.querySelectorAll('[data-l2t]').forEach(function (x) {
      x.classList.toggle('is-on', x === b);
    });
    box.querySelectorAll('[data-l2p]').forEach(function (x) {
      x.classList.toggle('is-on', x.getAttribute('data-l2p') === i);
    });
  });

  /* ---------- Dev-Switcher ---------- */
  var VARIABLE = SECTIONS.filter(function (s) {
    return !s.fixed && !s.single;
  });
  function row(label, key, active) {
    return (
      '<div class="layout-dev-row"><span>' +
      label +
      '</span><div class="layout-dev-seg">' +
      Array.apply(null, Array(key === 'all' ? 5 : MAXV[key] || 5))
        .map(function (_, k) {
          var n = k + 1;
          return (
            '<button type="button" data-l2k="' +
            key +
            '" data-l2v="' +
            n +
            '"' +
            (key !== 'all' ? ' title="' + n + ' · ' + NAMES[key][n - 1] + '"' : '') +
            (n === active ? ' class="is-on"' : '') +
            '>' +
            n +
            '</button>'
          );
        })
        .join('') +
      '</div></div>'
    );
  }
  function mountDev() {
    var panel = document.createElement('div');
    panel.className = 'layout-dev is-lab l2-dev';
    try {
      if (localStorage.getItem('lesify:lan2:min') === '1') panel.classList.add('is-min');
    } catch (e) {}
    var html = '<button type="button" class="layout-dev-title" data-l2min>Lan2 · Inhalt</button>';
    VARIABLE.forEach(function (s) {
      html += row(s.label, s.key, state[s.key]);
    });
    html +=
      '<div class="l2-dev-names">' +
      VARIABLE.map(function (s) {
        return s.label + ': ' + NAMES[s.key].join(' · ');
      }).join('<br>') +
      '</div>';
    panel.innerHTML = html;
    panel.addEventListener('click', function (e) {
      if (e.target.closest('[data-l2min]')) {
        panel.classList.toggle('is-min');
        try {
          localStorage.setItem('lesify:lan2:min', panel.classList.contains('is-min') ? '1' : '0');
        } catch (err) {}
        return;
      }
      var b = e.target.closest('[data-l2k]');
      if (!b) return;
      var key = b.getAttribute('data-l2k'),
        v = parseInt(b.getAttribute('data-l2v'), 10);
      var keys =
        key === 'all'
          ? VARIABLE.map(function (s) {
              return s.key;
            })
          : [key];
      keys.forEach(function (k) {
        var sec = VARIABLE.filter(function (s) {
          return s.key === k;
        })[0];
        var vv = Math.min(v, MAXV[k] || 5);
        state[k] = vv;
        store(k, vv);
        build(sec, vv);
        panel.querySelectorAll('[data-l2k="' + k + '"]').forEach(function (x) {
          x.classList.toggle('is-on', +x.getAttribute('data-l2v') === vv);
        });
      });
      if (key === 'all')
        panel.querySelectorAll('[data-l2k="all"]').forEach(function (x) {
          x.classList.toggle('is-on', x === b);
        });
    });
    document.body.appendChild(panel);
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildAll();
    if (VARIABLE.length) mountDev();
  });
})();
