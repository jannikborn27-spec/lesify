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
  var LZ_SNIPS = M.KVX.lernzettel;
  var LZ_POINT = KVL.points[3];
  var LZ_LEAD = M.TLDR.points[5].s;

  var SECTIONS = [
    {
      key: 'kv',
      label: 'Klausur',
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
      tone: 'light',
      flip: true,
      accent: 'var(--fach-amber)',
      eb: 'Lernzettel',
      h: 'Ein Lernzettel, der die wichtigsten Infos automatisch notiert.',
      lead: LZ_LEAD,
      imgs: ['mockup-lernzettel'],
      alt: 'Lesify Lernzettel „If-Sätze Type 1 und Type 2“ neben dem Chat zum gemeinsamen Überarbeiten'
    },
    {
      key: 'org',
      label: 'Orga',
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

  var NAMES = {
    kv: ['Liste', 'Karten', 'Ziffern', 'Tabs', 'Bento'],
    chat: ['Flanke', 'Unten', 'Modi-Tabs', 'Overlap', 'Editorial'],
    lz: ['Liste', 'Zettel-Karten', 'Tabs', 'Overlay', 'Editorial'],
    org: ['Flanke', 'Unten', 'Tabs', 'Overlap', 'Editorial']
  };

  /* ---------- Bausteine ---------- */
  /* Mockup als Slideshow-Stapel; Punkte nur, wenn s.slides > 1 (Klausur, Orga).
     `after` liegt im Stapel (z. B. Overlay-Karte). */
  function media(s, cls, after) {
    var n = s.slides || 1,
      pics = '',
      dots = '';
    for (var i = 0; i < n; i++) {
      pics +=
        '<img class="l2-slide' +
        (i === 0 ? ' is-on' : '') +
        '" src="/assets/img/lan2/' +
        s.imgs[i % s.imgs.length] +
        '.webp" alt="' +
        (i === 0 ? s.alt : '') +
        '"' +
        (i === 0 ? '' : ' aria-hidden="true"') +
        ' width="1416" height="1117" loading="lazy" decoding="async">';
    }
    if (n > 1) {
      dots = '<div class="l2-dots" role="tablist" aria-label="Folie wählen">';
      for (var d = 0; d < n; d++) {
        dots +=
          '<button type="button" role="tab" class="l2-dots__d' +
          (d === 0 ? ' is-active' : '') +
          '" data-l2dot="' +
          d +
          '" aria-label="' +
          s.slideLabels[d] +
          '">' +
          (d + 1) +
          '</button>';
      }
      dots += '</div>';
    }
    return (
      '<figure class="l2-media ' +
      cls +
      '"' +
      (n > 1 ? ' data-l2show' : '') +
      '><div class="l2-slides">' +
      pics +
      (after || '') +
      '</div>' +
      dots +
      '</figure>'
    );
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
  function ctaRow(label) {
    return '<div class="l2-ctarow">' + cta(label) + '</div>';
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
  function tabs(btns, panels, cls) {
    return (
      '<div class="l2-tabs ' +
      (cls || '') +
      '" data-l2tabs><div class="l2-tabs__bar" role="tablist">' +
      btns
        .map(function (b, i) {
          return '<button type="button" role="tab" data-l2t="' + i + '"' + (i === 0 ? ' class="is-on"' : '') + '>' + b + '</button>';
        })
        .join('') +
      '</div><div class="l2-tabs__panels">' +
      panels
        .map(function (p, i) {
          return '<div class="l2-tabs__p' + (i === 0 ? ' is-on' : '') + '" data-l2p="' + i + '" role="tabpanel">' + p + '</div>';
        })
        .join('') +
      '</div></div>'
    );
  }

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
  function dark(s, body) {
    return '<div class="l2-inner"><div class="container l2-4">' + head(s, true) + body + '</div></div>';
  }

  /* ---------- Klausur (kv, hell) ---------- */
  function kvRows() {
    return (
      '<ul class="l2-prow">' +
      KVL.points
        .map(function (p) {
          return li('', ico(M.KVL_ICON[p.ic]) + '<div><b>' + p.t + '</b><span>' + p.s + '</span></div>');
        })
        .join('') +
      '</ul>'
    );
  }
  function kvFacts(cls) {
    return (
      '<div class="l2-facts ' +
      (cls || '') +
      '">' +
      KVL.facts
        .map(function (f) {
          return '<div><b>' + f.n + '</b><span>' + f.l + '</span></div>';
        })
        .join('') +
      '</div>'
    );
  }
  var KV_CTA = 'Klausur anlegen';
  var KV = [
    /* 1 · Liste — wie live: Icon-Zeilen, Kennzahlen, CTA */
    function (s) {
      return bleed(s, kvRows() + kvFacts() + cta(KV_CTA));
    },
    /* 2 · Karten — Kennzahlen im Text, vier Karten in voller Breite darunter */
    function (s) {
      return bleed(
        s,
        kvFacts('is-pills') + cta(KV_CTA),
        '<ul class="l2-cards c4">' +
          KVL.points
            .map(function (p) {
              return li('', ico(M.KVL_ICON[p.ic]) + '<b>' + p.t + '</b><span>' + p.s + '</span>');
            })
            .join('') +
          '</ul>'
      );
    },
    /* 3 · Ziffern — nummerierte Editorial-Zeilen ohne Icons */
    function (s) {
      return bleed(
        s,
        '<ol class="l2-nrow">' +
          KVL.points
            .map(function (p, i) {
              return li('', '<span class="l2-num">' + pad(i) + '</span><div><b>' + p.t + '</b><span>' + p.s + '</span></div>');
            })
            .join('') +
          '</ol>' +
          kvFacts('is-line') +
          cta(KV_CTA)
      );
    },
    /* 4 · Tabs — Punkte umschaltbar, Kennzahlen groß */
    function (s) {
      return bleed(
        s,
        tabs(
          KVL.points.map(function (p) {
            return ico(M.KVL_ICON[p.ic]) + p.t;
          }),
          KVL.points.map(function (p) {
            return '<b>' + p.t + '</b><span>' + p.s + '</span>';
          })
        ) +
          kvFacts('is-big') +
          cta(KV_CTA)
      );
    },
    /* 5 · Bento — Punkte + Kennzahlen als Kachel-Raster in voller Breite */
    function (s) {
      var P = KVL.points,
        T = KVL.facts;
      var card = function (p, cls) {
        return '<div class="l2-bc ' + cls + '">' + ico(M.KVL_ICON[p.ic]) + '<b>' + p.t + '</b><span>' + p.s + '</span></div>';
      };
      var fact = function (f) {
        return '<div class="l2-bc is-fact"><b>' + f.n + '</b><span>' + f.l + '</span></div>';
      };
      return bleed(
        s,
        cta(KV_CTA),
        '<div class="l2-bento">' +
          card(P[0], 'is-big') +
          card(P[1], '') +
          card(P[2], '') +
          card(P[3], 'is-wide') +
          fact(T[0]) +
          fact(T[1]) +
          fact(T[2]) +
          '<a class="l2-bc is-cta" href="/preise/"><b>In zwei Minuten startklar</b><span>' +
          KV_CTA +
          ' ' +
          ARROW +
          '</span></a></div>'
      );
    }
  ];

  /* ---------- KI-Chat (chat, dunkel) ---------- */
  function perkCard(p, cls) {
    return '<div class="l2-dc ' + (cls || '') + '">' + ico(p.icon) + '<b>' + p.title + '</b><span>' + p.text + '</span></div>';
  }
  function modeCard(m, cls) {
    return '<div class="l2-dc is-mode ' + (cls || '') + '">' + ico(m.i) + '<b>' + m.l + '</b><span>' + m.d + '</span></div>';
  }
  var CHAT_V = [
    /* 1 · Flanke — Perks links, Modi rechts vom Mockup */
    function (s) {
      return dark(
        s,
        '<div class="l2-4__grid"><div class="l2-4__side">' +
          colH('Was den Chat besonders macht') +
          CHAT.perks
            .map(function (p) {
              return perkCard(p);
            })
            .join('') +
          '</div>' +
          media(s, 'l2-4__media') +
          '<div class="l2-4__side">' +
          colH('Die vier Chat-Modi') +
          CHAT.modes
            .map(function (m) {
              return modeCard(m, 'is-sm');
            })
            .join('') +
          '</div></div>'
      );
    },
    /* 2 · Unten — Mockup groß, darunter Perks-Reihe und Modi-Reihe */
    function (s) {
      return dark(
        s,
        media(s, 'l2-4__media is-solo') +
          '<div class="l2-row r3">' +
          CHAT.perks
            .map(function (p) {
              return perkCard(p);
            })
            .join('') +
          '</div>' +
          colH('Vier Modi, passend zu Fach und Thema') +
          '<div class="l2-row r4">' +
          CHAT.modes
            .map(function (m) {
              return modeCard(m, 'is-sm');
            })
            .join('') +
          '</div>'
      );
    },
    /* 3 · Modi-Tabs — Modus-Leiste über dem Mockup, Perks darunter */
    function (s) {
      return dark(
        s,
        tabs(
          CHAT.modes.map(function (m) {
            return ico(m.i) + m.l;
          }),
          CHAT.modes.map(function (m) {
            return '<b>' + m.l + '</b><span>' + m.d + '</span>';
          }),
          'is-center'
        ) +
          media(s, 'l2-4__media is-solo') +
          '<div class="l2-row r3 is-flat">' +
          CHAT.perks
            .map(function (p) {
              return perkCard(p, 'is-flat');
            })
            .join('') +
          '</div>'
      );
    },
    /* 4 · Overlap — Modi als Chips unter dem Kopf, Perk-Karten überlappen das Mockup */
    function (s) {
      return dark(
        s,
        '<ul class="l2-chips">' +
          CHAT.modes
            .map(function (m) {
              return li('', ico(m.i) + '<span><b>' + m.l + '</b>' + m.d + '</span>');
            })
            .join('') +
          '</ul>' +
          media(s, 'l2-4__media is-solo') +
          '<div class="l2-row r3 is-overlap">' +
          CHAT.perks
            .map(function (p) {
              return perkCard(p, 'is-glass');
            })
            .join('') +
          '</div>'
      );
    },
    /* 5 · Editorial — Mockup, darunter zwei Spalten: Perks nummeriert, Modi 2×2 */
    function (s) {
      return dark(
        s,
        media(s, 'l2-4__media is-solo') +
          '<div class="l2-2col"><div>' +
          colH('Was den Chat besonders macht') +
          '<ol class="l2-nrow is-dark">' +
          CHAT.perks
            .map(function (p, i) {
              return li('', '<span class="l2-num">' + pad(i) + '</span><div><b>' + p.title + '</b><span>' + p.text + '</span></div>');
            })
            .join('') +
          '</ol></div><div>' +
          colH('Die vier Chat-Modi') +
          '<ul class="l2-grid2">' +
          CHAT.modes
            .map(function (m) {
              return li('', ico(m.i) + '<div><b>' + m.l + '</b><span>' + m.d + '</span></div>');
            })
            .join('') +
          '</ul></div></div>'
      );
    }
  ];

  /* ---------- Lernzettel (lz, hell) ---------- */
  var LZ_CTA = 'Kostenlos starten';
  var LZ_META =
    '<div class="l2-meta">' + ico(M.KVL_ICON.doc) + '<div><b>' + KVL.lzTitle + '</b><span>' + KVL.lzMeta + '</span></div></div>';
  var LZ_PT = '<div class="l2-dc">' + ico(M.KVL_ICON.doc) + '<b>' + LZ_POINT.t + '</b><span>' + LZ_POINT.s + '</span></div>';
  function snip(n, cls) {
    return '<div class="l2-snip ' + (cls || '') + '"><b>' + n.h + '</b><span>' + n.b + '</span></div>';
  }
  var LZ_V = [
    /* 1 · Liste — Punkt + drei Auszüge als Icon-Zeilen, Meta darunter */
    function (s) {
      return bleed(
        s,
        '<ul class="l2-prow">' +
          li('', ico(M.KVL_ICON.doc) + '<div><b>' + LZ_POINT.t + '</b><span>' + LZ_POINT.s + '</span></div>') +
          LZ_SNIPS.map(function (n) {
            return li('', ico(M.KVL_ICON.check) + '<div><b>' + n.h + '</b><span>' + n.b + '</span></div>');
          }).join('') +
          '</ul>' +
          LZ_META +
          cta(LZ_CTA)
      );
    },
    /* 2 · Zettel-Karten — drei „Zettel" in voller Breite darunter */
    function (s) {
      return bleed(
        s,
        LZ_META + '<p class="l2-note is-left">' + LZ_POINT.s + '</p>' + cta(LZ_CTA),
        '<div class="l2-row r3">' +
          LZ_SNIPS.map(function (n) {
            return snip(n, 'is-paper');
          }).join('') +
          '</div>'
      );
    },
    /* 3 · Tabs — Auszüge umschaltbar */
    function (s) {
      return bleed(
        s,
        tabs(
          LZ_SNIPS.map(function (n) {
            return n.h;
          }),
          LZ_SNIPS.map(function (n) {
            return '<b>' + n.h + '</b><span>' + n.b + '</span>';
          })
        ) +
          LZ_META +
          cta(LZ_CTA)
      );
    },
    /* 4 · Overlay — Zettel-Karte liegt über dem Mockup */
    function (s) {
      var card =
        '<div class="l2-ov__card"><span class="l2-colh is-ink">' +
        KVL.lzTitle +
        '</span>' +
        LZ_SNIPS.map(function (n) {
          return '<p><b>' + n.h + '</b>' + n.b + '</p>';
        }).join('') +
        '</div>';
      return bleed(s, LZ_PT + LZ_META + cta(LZ_CTA), '', card);
    },
    /* 5 · Editorial — links Punkt + Meta, rechts nummerierte Auszüge */
    function (s) {
      return bleed(
        s,
        cta(LZ_CTA),
        '<div class="l2-2col"><div>' +
          colH('So entsteht der Lernzettel') +
          LZ_PT +
          LZ_META +
          '</div><div>' +
          colH('Aus dem Lernzettel') +
          '<ol class="l2-nrow is-flush">' +
          LZ_SNIPS.map(function (n, i) {
            return li('', '<span class="l2-num">' + pad(i) + '</span><div><b>' + n.h + '</b><span>' + n.b + '</span></div>');
          }).join('') +
          '</ol></div></div>'
      );
    }
  ];

  /* ---------- Organisation (org, dunkel) ---------- */
  var ORG_CTA = 'Kostenlos starten';
  function ptCard(p, i, cls) {
    return (
      '<div class="l2-dc ' + (cls || '') + '" data-l2pt="' + i + '">' + ico(M.ORG_IC[p.ic]) + '<b>' + p.t + '</b><span>' + p.s + '</span></div>'
    );
  }
  function stepCard(st, i) {
    return (
      '<div class="l2-dc is-sm" data-l2pt="' +
      i +
      '">' +
      ico(M.ORG_IC[ORG.points[i].ic]) +
      '<b>' +
      st.l +
      '</b><span>' +
      st.s +
      '</span></div>'
    );
  }
  var ORG_V = [
    /* 1 · Flanke — die drei Punkte links, der Beispiel-Pfad rechts */
    function (s) {
      return dark(
        s,
        '<div class="l2-4__grid"><div class="l2-4__side">' +
          colH('So ist alles geordnet') +
          ORG.points
            .map(function (p, i) {
              return ptCard(p, i);
            })
            .join('') +
          '</div>' +
          media(s, 'l2-4__media') +
          '<div class="l2-4__side">' +
          colH('Fach → Thema → Dateien') +
          ORG.steps.map(stepCard).join('') +
          '</div></div>' +
          ctaRow(ORG_CTA)
      );
    },
    /* 2 · Unten — Mockup groß, darunter die drei Punkte */
    function (s) {
      return dark(
        s,
        media(s, 'l2-4__media is-solo') +
          '<div class="l2-row r3">' +
          ORG.points
            .map(function (p, i) {
              return ptCard(p, i);
            })
            .join('') +
          '</div>' +
          ctaRow(ORG_CTA)
      );
    },
    /* 3 · Tabs — Punkte umschaltbar über dem Mockup, Pfad darunter */
    function (s) {
      return dark(
        s,
        tabs(
          ORG.points.map(function (p) {
            return ico(M.ORG_IC[p.ic]) + p.t;
          }),
          ORG.points.map(function (p) {
            return '<b>' + p.t + '</b><span>' + p.s + '</span>';
          }),
          'is-center'
        ) +
          media(s, 'l2-4__media is-solo') +
          '<ul class="l2-chips">' +
          ORG.steps
            .map(function (st, i) {
              return li('', ico(M.ORG_IC[ORG.points[i].ic]) + '<span><b>' + st.l + '</b>' + st.s + '</span>', ' data-l2pt="' + i + '"');
            })
            .join('') +
          '</ul>' +
          ctaRow(ORG_CTA)
      );
    },
    /* 4 · Overlap — Pfad als Chips unter dem Kopf, Punkt-Karten überlappen das Mockup */
    function (s) {
      return dark(
        s,
        '<ul class="l2-chips">' +
          ORG.steps
            .map(function (st, i) {
              return li('', ico(M.ORG_IC[ORG.points[i].ic]) + '<span><b>' + st.l + '</b>' + st.s + '</span>', ' data-l2pt="' + i + '"');
            })
            .join('') +
          '</ul>' +
          media(s, 'l2-4__media is-solo') +
          '<div class="l2-row r3 is-overlap">' +
          ORG.points
            .map(function (p, i) {
              return ptCard(p, i, 'is-glass');
            })
            .join('') +
          '</div>' +
          ctaRow(ORG_CTA)
      );
    },
    /* 5 · Editorial — Mockup, darunter Punkte nummeriert und Beispiel-Pfad */
    function (s) {
      return dark(
        s,
        media(s, 'l2-4__media is-solo') +
          '<div class="l2-2col"><div>' +
          colH('So ist alles geordnet') +
          '<ol class="l2-nrow is-dark">' +
          ORG.points
            .map(function (p, i) {
              return li('', '<span class="l2-num">' + pad(i) + '</span><div><b>' + p.t + '</b><span>' + p.s + '</span></div>', ' data-l2pt="' + i + '"');
            })
            .join('') +
          '</ol></div><div>' +
          colH('Beispiel: Fach → Thema → Dateien') +
          '<ol class="l2-nrow is-dark">' +
          ORG.steps
            .map(function (st, i) {
              return li('', '<span class="l2-num">' + pad(i) + '</span><div><b>' + st.l + '</b><span>' + st.s + '</span></div>');
            })
            .join('') +
          '</ol></div></div>' +
          ctaRow(ORG_CTA)
      );
    }
  ];

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
    var dots = [].slice.call(fig.querySelectorAll('[data-l2dot]'));
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
  function stored(key) {
    try {
      var v = parseInt(localStorage.getItem('lesify:lan2:' + key + ':c'), 10);
      if (v >= 1 && v <= 5) return v;
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
    el.className = 'l2 is-' + s.tone + (s.flip ? ' is-flip' : '') + (s.fixed ? ' is-plain' : '');
    el.style.setProperty('--l2-a', s.accent);
    if (s.fixed) {
      /* Fächer: Original-Markup + -Design der Startseite (renderOrgFaecher Variante 2 „Ghost") */
      el.innerHTML = '<div class="container">' + M.renderOrgFaecher('2') + '</div>';
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
      if (!s.fixed) state[s.key] = stored(s.key);
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
    return !s.fixed;
  });
  function row(label, key, active) {
    return (
      '<div class="layout-dev-row"><span>' +
      label +
      '</span><div class="layout-dev-seg">' +
      [1, 2, 3, 4, 5]
        .map(function (n) {
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
    var html = '<button type="button" class="layout-dev-title" data-l2min>Lan2 · Inhalt</button>' + row('Alle', 'all', 0);
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
        state[k] = v;
        store(k, v);
        build(sec, v);
        panel.querySelectorAll('[data-l2k="' + k + '"]').forEach(function (x) {
          x.classList.toggle('is-on', +x.getAttribute('data-l2v') === v);
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
    mountDev();
  });
})();
