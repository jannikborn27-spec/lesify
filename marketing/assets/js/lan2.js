/* =========================================================
   Lesify — Landingpage-Variante /lan2/
   Demo-Sections mit den Mockup-Bildern der Hero-Slideshow
   (assets/img/lan2/mockup-*.webp). Layout je Section fest:
   Klausur = Bleed (hell), Chat = Callouts (dunkel),
   Organisation = Bleed (hell), Lernzettel = Callouts (dunkel)
   → schwarz/weiß im Wechsel. Der Inhalt ist 1:1 der der Startseite
   (window.LesifyMkt aus marketing.js); das Dev-Panel schaltet je Section
   zwischen 5 Darstellungen dieses Inhalts (localStorage['lesify:lan2:{key}:c']).
   ========================================================= */
(function () {
  'use strict';

  var M = window.LesifyMkt;
  if (!M) return;

  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"></path></svg>';
  function pad(i) { return (i + 1 < 10 ? '0' : '') + (i + 1); }
  function esc(s) { return String(s); }

  /* ---------- Inhalte (aus marketing.js) ---------- */
  var KVL = M.KVL, ORG = M.ORG, CHAT = M.CHAT, F = M.faecher;
  var LZ_SNIPS = M.KVX.lernzettel;
  var LZ_POINT = KVL.points[3];
  var LZ_LEAD = M.TLDR.points[5].s;

  var SECTIONS = [
    { key: 'kv', label: 'Klausur', tone: 'light', accent: 'var(--fach-blue)', eb: KVL.eb, h: KVL.h, lead: KVL.lead,
      img: 'mockup-klausur', alt: 'Lesify auf dem Tablet: Lernplan zur Mathe-Klausur, Tag 4 „Schwachstellen festigen“ mit Checkliste' },
    { key: 'chat', label: 'Chat', tone: 'dark', accent: 'var(--fach-teal)', eb: CHAT.eb, h: CHAT.h, lead: CHAT.lead,
      img: 'mockup-chat', alt: 'Lesify KI-Chat auf dem Tablet: Biologie „Ökosystem Wald“ mit Auswertung der Übungsaufgaben und Zusammenfassung' },
    { key: 'org', label: 'Orga', tone: 'light', flip: true, accent: 'var(--fach-rose)', eb: ORG.eb, h: ORG.h, lead: ORG.lead,
      img: 'mockup-organisation', alt: 'Lesify Themenseite „Gedichtanalyse“ im Fach Deutsch mit Chats, Lernzetteln, Dateien und Klausuren' },
    { key: 'lz', label: 'Zettel', tone: 'dark', accent: 'var(--fach-amber)', eb: 'Lernzettel', h: 'Ein Lernzettel, der die wichtigsten Infos automatisch notiert.', lead: LZ_LEAD,
      img: 'mockup-lernzettel', alt: 'Lesify Lernzettel „If-Sätze Type 1 und Type 2“ neben dem Chat zum gemeinsamen Überarbeiten' }
  ];

  var NAMES = {
    kv: ['Liste', 'Karten', 'Ziffern', 'Tabs', 'Bento'],
    chat: ['Flanke', 'Unten', 'Modi-Tabs', 'Overlap', 'Editorial'],
    org: ['Erklär-Karten', 'Pfad', 'Drei Karten', 'Zebra', 'Tabs + Ring'],
    lz: ['Flanke', 'Zettel-Karten', 'Tabs', 'Overlay', 'Editorial']
  };

  /* ---------- Bausteine ---------- */
  function media(s, cls) {
    return '<figure class="l2-media ' + cls + '"><img src="/assets/img/lan2/' + s.img + '.webp" alt="' + s.alt +
      '" width="1416" height="1117" loading="lazy" decoding="async"></figure>';
  }
  function head(s, center) {
    return '<div class="l2-head' + (center ? ' is-center' : '') + '"><span class="l2-eb">' + s.eb + '</span>' +
      '<h2 class="l2-h">' + s.h + '</h2><p class="l2-lead">' + s.lead + '</p></div>';
  }
  function cta(label) { return '<a class="l2-cta" href="/preise/">' + label + ' ' + ARROW + '</a>'; }
  function ico(svg) { return '<span class="l2-ico">' + svg + '</span>'; }
  function li(cls, inner, extra) { return '<li class="' + cls + '"' + (extra || '') + '>' + inner + '</li>'; }

  /* Interaktive Tabs: Buttons [data-l2t] + Panels [data-l2p] */
  function tabs(btns, panels, cls) {
    return '<div class="l2-tabs ' + (cls || '') + '" data-l2tabs><div class="l2-tabs__bar" role="tablist">' +
      btns.map(function (b, i) { return '<button type="button" role="tab" data-l2t="' + i + '"' + (i === 0 ? ' class="is-on"' : '') + '>' + b + '</button>'; }).join('') +
      '</div><div class="l2-tabs__panels">' +
      panels.map(function (p, i) { return '<div class="l2-tabs__p' + (i === 0 ? ' is-on' : '') + '" data-l2p="' + i + '" role="tabpanel">' + p + '</div>'; }).join('') +
      '</div></div>';
  }

  /* Helle Sections: Text links + Mockup rechts (Bleed), optional Zusatzblock in voller Breite */
  function bleed(s, text, extra) {
    return '<div class="l2-inner"><div class="container l2-2"><div class="l2-2__text">' + head(s) + text + '</div>' +
      media(s, 'l2-2__media') + '</div>' +
      (extra ? '<div class="container l2-extra">' + extra + '</div>' : '') + '</div>';
  }
  /* Dunkle Sections: Kopf mittig, Mockup, Inhalt drumherum (je Variante) */
  function dark(s, body) {
    return '<div class="l2-inner"><div class="container l2-4">' + head(s, true) + body + '</div></div>';
  }

  /* ---------- Klausur (kv) ---------- */
  function kvRows() {
    return '<ul class="l2-prow">' + KVL.points.map(function (p) {
      return li('', ico(M.KVL_ICON[p.ic]) + '<div><b>' + p.t + '</b><span>' + p.s + '</span></div>');
    }).join('') + '</ul>';
  }
  function kvFacts(cls) {
    return '<div class="l2-facts ' + (cls || '') + '">' + KVL.facts.map(function (f) {
      return '<div><b>' + f.n + '</b><span>' + f.l + '</span></div>';
    }).join('') + '</div>';
  }
  var KV = [
    /* 1 · Liste — wie live: Icon-Zeilen, Kennzahlen, CTA */
    function (s) { return bleed(s, kvRows() + kvFacts() + cta('Klausur anlegen')); },
    /* 2 · Karten — Kennzahlen im Text, vier Karten in voller Breite darunter */
    function (s) {
      return bleed(s, kvFacts('is-pills') + cta('Klausur anlegen'),
        '<ul class="l2-cards c4">' + KVL.points.map(function (p) {
          return li('', ico(M.KVL_ICON[p.ic]) + '<b>' + p.t + '</b><span>' + p.s + '</span>');
        }).join('') + '</ul>');
    },
    /* 3 · Ziffern — nummerierte Editorial-Zeilen ohne Icons */
    function (s) {
      return bleed(s, '<ol class="l2-nrow">' + KVL.points.map(function (p, i) {
        return li('', '<span class="l2-num">' + pad(i) + '</span><div><b>' + p.t + '</b><span>' + p.s + '</span></div>');
      }).join('') + '</ol>' + kvFacts('is-line') + cta('Klausur anlegen'));
    },
    /* 4 · Tabs — Punkte umschaltbar, Kennzahlen groß */
    function (s) {
      return bleed(s, tabs(
        KVL.points.map(function (p) { return ico(M.KVL_ICON[p.ic]) + p.t; }),
        KVL.points.map(function (p) { return '<b>' + p.t + '</b><span>' + p.s + '</span>'; })
      ) + kvFacts('is-big') + cta('Klausur anlegen'));
    },
    /* 5 · Bento — Punkte + Kennzahlen als Kachel-Raster in voller Breite */
    function (s) {
      var P = KVL.points, T = KVL.facts;
      var card = function (p, cls) { return '<div class="l2-bc ' + cls + '">' + ico(M.KVL_ICON[p.ic]) + '<b>' + p.t + '</b><span>' + p.s + '</span></div>'; };
      var fact = function (f) { return '<div class="l2-bc is-fact"><b>' + f.n + '</b><span>' + f.l + '</span></div>'; };
      return bleed(s, cta('Klausur anlegen'),
        '<div class="l2-bento">' + card(P[0], 'is-big') + card(P[1], '') + card(P[2], '') + card(P[3], 'is-wide') +
        fact(T[0]) + fact(T[1]) + fact(T[2]) + '<a class="l2-bc is-cta" href="/preise/"><b>In zwei Minuten startklar</b><span>Klausur anlegen ' + ARROW + '</span></a></div>');
    }
  ];

  /* ---------- Organisation (org) ---------- */
  function fCard(f) {
    return '<article class="l2-fach" style="--t:' + f.t + '"><span class="l2-fach__av">' + f.i + '</span><b>' + f.n + '</b><span>' + f.m + '</span></article>';
  }
  function fMore() {
    return '<article class="l2-fach is-ghost"><span class="l2-fach__av">' + F.ellipsis + '</span><b>und ' + F.more + ' weitere</b><span>von Kunst bis Wirtschaft</span></article>';
  }
  function fAdd() {
    return '<article class="l2-fach is-ghost"><span class="l2-fach__av">' + F.plus() + '</span><b>Eigenes Fach</b><span>in Sekunden anlegen</span></article>';
  }
  function fHead(center) {
    return '<div class="l2-fh' + (center ? ' is-center' : '') + '"><b>' + F.h + '</b><span>' + F.lead + '</span></div>';
  }
  var ORG_CTA = 'Kostenlos starten';
  var ORG_V = [
    /* 1 · Erklär-Karten — wie live: drei nummerierte Karten, Fächer-Raster darunter */
    function (s) {
      return bleed(s, '<div class="l2-scards">' + ORG.points.map(function (p, i) {
        return '<div class="l2-scard">' + ico(M.ORG_IC[p.ic]) + '<div><b>' + p.t + '</b><span>' + p.s + '</span></div><i>' + (i + 1) + '</i></div>';
      }).join('') + '</div>' + cta(ORG_CTA),
      fHead() + '<div class="l2-fgrid">' + F.items().map(fCard).join('') + fMore() + fAdd() + '</div>');
    },
    /* 2 · Pfad — Fach → Thema → Dateien als Schiene, Fächer als Pills */
    function (s) {
      return bleed(s, '<ol class="l2-path">' + ORG.points.map(function (p, i) {
        var st = ORG.steps[i];
        return li('', '<span class="l2-path__n">' + (i + 1) + '</span><div><em>' + st.l + ' · ' + st.s + '</em><b>' + p.t + '</b><span>' + p.s + '</span></div>');
      }).join('') + '</ol>' + cta(ORG_CTA),
      fHead(true) + '<ul class="l2-fpills">' + F.items().map(function (f) {
        return '<li style="--t:' + f.t + '"><span>' + f.i + '</span>' + f.n + '</li>';
      }).join('') + '<li class="is-more">+' + F.more + ' weitere</li></ul>');
    },
    /* 3 · Drei Karten — Punkte als hohe Karten, Fächer als Scroll-Reihe */
    function (s) {
      return bleed(s, cta(ORG_CTA),
        '<ul class="l2-cards c3 is-tall">' + ORG.points.map(function (p) {
          return li('', ico(M.ORG_IC[p.ic]) + '<b>' + p.t + '</b><span>' + p.s + '</span>');
        }).join('') + '</ul>' + fHead() +
        '<div class="l2-fscroll">' + F.items().map(fCard).join('') + fMore() + fAdd() + '</div>');
    },
    /* 4 · Zebra — nummerierte Zeilen, Fächer als kompakte Liste */
    function (s) {
      return bleed(s, '<ol class="l2-nrow is-zebra">' + ORG.points.map(function (p, i) {
        return li('', '<span class="l2-num">' + pad(i) + '</span><div><b>' + p.t + '</b><span>' + p.s + '</span></div>');
      }).join('') + '</ol>' + cta(ORG_CTA),
      fHead() + '<ul class="l2-flist">' + F.items().map(function (f) {
        return '<li style="--t:' + f.t + '"><span class="l2-fach__av">' + f.i + '</span><b>' + f.n + '</b><span>' + f.m + '</span></li>';
      }).join('') + '<li class="is-ghost"><span class="l2-fach__av">' + F.ellipsis + '</span><b>und ' + F.more + ' weitere Fächer</b><span>von Kunst bis Wirtschaft</span></li></ul>');
    },
    /* 5 · Tabs + Ring — Punkte umschaltbar, Fächer als runde Avatare */
    function (s) {
      return bleed(s, tabs(
        ORG.points.map(function (p) { return ico(M.ORG_IC[p.ic]) + p.t; }),
        ORG.points.map(function (p) { return '<b>' + p.t + '</b><span>' + p.s + '</span>'; })
      ) + cta(ORG_CTA),
      fHead(true) + '<div class="l2-fring">' + F.items().map(function (f) {
        return '<div style="--t:' + f.t + '"><span>' + f.i + '</span><b>' + f.n + '</b></div>';
      }).join('') + '<div class="is-more"><span>+' + F.more + '</span><b>weitere</b></div><div class="is-more"><span>' + F.plus() + '</span><b>Eigenes Fach</b></div></div>');
    }
  ];

  /* ---------- KI-Chat (chat) ---------- */
  function perkCard(p, cls) { return '<div class="l2-dc ' + (cls || '') + '">' + ico(p.icon) + '<b>' + p.title + '</b><span>' + p.text + '</span></div>'; }
  function modeCard(m, cls) { return '<div class="l2-dc is-mode ' + (cls || '') + '">' + ico(m.i) + '<b>' + m.l + '</b><span>' + m.d + '</span></div>'; }
  function colH(t) { return '<span class="l2-colh">' + t + '</span>'; }
  var CHAT_V = [
    /* 1 · Flanke — Perks links, Modi rechts vom Mockup */
    function (s) {
      return dark(s, '<div class="l2-4__grid"><div class="l2-4__side">' + colH('Was den Chat besonders macht') + CHAT.perks.map(function (p) { return perkCard(p); }).join('') + '</div>' +
        media(s, 'l2-4__media') +
        '<div class="l2-4__side">' + colH('Die vier Chat-Modi') + CHAT.modes.map(function (m) { return modeCard(m, 'is-sm'); }).join('') + '</div></div>');
    },
    /* 2 · Unten — Mockup groß, darunter Perks-Reihe und Modi-Reihe */
    function (s) {
      return dark(s, media(s, 'l2-4__media is-solo') +
        '<div class="l2-row r3">' + CHAT.perks.map(function (p) { return perkCard(p); }).join('') + '</div>' +
        colH('Vier Modi, passend zu Fach und Thema') +
        '<div class="l2-row r4">' + CHAT.modes.map(function (m) { return modeCard(m, 'is-sm'); }).join('') + '</div>');
    },
    /* 3 · Modi-Tabs — Modus-Leiste über dem Mockup, Perks darunter */
    function (s) {
      return dark(s, tabs(
        CHAT.modes.map(function (m) { return ico(m.i) + m.l; }),
        CHAT.modes.map(function (m) { return '<b>' + m.l + '</b><span>' + m.d + '</span>'; }), 'is-center') +
        media(s, 'l2-4__media is-solo') +
        '<div class="l2-row r3 is-flat">' + CHAT.perks.map(function (p) { return perkCard(p, 'is-flat'); }).join('') + '</div>');
    },
    /* 4 · Overlap — Modi als Chips unter dem Kopf, Perk-Karten überlappen das Mockup */
    function (s) {
      return dark(s, '<ul class="l2-chips">' + CHAT.modes.map(function (m) {
        return li('', ico(m.i) + '<span><b>' + m.l + '</b>' + m.d + '</span>');
      }).join('') + '</ul>' + media(s, 'l2-4__media is-solo') +
        '<div class="l2-row r3 is-overlap">' + CHAT.perks.map(function (p) { return perkCard(p, 'is-glass'); }).join('') + '</div>');
    },
    /* 5 · Editorial — Mockup, darunter zwei Spalten: Perks nummeriert, Modi 2×2 */
    function (s) {
      return dark(s, media(s, 'l2-4__media is-solo') + '<div class="l2-2col"><div>' + colH('Was den Chat besonders macht') +
        '<ol class="l2-nrow is-dark">' + CHAT.perks.map(function (p, i) {
          return li('', '<span class="l2-num">' + pad(i) + '</span><div><b>' + p.title + '</b><span>' + p.text + '</span></div>');
        }).join('') + '</ol></div><div>' + colH('Die vier Chat-Modi') +
        '<ul class="l2-grid2">' + CHAT.modes.map(function (m) {
          return li('', ico(m.i) + '<div><b>' + m.l + '</b><span>' + m.d + '</span></div>');
        }).join('') + '</ul></div></div>');
    }
  ];

  /* ---------- Lernzettel (lz) ---------- */
  var LZ_META = '<div class="l2-meta">' + ico(M.KVL_ICON.doc) + '<div><b>' + KVL.lzTitle + '</b><span>' + KVL.lzMeta + '</span></div></div>';
  var LZ_PT = '<div class="l2-dc">' + ico(M.KVL_ICON.doc) + '<b>' + LZ_POINT.t + '</b><span>' + LZ_POINT.s + '</span></div>';
  function snip(n, cls) { return '<div class="l2-snip ' + (cls || '') + '"><b>' + n.h + '</b><span>' + n.b + '</span></div>'; }
  var LZ_V = [
    /* 1 · Flanke — Punkt + Meta links, Auszüge rechts */
    function (s) {
      return dark(s, '<div class="l2-4__grid"><div class="l2-4__side">' + LZ_PT + LZ_META + '</div>' + media(s, 'l2-4__media') +
        '<div class="l2-4__side">' + colH('Aus dem Lernzettel') + LZ_SNIPS.map(function (n) { return snip(n, 'is-sm'); }).join('') + '</div></div>');
    },
    /* 2 · Zettel-Karten — Meta-Leiste, drei helle „Zettel" unter dem Mockup */
    function (s) {
      return dark(s, media(s, 'l2-4__media is-solo') + LZ_META +
        '<div class="l2-row r3">' + LZ_SNIPS.map(function (n) { return snip(n, 'is-paper'); }).join('') + '</div>' +
        '<p class="l2-note">' + LZ_POINT.s + '</p>');
    },
    /* 3 · Tabs — Auszüge umschaltbar unter dem Mockup */
    function (s) {
      return dark(s, media(s, 'l2-4__media is-solo') + tabs(
        LZ_SNIPS.map(function (n) { return n.h; }),
        LZ_SNIPS.map(function (n) { return '<b>' + n.h + '</b><span>' + n.b + '</span>'; }), 'is-center') + LZ_META);
    },
    /* 4 · Overlay — Zettel-Karte liegt über dem Mockup */
    function (s) {
      return dark(s, '<div class="l2-ov">' + media(s, 'l2-4__media is-solo') +
        '<div class="l2-ov__card"><span class="l2-colh is-ink">' + KVL.lzTitle + '</span>' +
        LZ_SNIPS.map(function (n) { return '<p><b>' + n.h + '</b>' + n.b + '</p>'; }).join('') + '</div></div>' +
        '<p class="l2-note">' + LZ_POINT.s + ' ' + KVL.lzMeta + '.</p>');
    },
    /* 5 · Editorial — links Punkt + Meta, rechts nummerierte Auszüge */
    function (s) {
      return dark(s, media(s, 'l2-4__media is-solo') + '<div class="l2-2col"><div>' + colH('So entsteht der Lernzettel') + LZ_PT + LZ_META + '</div>' +
        '<div>' + colH('Aus dem Lernzettel') + '<ol class="l2-nrow is-dark">' + LZ_SNIPS.map(function (n, i) {
          return li('', '<span class="l2-num">' + pad(i) + '</span><div><b>' + n.h + '</b><span>' + n.b + '</span></div>');
        }).join('') + '</ol></div></div>');
    }
  ];

  var RENDER = { kv: KV, chat: CHAT_V, org: ORG_V, lz: LZ_V };

  /* ---------- Build ---------- */
  function stored(key) {
    try { var v = parseInt(localStorage.getItem('lesify:lan2:' + key + ':c'), 10); if (v >= 1 && v <= 5) return v; } catch (e) {}
    return 1;
  }
  function store(key, v) { try { localStorage.setItem('lesify:lan2:' + key + ':c', String(v)); } catch (e) {} }

  var io = null;
  var REVEAL = '.l2-head, .l2-media, .l2-prow li, .l2-cards li, .l2-nrow li, .l2-bc, .l2-scard, .l2-path li, .l2-dc, .l2-chips li, .l2-snip, .l2-meta, .l2-fach, .l2-cta, .l2-tabs';
  function reveal(el) {
    var items = el.querySelectorAll(REVEAL);
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!io) {
      io = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
      }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    }
    items.forEach(function (n) { n.classList.add('l2-rv'); io.observe(n); });
  }

  function build(s, i, v) {
    var el = document.getElementById(s.key);
    if (!el) return;
    el.className = 'l2 is-' + s.tone + (s.flip ? ' is-flip' : '');
    el.setAttribute('data-c', v);
    el.style.setProperty('--l2-a', s.accent);
    el.innerHTML = RENDER[s.key][v - 1](s);
    reveal(el);
  }

  var state = {};
  function buildAll() {
    SECTIONS.forEach(function (s, i) { state[s.key] = stored(s.key); build(s, i, state[s.key]); });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-l2t]');
    if (!b) return;
    var box = b.closest('[data-l2tabs]'), i = b.getAttribute('data-l2t');
    box.querySelectorAll('[data-l2t]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
    box.querySelectorAll('[data-l2p]').forEach(function (x) { x.classList.toggle('is-on', x.getAttribute('data-l2p') === i); });
  });

  /* ---------- Dev-Switcher ---------- */
  function row(label, key, active) {
    return '<div class="layout-dev-row"><span>' + label + '</span><div class="layout-dev-seg">' +
      [1, 2, 3, 4, 5].map(function (n) {
        return '<button type="button" data-l2k="' + key + '" data-l2v="' + n + '"' +
          (key !== 'all' ? ' title="' + n + ' · ' + NAMES[key][n - 1] + '"' : '') + (n === active ? ' class="is-on"' : '') + '>' + n + '</button>';
      }).join('') + '</div></div>';
  }
  function mountDev() {
    var panel = document.createElement('div');
    panel.className = 'layout-dev is-lab l2-dev';
    try { if (localStorage.getItem('lesify:lan2:min') === '1') panel.classList.add('is-min'); } catch (e) {}
    var html = '<button type="button" class="layout-dev-title" data-l2min>Lan2 · Inhalt</button>' + row('Alle', 'all', 0);
    SECTIONS.forEach(function (s) { html += row(s.label, s.key, state[s.key]); });
    html += '<div class="l2-dev-names">' + SECTIONS.map(function (s) { return s.label + ': ' + NAMES[s.key].join(' · '); }).join('<br>') + '</div>';
    panel.innerHTML = html;
    panel.addEventListener('click', function (e) {
      if (e.target.closest('[data-l2min]')) {
        panel.classList.toggle('is-min');
        try { localStorage.setItem('lesify:lan2:min', panel.classList.contains('is-min') ? '1' : '0'); } catch (err) {}
        return;
      }
      var b = e.target.closest('[data-l2k]');
      if (!b) return;
      var key = b.getAttribute('data-l2k'), v = parseInt(b.getAttribute('data-l2v'), 10);
      var keys = key === 'all' ? SECTIONS.map(function (s) { return s.key; }) : [key];
      keys.forEach(function (k) {
        var idx = SECTIONS.findIndex(function (s) { return s.key === k; });
        state[k] = v; store(k, v); build(SECTIONS[idx], idx, v);
        panel.querySelectorAll('[data-l2k="' + k + '"]').forEach(function (x) { x.classList.toggle('is-on', +x.getAttribute('data-l2v') === v); });
      });
      if (key === 'all') panel.querySelectorAll('[data-l2k="all"]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
    });
    document.body.appendChild(panel);
  }

  document.addEventListener('DOMContentLoaded', function () { buildAll(); mountDev(); });
})();
