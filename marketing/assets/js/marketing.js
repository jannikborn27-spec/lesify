/* =========================================================
   Lesify — Marketing / Website
   Vanilla JS, kein Build. Baut Navigation + Footer, steuert
   Scroll-Reveals, Mobile-Menü, Preis-Umschalter und übrige Demo-Formulare
   ohne Backend. Login/Registrierung/Passwort-Reset/Kontakt sind echt
   verdrahtet — siehe assets/js/auth-forms.js und
   Konzept-texts/backend-planning.md §11.
   ========================================================= */
(function () {
  'use strict';

  /* Echtes Lesify-Logo (Marke, currentColor) — deckungsgleich mit
     marketing/assets/img/logo-mark.svg / logo.png. */
  var LOGO_MARK = '<svg viewBox="0 0 1500 1500" fill="currentColor" fill-rule="evenodd" aria-hidden="true"><path d="M623.777344 754.304688C654.527344 537.050781 611.871094-63.605469 419.117188 83.402344 408.363281 91.558594 395.539062 104.1875 386.921875 114.578125 378.734375 124.574219 338.578125 176.144531 353.804688 216.300781 535.375 534.027344 391.363281 1080.253906 197.359375 1038.488281 133.785156 1024.738281 86.429688 952.027344 57.421875 873.621094 56.992188 873.71875 56.535156 873.621094 56.171875 873.71875 63.867188 898.417969 66.792969 906.214844 76.003906 929.890625 100.40625 986.855469 102.972656 992.675781 123.558594 1030.988281 138.753906 1056.804688 159.667969 1090.875 176.242188 1115.773438 364.359375 1363.449219 571.222656 1124.71875 623.777344 754.304688Z"/><path d="M724.445312 264.347656C834.257812 903.878906 559.382812 1436.589844 303.089844 1279.78125 302.566406 1280.34375 302.171875 1281 301.644531 1281.558594 345.285156 1316.417969 383.039062 1343.453125 454.339844 1381.308594L486.308594 1396.929688C924.566406 1563.371094 1056.019531 493.707031 937.164062 199.097656 911.378906 135.066406 843.070312 106.160156 785.023438 134.96875 758.746094 147.957031 715.996094 182.097656 724.445312 264.347656Z"/><path d="M1064.503906 869.148438C1050.460938 942.09375 1032.011719 1011.355469 1009.546875 1074.894531 987.152344 1138.101562 960.777344 1195.984375 930.882812 1246.007812 900.988281 1296.0625 867.539062 1338.257812 830.96875 1371.011719 813.964844 1386.304688 796.699219 1398.933594 779.433594 1409.097656 762.300781 1419.488281 744.871094 1427.085938 727.539062 1432.546875 710.273438 1437.90625 692.972656 1440.800781 675.804688 1441.492188 668.570312 1441.820312 661.5 1441.390625 654.429688 1440.832031 654.363281 1441.160156 654.164062 1441.492188 654.101562 1441.953125 715.335938 1452.574219 737.371094 1455.238281 807.257812 1457.703125 832.019531 1456.914062 865.105469 1456.816406 889.871094 1455.007812 940.1875 1446.753906 1093.28125 1421.957031 1214.601562 1102.484375 1216.507812 1097.453125 1394.070312 600.390625 1247.128906 514.492188 1229.597656 504.230469 1202.960938 500.316406 1183.851562 505.214844 1161.324219 510.90625 1107.355469 535.605469 1093.050781 641.371094 1088.28125 719.808594 1078.578125 796.335938 1064.503906 869.148438Z"/><path d="M1323.722656 1058.253906C1312.605469 1090.746094 1300.4375 1121.824219 1287.25 1151.292969 1274.128906 1180.5625 1259.953125 1208.152344 1244.824219 1233.839844 1229.761719 1259.425781 1213.679688 1283.007812 1196.777344 1304.316406 1179.808594 1325.660156 1162.082031 1344.769531 1143.464844 1361.410156 1135.113281 1368.777344 1126.695312 1375.585938 1118.308594 1381.734375 1109.921875 1387.984375 1101.5 1393.574219 1092.949219 1398.375 1091.011719 1399.59375 1089.003906 1400.382812 1087.03125 1401.597656 1090.253906 1401.695312 1180.792969 1366.738281 1236.539062 1334.902344 1271.101562 1315.234375 1306.390625 1295.570312 1358.289062 1232.457031 1373.910156 1213.582031 1388.050781 1191.90625 1401.632812 1169.117188 1415.25 1145.863281 1428.007812 1121.066406 1439.882812 1094.726562 1451.753906 1068.25 1462.707031 1040.328125 1472.769531 1011.058594 1499.96875 912.429688 1442.644531 921.570312 1420.410156 932.65625 1406.894531 939.296875 1359.867188 968.109375 1323.722656 1058.253906Z"/><path d="M307.628906 632.328125C323.875 492.027344 286.714844 106.453125 165.128906 204.128906 158.320312 209.523438 150.296875 217.878906 144.96875 224.71875 139.835938 231.261719 114.84375 265.070312 125.269531 290.625 295.59375 571.878906 126.914062 946.960938 0.789062 630.617188 0.527344 630.617188 0.230469 630.617188 0 630.617188 114.679688 968.566406 268.164062 971.460938 307.628906 632.328125Z"/></svg>';

  var ICON = {
    mark: LOGO_MARK,
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
  };

  /* Drei eigenständige Seiten im Frontend: Home, Über uns, Preise (seit
     2026-09-16 — eigene Route statt Homepage-Anker, siehe UMSETZUNGSPLAN.md
     „Preise-Seite"). FAQ bleibt eine Sektion auf der Startseite (#faq); wie
     zuvor schon die Funktions-Unterseiten (feature-*.html) und der
     Vergleich lebt ihr Inhalt als Abschnitt dort. Das Mega-Menü- und
     Feature-Seiten-Gerüst weiter unten bleibt vorerst inert (kein Nav-
     Eintrag mit .mega, keine Seite mit #feature-page). */
  var NAV_LINKS = [
    { href: '/', label: 'Home', page: 'index' },
    { href: '/preise/', label: 'Preise', page: 'preise' },
    { href: '/ueber-uns/', label: 'Über uns', page: 'ueber-uns' },
    { href: '/#faq', label: 'FAQ' }
  ];

  var FOOTER = [
    { title: 'Produkt', links: [
      { href: '/', label: 'Überblick' },
      { href: '/#kv', label: 'So funktioniert’s' },
      { href: '/preise/', label: 'Preise' },
      { href: '/#faq', label: 'Häufige Fragen' }
    ]},
    { title: 'Unternehmen', links: [
      { href: '/ueber-uns/', label: 'Über uns' },
      { href: '/kontakt/', label: 'Kontakt' },
      { href: '/login/', label: 'Anmelden' }
    ]},
    { title: 'Rechtliches', links: [
      { href: '/impressum/', label: 'Impressum' },
      { href: '/datenschutz/', label: 'Datenschutz' },
      { href: '/agb/', label: 'AGB' }
    ]}
  ];

  var current = document.body.getAttribute('data-page') || '';
  var navMode = document.body.getAttribute('data-nav') || 'full';

  /* Header final = "4a": über dem Hero transparent + Nav-Links in einer
     eingefassten Glas-Spur ("Pills · Track"); ab .is-scrolled dunkle
     Pille (wie das frühere Setup 2). CSS-Rahmen in marketing.css
     (data-hd auf #mkt-nav), Foto-Schleier über data-header auf <body>
     (nicht "2" → Schleier dunkelt wie bisher nach unten ab). Nicht mehr
     im Dev-Panel — Aufruf fest in buildNav(). */
  function applyHeaderVariant(v) {
    var host = document.getElementById('mkt-nav');
    if (host) host.setAttribute('data-hd', v);
    if (document.body) document.body.setAttribute('data-header', v);
  }

  /* ---------- Navigation ---------- */
  function buildNav() {
    var host = document.getElementById('mkt-nav');
    if (!host) return;

    var brand =
      '<a class="brand" href="/" aria-label="Lesify — Startseite">' +
        '<span class="brand__mark">' + ICON.mark + '</span>' +
        '<span class="brand__word">Lesify</span>' +
      '</a>';

    if (navMode === 'minimal') {
      host.className = 'mkt-nav mkt-nav--minimal';
      host.innerHTML =
        '<div class="mkt-nav__inner">' + brand +
          '<a class="mkt-nav__back" href="/">' + ICON.back + ' Zur Website</a>' +
        '</div>';
      return;
    }

    host.className = 'mkt-nav';
    /* final gewählt, nicht mehr umschaltbar — außer /preise/: eigener,
       nicht scrollender Seitenhintergrund, deshalb kein transparent-
       über-Hero/Scroll-Umschalten. Bei der dunklen Einfärbung (v1–v6,
       siehe pricePageColor) bleibt "5" (immer die helle Pille — hell auf
       Schwarz). Bei "7" (helle Startseiten-Optik, weißer Seitenhintergrund)
       stattdessen dauerhaft "4a" + `.is-scrolled` erzwungen (siehe
       priceNavIsLight/onScroll unten) — sieht aus wie der Header der
       Startseite im gescrollten Zustand (dunkle Pille auf Weiß), da diese
       Seite selbst faktisch nie über den Fold hinaus scrollt. */
    applyHeaderVariant(current === 'preise' ? (priceNavIsLight() ? '4a' : '5') : '4a');

    var CARET = '<svg class="mkt-nav__caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>';

    var links = NAV_LINKS.map(function (l) {
      if (l.mega) {
        var active = /^feature-/.test(current) || l.page === current;
        return '<div class="mkt-nav__item mkt-nav__item--mega">' +
          '<button type="button" class="mkt-nav__mega-btn' + (active ? ' is-active' : '') + '" ' +
            'aria-haspopup="true" aria-expanded="false" aria-controls="mkt-mega">' + l.label + CARET + '</button>' +
          '<div class="mkt-mega" id="mkt-mega" role="menu" aria-label="' + l.label + '" hidden>' +
            '<div class="mkt-mega__inner">' +
            l.mega.map(function (f) {
              return '<a class="mkt-mega__link' + (f.page === current ? ' is-active' : '') + '" role="menuitem" href="' + f.href + '">' +
                '<span class="mkt-mega__ico">' + f.icon + '</span>' +
                '<span class="mkt-mega__tx"><b>' + f.label + '</b><span>' + f.desc + '</span></span></a>';
            }).join('') +
            '</div>' +
          '</div>' +
        '</div>';
      }
      return '<a href="' + l.href + '"' + (l.page === current ? ' class="is-active"' : '') + '>' + l.label + '</a>';
    }).join('');

    var sheetLinks = NAV_LINKS.map(function (l) {
      if (l.mega) {
        return '<div class="sheet-acc">' +
          '<button type="button" class="sheet-acc__btn" aria-expanded="false" aria-controls="sheet-acc-panel">' + l.label + CARET + '</button>' +
          '<div class="sheet-acc__panel" id="sheet-acc-panel" hidden>' +
            l.mega.map(function (f) { return '<a href="' + f.href + '">' + f.label + '</a>'; }).join('') +
          '</div>' +
        '</div>';
      }
      return '<a href="' + l.href + '">' + l.label + '</a>';
    }).join('');

    host.innerHTML =
      '<div class="mkt-nav__inner">' +
        brand +
        '<nav class="mkt-nav__links">' + links + '</nav>' +
        '<div class="mkt-nav__actions">' +
          '<a class="mkt-nav__link" href="/login/">Anmelden</a>' +
          '<a class="btn btn-primary" href="/preise/">Kostenlos starten</a>' +
          '<button class="nav-toggle" type="button" aria-label="Menü öffnen" aria-expanded="false">' + ICON.menu + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="mkt-nav__sheet" id="nav-sheet">' +
        sheetLinks +
        '<div class="sheet-actions">' +
          '<a class="btn btn-secondary btn-block" href="/login/">Anmelden</a>' +
          '<a class="btn btn-primary btn-block" href="/preise/">Kostenlos starten</a>' +
        '</div>' +
      '</div>';

    var toggle = host.querySelector('.nav-toggle');
    var sheet = host.querySelector('#nav-sheet');
    function setSheet(open) {
      sheet.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.innerHTML = open ? ICON.close : ICON.menu;
      document.body.style.overflow = open ? 'hidden' : '';
    }
    toggle.addEventListener('click', function () { setSheet(!sheet.classList.contains('is-open')); });
    sheet.addEventListener('click', function (e) { if (e.target.tagName === 'A') setSheet(false); });
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') setSheet(false); });

    initMegaMenu(host);
    initSheetAccordion(sheet);

    /* Dunkle Pille ist der Standard: .is-scrolled dauerhaft, kein Scroll-Umschalten. */
    host.classList.add('is-scrolled');
  }

  /* ---------- Header-Mega-Menü "Funktionen" ----------
     Desktop: Hover mit kurzer Verzögerung öffnet das Panel, Klick /
     Enter / Pfeil-ab schalten es um, Escape schließt und gibt den Fokus
     zurück. Klick außerhalb, Route-Wechsel und Tab aus dem Menü heraus
     schließen ebenfalls. Touch: kein Hover — Klick schaltet um.
     Mobil läuft die Auswahl über das Sheet-Akkordeon (initSheetAccordion). */
  function initMegaMenu(host) {
    var item = host.querySelector('.mkt-nav__item--mega');
    if (!item) return;
    var btn = item.querySelector('.mkt-nav__mega-btn');
    var panel = item.querySelector('#mkt-mega');
    if (!btn || !panel) return;
    var hoverTimer = null, closeTimer = null, hideTimer = null;
    var canHover = !(window.matchMedia && window.matchMedia('(hover: none)').matches);

    function open(focusFirst) {
      clearTimeout(closeTimer); clearTimeout(hideTimer);
      if (panel.hidden) { panel.hidden = false; panel.offsetHeight; /* reflow für Transition */ }
      item.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      document.addEventListener('click', onDocClick, true);
      document.addEventListener('keydown', onKeydown, true);
      if (focusFirst) {
        var first = panel.querySelector('a');
        if (first) first.focus();
      }
    }
    function close(returnFocus) {
      clearTimeout(hoverTimer); clearTimeout(closeTimer);
      if (!item.classList.contains('is-open') && panel.hidden) return;
      item.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      document.removeEventListener('click', onDocClick, true);
      document.removeEventListener('keydown', onKeydown, true);
      clearTimeout(hideTimer);
      hideTimer = setTimeout(function () {
        if (!item.classList.contains('is-open')) panel.hidden = true;
      }, 220);
      if (returnFocus) btn.focus();
    }
    function toggle() { item.classList.contains('is-open') ? close(false) : open(false); }
    function onDocClick(e) { if (!item.contains(e.target)) close(false); }
    function onKeydown(e) {
      if (e.key === 'Escape') { close(true); return; }
      if (e.key === 'Tab') {
        setTimeout(function () { if (!item.contains(document.activeElement)) close(false); }, 0);
      }
    }

    btn.addEventListener('click', function (e) { e.preventDefault(); toggle(); });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || (e.key === 'Enter' && !item.classList.contains('is-open'))) {
        e.preventDefault(); open(true);
      }
    });

    if (canHover) {
      item.addEventListener('mouseenter', function () {
        clearTimeout(closeTimer);
        hoverTimer = setTimeout(function () { open(false); }, 120);
      });
      item.addEventListener('mouseleave', function () {
        clearTimeout(hoverTimer);
        closeTimer = setTimeout(function () { close(false); }, 180);
      });
    }
    /* Tab aus dem geöffneten Menü heraus schließt (kein Fokus-Trap).
       Bewusst KEIN focusin-öffnet: das würde beim Fokus-Zurückgeben
       nach Escape sofort wieder aufklappen. Öffnen per Klick/Enter/ArrowDown. */
    item.addEventListener('focusout', function () {
      setTimeout(function () {
        if (!item.contains(document.activeElement) && item.classList.contains('is-open')) close(false);
      }, 0);
    });

    /* Route-Wechsel: Auswahl im Panel bzw. Verlassen der Seite schließt. */
    panel.addEventListener('click', function (e) { if (e.target.closest('a')) close(false); });
    window.addEventListener('pagehide', function () { close(false); });
    window.addEventListener('hashchange', function () { close(false); });
  }

  /* Mobile: "Funktionen" als aufklappbares Akkordeon im Sheet. */
  function initSheetAccordion(sheet) {
    if (!sheet) return;
    var accBtn = sheet.querySelector('.sheet-acc__btn');
    var accPanel = sheet.querySelector('.sheet-acc__panel');
    if (!accBtn || !accPanel) return;
    accBtn.addEventListener('click', function () {
      var open = accBtn.getAttribute('aria-expanded') === 'true';
      accBtn.setAttribute('aria-expanded', String(!open));
      accBtn.classList.toggle('is-open', !open);
      accPanel.hidden = open;
    });
  }

  /* ---------- Footer ---------- */
  function buildFooter() {
    var host = document.getElementById('mkt-footer');
    if (!host) return;
    host.className = 'site-footer';
    var cols = FOOTER.map(function (c) {
      return '<div class="site-footer__col"><h4>' + c.title + '</h4>' +
        c.links.map(function (l) { return '<a href="' + l.href + '">' + l.label + '</a>'; }).join('') +
        '</div>';
    }).join('');

    host.innerHTML =
      '<div class="container">' +
        '<div class="site-footer__grid">' +
          '<div class="site-footer__brand">' +
            '<a class="brand" href="/">' +
              '<span class="brand__mark">' + ICON.mark + '</span>' +
              '<span class="brand__word">Lesify</span>' +
            '</a>' +
            '<p>Der KI-Lernbegleiter für die 8. und 9. Klasse. Jedes Fach erklärt, Lernzettel automatisch, Testklausuren mit echter Notenprognose.</p>' +
          '</div>' +
          cols +
        '</div>' +
        '<div class="site-footer__bottom">' +
          '<span>&copy; ' + new Date().getFullYear() + ' Lesify. Prototyp — Demo-Inhalte, kein echtes Produkt.</span>' +
          '<span>Kein Ersatz für Förderunterricht bei anhaltenden Lernschwierigkeiten.</span>' +
        '</div>' +
      '</div>';
  }

  /* ---------- Reveal on scroll ----------
     Bewegungs-Variante (Rise / Fade / Blur / Clip …) global über
     data-reveal-anim auf <html>. Final gewählt: 6 · Zoom
     (applyRevealAttr('6') in DOMContentLoaded), kein Dev-Panel mehr —
     REVEAL_VARIANTS/revealVariant()/applyRevealVariant() bleiben als
     tote Helfer. Das CSS dazu steht in marketing.css unter
     "Reveal-Varianten". */
  var REVEAL_VARIANTS = [
    ['1', 'Rise'], ['2', 'Fade'], ['3', 'Weit'], ['4', 'Links'], ['5', 'Rechts'],
    ['6', 'Zoom'], ['7', 'Blur'], ['8', 'Clip'], ['9', 'Kippen'], ['10', 'Feder']
  ];
  function revealVariant() { return pickVar('lesify:reveal:v', /^([1-9]|10)$/, '1'); }
  function applyRevealAttr(v) {
    if (v && v !== '1') document.documentElement.setAttribute('data-reveal-anim', v);
    else document.documentElement.removeAttribute('data-reveal-anim');
  }
  /* Umschalten zur Laufzeit: Attribut setzen, alle bereits eingeblendeten
     Elemente zurücksetzen und die Beobachtung neu aufsetzen, damit die
     neue Bewegung sofort sichtbar wird. */
  function applyRevealVariant(v) {
    applyRevealAttr(v);
    document.querySelectorAll('[data-reveal].is-in').forEach(function (el) {
      el.classList.remove('is-in');
      el.style.removeProperty('--reveal-delay');
    });
    void document.documentElement.offsetWidth; /* Reflow → Startzustand greift */
    initReveal();
  }

  var revealIO = null;
  function initReveal() {
    if (revealIO) { revealIO.disconnect(); revealIO = null; }
    var els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;

    function reveal(el) {
      var delay = el.getAttribute('data-reveal-delay');
      if (delay) el.style.setProperty('--reveal-delay', delay + 'ms');
      el.classList.add('is-in');
    }

    if (!('IntersectionObserver' in window)) {
      els.forEach(reveal);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    revealIO = io;
    els.forEach(function (el) { io.observe(el); });

    // Failsafe: alles, was beim Laden ohnehin sichtbar ist, sofort zeigen —
    // unabhängig davon, ob der IntersectionObserver-Callback feuert.
    function revealInView() {
      var vh = window.innerHeight || document.documentElement.clientHeight;
      els.forEach(function (el) {
        if (el.classList.contains('is-in')) return;
        var r = el.getBoundingClientRect();
        if (r.top < vh * 0.96 && r.bottom > 0) { reveal(el); io.unobserve(el); }
      });
    }
    requestAnimationFrame(revealInView);
    window.addEventListener('load', revealInView);
    setTimeout(revealInView, 1200);

    // Zusätzliche Absicherung für lange, komplett aus [data-reveal] gebaute
    // Seiten (Feature-Unterseiten): fällt der IntersectionObserver aus
    // irgendeinem Grund aus, holt ein gedrosselter Scroll-Listener nach.
    var scrollRaf = 0;
    function onScrollReveal() {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(function () {
        scrollRaf = 0;
        revealInView();
        if (!document.querySelector('[data-reveal]:not(.is-in)')) {
          window.removeEventListener('scroll', onScrollReveal);
        }
      });
    }
    window.addEventListener('scroll', onScrollReveal, { passive: true });
  }

  /* ---------- Sichtbarkeits-Gate fuer Auto-Play-Demos ----------
     Verhindert, dass Chat-/Lernplan-/Org-Demos schon beim Laden der Seite
     lostippen/-blaettern, bevor die Sektion ueberhaupt sichtbar ist — ruft
     cb erst auf, wenn el zu >=30% im Viewport ist, dann einmalig. */
  function onVisible(el, cb) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { cb(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        io.disconnect();
        cb();
      });
    }, { threshold: 0.3 });
    io.observe(el);
  }

  /* Reveal für ALLE Sections, nicht nur den Hero: nach jedem (Neu-)Bau
     einer Section markiert dies deren oberste Sinn-Blöcke (direkte
     Kinder von .container) mit [data-reveal] + gestaffeltem
     data-reveal-delay und ruft initReveal() neu auf, damit der Observer
     auch die neuen Elemente kennt. Aufruf in labSectionApi.build() und
     buildChatSection() — deckt tldr/kv/chat/org/cmp/price/parent/faq/cta ab. */
  function markRevealBlocks(root) {
    if (!root) return;
    Array.prototype.forEach.call(root.querySelectorAll('.container'), function (c) {
      var i = 0;
      Array.prototype.forEach.call(c.children, function (el) {
        if (el.hasAttribute('data-reveal') || el.tagName === 'STYLE' || el.tagName === 'SCRIPT') { i++; return; }
        el.setAttribute('data-reveal', '');
        el.setAttribute('data-reveal-delay', String(Math.min(i, 4) * 90));
        i++;
      });
    });
    initReveal();
  }

  /* ---------- Auto-Stagger für Gruppen ---------- */
  function autoStagger() {
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      var step = parseInt(group.getAttribute('data-stagger'), 10) || 80;
      Array.prototype.forEach.call(group.children, function (child, i) {
        if (!child.hasAttribute('data-reveal')) child.setAttribute('data-reveal', '');
        child.setAttribute('data-reveal-delay', String(i * step));
      });
    });
  }

  /* ---------- Preis-Umschalter ---------- */
  function initPricing() {
    var toggle = document.querySelector('[data-price-toggle]');
    if (!toggle) return;
    var buttons = toggle.querySelectorAll('button');
    function apply(mode) {
      buttons.forEach(function (b) { b.classList.toggle('is-active', b.getAttribute('data-mode') === mode); });
      document.querySelectorAll('[data-monthly]').forEach(function (el) {
        el.innerHTML = mode === 'yearly' ? el.getAttribute('data-yearly') : el.getAttribute('data-monthly');
      });
      document.querySelectorAll('[data-normal-monthly]').forEach(function (el) {
        el.innerHTML = mode === 'yearly' ? el.getAttribute('data-normal-yearly') : el.getAttribute('data-normal-monthly');
      });
      document.querySelectorAll('[data-note-monthly]').forEach(function (el) {
        el.textContent = mode === 'yearly' ? el.getAttribute('data-note-yearly') : el.getAttribute('data-note-monthly');
      });
    }
    buttons.forEach(function (b) {
      b.addEventListener('click', function () { apply(b.getAttribute('data-mode')); });
    });
    apply('monthly');
  }

  /* ---------- Zähler-Animation ---------- */
  function initCounters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function finalText(el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var suffix = el.getAttribute('data-count-suffix') || '';
      return (target % 1 === 0 ? Math.round(target) : target.toFixed(1)) + suffix;
    }
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.textContent = finalText(el); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var target = parseFloat(el.getAttribute('data-count'));
        var suffix = el.getAttribute('data-count-suffix') || '';
        var dur = 1100, start = performance.now();
        function tick(now) {
          var p = Math.min(1, (now - start) / dur);
          var eased = 1 - Math.pow(1 - p, 3);
          var val = target * eased;
          el.textContent = (target % 1 === 0 ? Math.round(val) : val.toFixed(1)) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Toast ---------- */
  function toast(msg) {
    var stack = document.querySelector('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      // Screenreader-Ansage ohne Fokusklau (analog app/assets/js/app.js).
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    var t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = ICON.check + '<span>' + msg + '</span>';
    stack.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('is-visible'); });
    setTimeout(function () {
      t.classList.remove('is-visible');
      setTimeout(function () { t.remove(); }, 300);
    }, 3600);
  }

  /* ---------- Demo-Formulare ---------- */
  function initForms() {
    document.querySelectorAll('form[data-demo]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var msg = form.getAttribute('data-demo') || 'Gesendet — im Prototyp ohne Backend.';
        toast(msg);
        form.reset();
      });
    });
  }

  /* ---------------------------------------------------------
     Hero-Stage (index.html) — die Info-Karte der Foto-Slideshow,
     die über dem diagonal beschnittenen Foto (.hv9__panel,
     data-hero-bg="9") liegt. Diagonal-Schnitt / Scrim /
     Hintergrundfarben bleiben unverändert; das Foto ist jetzt
     eine 4er-Slideshow (.hv9__panel > .hv9__photo,
     lesi-mgs-nw-hero/69–72), die per setHeroPhoto() synchron zur
     aktiven Karten-Folie durchgeblendet wird.
       Karten-Designs (heroC2/2b/3/3b) werden in #hero-stage bzw.
       (2b) ins .hv9__panel gerendert, per Dev-Panel
       (localStorage['lesify:herocard:v']) umgeschaltet.
       initHeroSlides() steuert jede Gruppe generisch:
         [data-hero-slides]   eine Karten-Gruppe
         [data-hs-slide]      eine Folie (Feature)
         [data-hs-dots]       optionale Punkt-Navi (wird befüllt)
         [data-hs-prev/next]  optionale Pfeile
         [data-hs-count]      "01".."04" der aktiven Folie
       Zusätzlich setzt show() --hs-accent (Fach-Farbe) auf die
       Gruppe, damit jedes Design die Akzentfarbe nutzen kann.
     --------------------------------------------------------- */
  var CHEVRON_L = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';
  var CHEVRON_R = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>';

  function arrowBtns() {
    return '<button type="button" class="hs-arrow" data-hs-prev aria-label="Vorherige Funktion">' + CHEVRON_L + '</button>' +
      '<button type="button" class="hs-arrow" data-hs-next aria-label="Nächste Funktion">' + CHEVRON_R + '</button>';
  }
  var HS_NAV = '<div class="hs-nav"><button type="button" class="hs-arrow" data-hs-prev aria-label="Vorherige Funktion">' + CHEVRON_L + '</button>' +
    '<div class="hs-dots" data-hs-dots></div>' +
    '<button type="button" class="hs-arrow" data-hs-next aria-label="Nächste Funktion">' + CHEVRON_R + '</button></div>';

  function pad(i) { return ('0' + (i + 1)).slice(-2); }

  var HERO_FEATURES = [
    { key: 'klausurvorbereitung', label: 'Klausurvorbereitung', url: 'app.lesify.de/lernplan', accent: 'var(--fach-teal)',
      title: 'mit Lernplan und Testklausuren',
      desc: 'Ein Testklausur-Ergebnis wird automatisch zum Tagesplan für die Woche vor der nächsten Klausur.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V8L14 3Z"></path><path d="m9 14 2 2 4-4"></path></svg>' },
    { key: 'chat', label: 'KI Chat', url: 'app.lesify.de/ki-chat', accent: 'var(--fach-blue)',
      title: 'Verständlich, sicher, für Schüler entwickelt',
      desc: 'Erklären, üben, mündlich abfragen, Hausaufgaben besprechen: vier Modi, passend zu Fach und Thema.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5C4 4.67 4.67 4 5.5 4h13c.83 0 1.5.67 1.5 1.5v10c0 .83-.67 1.5-1.5 1.5H9l-4 3.5v-3.5H5.5C4.67 16.5 4 15.83 4 15V5.5Z"></path></svg>' },
    { key: 'struktur', label: 'Organisation', url: 'app.lesify.de/faecher', accent: 'var(--fach-violet)',
      title: 'immer nach Fach und Thema geordnet',
      desc: 'Jedes Fach in Themen sortiert, jedes Thema mit eigenen Chats, Lernzetteln und Dateien am gleichen Ort.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 8l9 5 9-5-9-5Z"></path><path d="M3 12l9 5 9-5"></path></svg>' },
    { key: 'lernzettel', label: 'Lernzettel', url: 'app.lesify.de/lernzettel', accent: 'var(--fach-amber)',
      title: 'die wichtigsten Infos automatisch notiert',
      desc: 'Vor jeder Klausur fasst ein Lernzettel alle wichtigen Themen kompakt auf einem Blatt zusammen.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"></rect><line x1="16" y1="3" x2="16" y2="7"></line><line x1="8" y1="3" x2="8" y2="7"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>' }
  ];

  function hsAttrs(f) {
    return 'data-hs-slide data-hs-label="' + f.label + '" data-hs-url="' + f.url + '" ' +
      'data-hs-title="' + f.title + '" data-hs-desc="' + f.desc + '" data-hs-accent="' + f.accent + '"';
  }
  function hsMap(fn) { return HERO_FEATURES.map(fn).join(''); }
  function hsWrap(n, inner) {
    return '<div class="hs-stage hs-stage--c' + n + '" data-hero-slides="' + n + '"' +
      (n === '2' ? '' : ' hidden') + '>' + inner + '</div>';
  }

  /* --- 2 · Lower-Third: schmale Leiste am unteren Fotorand --- */
  function heroC2() {
    return hsWrap('2', '<div class="hs-card hs-c2"><span class="hs-progress"></span><div class="hs-row">' +
      hsMap(function (f) {
        return '<div ' + hsAttrs(f) + '><span class="hs-ico">' + f.icon + '</span>' +
          '<span class="hs-txt"><span class="hs-eyebrow">' + f.label + '</span><h3>' + f.title + '</h3></span></div>';
      }) + '<div class="hs-nav">' + arrowBtns() + '</div></div></div>');
  }

  /* --- 2b · Lower-Third im Foto-Panel: Leiste am absoluten unteren Bildrand,
     genauso breit wie das Foto und vom diagonalen Weiß-Schnitt beschnitten
     (liegt im .hv9__panel, z-index zwischen Foto und Weiß). --- */
  function heroC2b() {
    return hsWrap('2b', '<div class="hs-card hs-c2 hs-c2--bleed"><span class="hs-progress"></span><div class="hs-row">' +
      hsMap(function (f, i) {
        return '<div ' + hsAttrs(f) + '><span class="hs-ico">' + f.icon + '</span>' +
          '<span class="hs-txt"><span class="hs-eyebrow">' + pad(i) + ' · ' + f.label + '</span><h3>' + f.title + '</h3></span></div>';
      }) + '<div class="hs-dots" data-hs-dots></div>' +
      '<div class="hs-nav">' + arrowBtns() + '</div></div></div>');
  }

  /* --- 3 · Bare: Text ohne Karte direkt auf dem Scrim --- */
  function heroC3() {
    return hsWrap('3', '<div class="hs-card hs-c3">' + hsMap(function (f, i) {
      return '<div ' + hsAttrs(f) + '><span class="hs-eyebrow">' + pad(i) + ' — ' + f.label + '</span>' +
        '<h3>' + f.title + '</h3><p>' + f.desc + '</p></div>';
    }) + '<div class="hs-nav hs-nav--between"><span class="hs-count"><b data-hs-count>01</b> / ' + pad(HERO_FEATURES.length - 1) + '</span>' +
      '<span class="hs-arrows">' + arrowBtns() + '</span></div></div>');
  }

  /* --- 3b · Bare · Clean: gleiche Typo, aber unten-links verankert, engere
     Spalte, weicher Cross-Fade beim Folienwechsel statt hartem Umschalten --- */
  function heroC3b() {
    return hsWrap('3b', '<div class="hs-card hs-c3 hs-c3--clean">' + hsMap(function (f, i) {
      return '<div ' + hsAttrs(f) + '><span class="hs-eyebrow">' + pad(i) + ' — ' + f.label + '</span>' +
        '<h3>' + f.title + '</h3><p>' + f.desc + '</p></div>';
    }) + '<div class="hs-nav hs-nav--between"><div class="hs-dots" data-hs-dots></div>' +
      '<span class="hs-arrows">' + arrowBtns() + '</span></div></div>');
  }

  function buildHeroStage() {
    var host = document.getElementById('hero-stage');
    if (!host) return;
    host.innerHTML = [heroC2(), heroC3(), heroC3b()].join('');
    // 2b lebt im Foto-Panel, damit der diagonale Weiß-Schnitt es beschneidet
    // und es zwischen Foto und Weiß liegt (z-index).
    var panel = document.querySelector('.hv9__panel');
    if (panel && !panel.querySelector('[data-hero-slides="2b"]')) {
      panel.insertAdjacentHTML('beforeend', heroC2b());
    }
    applyHeroCardVariant('2b'); /* final gewählt (Lower-Third im Foto), nicht mehr umschaltbar */
  }

  /* =========================================================
     Hero-Stage v2 (Prototyp, per Dev-Panel "Hero-Stage") — statt
     Vollbild-Foto + diagonalem Schnitt: schlichter weißer Section-
     Hintergrund, darauf dasselbe freigestellte Mockup (assets/img/
     hero-nw/) in drei Ständen — Hero-background-image.png (leerer,
     weißer Bildschirm) liegt DAUERHAFT als unterste Ebene, NIE
     ausgeblendet, damit Gerät/Tastatur/Pencil nie flackern. Darüber
     blenden hero-mg1.png/hero-mg2.png (alternierend Folie 1+3 = mg1,
     2+4 = mg2 — dasselbe Mockup, nur mit Bildschirminhalt) per
     Opacity-Crossfade ein/aus — da Gerät/Tastatur/Pencil in allen drei
     PNGs pixelgleich sind, wirkt nur der Bildschirminhalt animiert.
     Liegt wie .hv9__panel DIREKT in .hv9 (nicht im Grid) — gleiche
     Größe/Position (rechte Hälfte, volle Section-Höhe, bis zum
     Viewport-Rand), nur ohne Diagonal-Schnitt. Karten-Inhalt identisch
     zur aktuellen Lower-Third-Karte (heroC2b): Icon + Eyebrow + Titel,
     KEIN zusätzlicher Fließtext. EIN gemeinsamer
     [data-hero-slides="v2"]-Block (heroV2Stage) fest als
     Variante v2.5 ([data-v2-text="5"], siehe landing-lab.css).
     ========================================================= */
  function heroV2Photos() {
    var bg = '<span class="hv9v2__bg" style="background-image:url(\'assets/img/hero-nw/Hero-background-image.png\')"></span>';
    var screens = HERO_FEATURES.map(function (f, i) {
      var src = 'assets/img/hero-nw/hero-mg' + (i % 2 === 0 ? '1' : '2') + '.png';
      return '<span class="hv9v2__photo' + (i === 0 ? ' is-on' : '') + '" style="background-image:url(\'' + src + '\')"></span>';
    }).join('');
    return bg + screens;
  }
  function heroV2Slide(f, i) {
    return '<div data-hs-slide data-hs-label="' + f.label + '" data-hs-accent="' + f.accent + '" data-hs-n="' + pad(i) + '">' +
      '<span class="hv9v2__icon">' + f.icon + '</span>' +
      '<span class="hv9v2__eyebrow">' + pad(i) + ' — ' + f.label + '</span>' +
      '<h3 class="hv9v2__title">' + f.title + '</h3>' +
    '</div>';
  }
  function heroV2Stage() {
    return '<div class="hv9v2" data-hero-slides="v2" data-v2-text="5" aria-hidden="true">' +
      heroV2Photos() +
      '<div class="hv9v2__card"><span class="hs-progress"></span>' +
        '<span class="hv9v2__logo" aria-hidden="true">' + LOGO_MARK + '</span>' +
        hsMap(heroV2Slide) +
        '<div class="hv9v2__nav hs-nav hs-nav--between">' +
          '<span class="hs-count"><b data-hs-count>01</b> / ' + pad(HERO_FEATURES.length - 1) + '</span>' +
          '<div class="hs-dots" data-hs-dots></div>' +
          '<span class="hs-arrows">' + arrowBtns() + '</span>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  function buildHeroStageV2() {
    var panel = document.querySelector('.hv9__panel');
    if (!panel || document.querySelector('.hv9v2')) return;
    panel.insertAdjacentHTML('afterend', heroV2Stage());
    applyHeroStage();
  }

  /* Foto-Ebenen (.hv9__panel > .hv9__photo, lesi-mgs-nw-hero/69–72,
     UND .hv9v2__photo, hero-nw/hero-mg1/2) synchron zur aktiven
     Karten-Folie ein-/ausblenden — welche Gruppe sichtbar ist,
     entscheidet applyHeroStage()/[hidden]. Beide Gruppen bekommen
     denselben Folien-Index, aber unabhängig voneinander (2 getrennte
     4er-Sets, kein gemeinsamer Modulo-Pool).
     v1 (.hv9__photo) blendet weiterhin gleichzeitig über (Crossfade,
     ein echtes Foto ersetzt das andere). v2 (.hv9v2__photo) soll wie
     ein Bildschirm-Wechsel wirken: erst der alte Screen 200ms
     ausblenden, ERST DANACH der neue 200ms einblenden (nacheinander,
     nicht überlappend) — siehe setHeroPhotoV2. */
  var heroPhotoGroups = null;
  function setHeroPhoto(i) {
    if (heroPhotoGroups === null) {
      heroPhotoGroups = [
        Array.prototype.slice.call(document.querySelectorAll('.hv9__panel .hv9__photo')),
        Array.prototype.slice.call(document.querySelectorAll('.hv9v2__photo'))
      ];
    }
    var v1Group = heroPhotoGroups[0];
    if (v1Group.length) {
      var n1 = v1Group.length, idx1 = ((i % n1) + n1) % n1;
      v1Group.forEach(function (p, pi) { p.classList.toggle('is-on', pi === idx1); });
    }
    setHeroPhotoV2(i);
  }

  /* Sequentielles Aus-/Einblenden statt Crossfade: den bisherigen
     Screen zuerst 200ms ausblenden lassen (CSS-Transition auf
     .hv9v2__photo, siehe landing-lab.css), ERST NACH Ablauf dieser
     200ms den neuen Screen einblenden (wieder 200ms) — dazwischen
     sind kurz alle Screens unsichtbar und nur .hv9v2__bg (der leere,
     dauerhafte Bildschirm) ist zu sehen. Bricht einen noch laufenden
     Wechsel sauber ab, falls Folien schneller weiterklicken als der
     Timer läuft. */
  var heroV2FadeTimer = null;
  function setHeroPhotoV2(i) {
    var group = heroPhotoGroups[1];
    if (!group.length) return;
    var n = group.length, idx = ((i % n) + n) % n;
    var target = group[idx];
    if (target.classList.contains('is-on')) return;
    if (heroV2FadeTimer) { clearTimeout(heroV2FadeTimer); heroV2FadeTimer = null; }
    group.forEach(function (p) { p.classList.remove('is-on'); });
    heroV2FadeTimer = setTimeout(function () {
      target.classList.add('is-on');
      heroV2FadeTimer = null;
    }, 200);
  }

  function initHeroSlides() {
    var groups = document.querySelectorAll('[data-hero-slides]');
    if (!groups.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    groups.forEach(function (group) {
      var slides = Array.prototype.slice.call(group.querySelectorAll('[data-hs-slide]'));
      if (!slides.length) return;
      var dotsHost = group.querySelector('[data-hs-dots]');
      var counter = group.querySelector('[data-hs-count]');
      var progressBar = group.querySelector('.hs-progress');
      var idx = 0, timer = null;

      /* Fortschrittsbalken neu starten — sonst läuft die reine CSS-Loop
         weiter und ist nach Klick auf die Pfeile/Punkte nicht mehr im
         Takt der Folie. */
      function armProgress() {
        if (!progressBar || reduce) return;
        progressBar.style.animation = 'none';
        void progressBar.offsetWidth; /* Reflow erzwingen */
        progressBar.style.animation = '';
        progressBar.style.animationPlayState = 'running';
      }
      function pauseProgress() {
        if (progressBar) progressBar.style.animationPlayState = 'paused';
      }

      if (dotsHost) {
        dotsHost.innerHTML = slides.map(function (s, i) {
          var label = s.getAttribute('data-hs-label') || ('Folie ' + (i + 1));
          var accent = s.getAttribute('data-hs-accent') || '';
          return '<button type="button" data-i="' + i + '" aria-label="' + label + ' anzeigen"' +
            (accent ? ' style="--hs-accent:' + accent + '"' : '') + '>' +
            /* nur sichtbar, wenn eine Design-Variante die Punkte als
               Pillen/Tabs mit Text zeigt (siehe .hs-dot-label in
               landing-lab.css) — sonst per CSS ausgeblendet. */
            '<span class="hs-dot-label">' + label + '</span></button>';
        }).join('');
      }
      var dots = dotsHost ? Array.prototype.slice.call(dotsHost.children) : [];

      function show(i) {
        idx = (i + slides.length) % slides.length;
        var active = slides[idx];
        slides.forEach(function (s, si) { s.classList.toggle('is-active', si === idx); });
        dots.forEach(function (d, di) { d.classList.toggle('is-active', di === idx); });
        var accent = active ? (active.getAttribute('data-hs-accent') || '') : '';
        if (active) group.style.setProperty('--hs-accent', accent);
        if (counter) counter.textContent = pad(idx);
        if (group.offsetParent !== null) {
          setHeroPhoto(idx);
          /* Akzent der aktiven Folie zusätzlich auf die Section legen, damit
             die Auszeichnung von <em>Nachhilfe</em> (h1 em::after) in
             Hero-Farbe v1 mit der Karten-/Slider-Farbe mitläuft. */
          var sec = group.closest('.hv9');
          if (sec) sec.style.setProperty('--hero-accent', accent);
        }
        armProgress();
      }

      function next() { show(idx + 1); }
      function prev() { show(idx - 1); }

      Array.prototype.forEach.call(group.querySelectorAll('[data-hs-prev]'), function (b) {
        b.addEventListener('click', function () { prev(); restart(); });
      });
      Array.prototype.forEach.call(group.querySelectorAll('[data-hs-next]'), function (b) {
        b.addEventListener('click', function () { next(); restart(); });
      });
      dots.forEach(function (d) {
        d.addEventListener('click', function () { show(parseInt(d.getAttribute('data-i'), 10)); restart(); });
      });

      function stop() {
        if (timer) { clearInterval(timer); timer = null; }
        pauseProgress();
      }
      function start() {
        if (reduce) return;
        stop();
        armProgress();
        timer = setInterval(function () {
          if (group.offsetParent !== null) next();
        }, 5200);
      }
      function restart() { start(); }

      /* Bewusst KEIN Pausieren beim Hovern/Fokussieren der Karte oder der
         Pfeile — die Slideshow läuft durchgehend weiter (ein Klick auf die
         Pfeile/Punkte setzt den Takt über restart() nur neu). Nur bei
         verstecktem Tab anhalten. */
      document.addEventListener('visibilitychange', function () {
        if (document.hidden) stop(); else start();
      });

      show(0);
      start();
    });
  }

  /* =========================================================
     KI-Chat-Section (index.html, #chat) — Live-Demo + Erklärung,
     was den Lesify-Chat besonders macht. 5 Layout-Designs
     (chatV1..chatV5), per Dev-Panel umgeschaltet (data-chat auf
     der Section, localStorage['lesify:chat:v']). Alle bauen auf
     denselben Daten (CHAT_PERKS) + derselben scripted Demo
     (CHAT_DEMO, chatDemoMarkup/initChatDemo) auf.
     ========================================================= */
  var CHAT_EYEBROW = 'Der KI-Chat';
  var CHAT_H = 'Für Schüler entwickelt: eine KI, die erklärt statt vorsagt.';
  var CHAT_LEAD = 'Kein Abschreiben, sondern echtes Verstehen: Unsere KI begleitet Ihr Kind durch den Stoff und erklärt, statt Lösungen vorzusagen – so lernt Ihr Kind aus jeder Aufgabe, statt sie nur mit KI zu lösen.';

  var CHAT_PERKS = [
    { title: 'Erklärt den Weg, gibt keine Lösung',
      text: 'Unsere KI zeigt den Lösungsweg und erklärt jeden Schritt. Die fertige Antwort erarbeitet sich Ihr Kind dann aber selbst.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 8l9 5 9-5-9-5Z"></path><path d="M3 12l9 5 9-5"></path></svg>' },
    { title: 'Kennt das Thema',
      text: 'Der Chat weiß, welches Fach und Thema gerade dran ist. So bleiben die Erklärungen immer beim aktuellen Stoff Ihres Kindes.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5C4 4.67 4.67 4 5.5 4h13c.83 0 1.5.67 1.5 1.5v10c0 .83-.67 1.5-1.5 1.5H9l-4 3.5v-3.5H5.5C4.67 16.5 4 15.83 4 15V5.5Z"></path></svg>' },
    { title: 'Sicher und beim Schulstoff',
      text: 'Die KI bleibt beim Schulstoff und auf dem richtigen Niveau. Keine Ablenkung, keine unpassenden Inhalte.',
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4 6v6c0 5 3.4 7.7 8 9 4.6-1.3 8-4 8-9V6l-8-3Z"></path><path d="m9 12 2 2 4-4"></path></svg>' }
  ];

  var CHAT_INTRO_MSG = 'Wähle unten ein Beispiel — oder schreib mir, wo du gerade nicht weiterkommst.';
  var CHAT_DEMO = [
    { mode: 'Erklären', q: 'Erklär mir den Konjunktiv II',
      a: 'Der Konjunktiv II sagt: das ist gerade nicht real — Wunsch, Bedingung oder Höflichkeit.\n\n1) Meistens: „würde" + Infinitiv → „Ich würde gern kommen."\n2) Bei sein / haben / Modalverben gibt es eigene Formen: wäre, hätte, könnte, müsste.\n\nProbier du: Wie sagst du „Ich habe keine Zeit" höflicher im Konjunktiv II?' },
    { mode: 'Üben', q: 'Frag mich Bio ab: Zellatmung',
      a: 'Mach ich. Kurz in eigenen Worten:\n\nWo in der Zelle läuft die Zellatmung hauptsächlich ab — und welches Molekül liefert am Ende die Energie?' },
    { mode: 'Hausaufgaben', q: 'Ich verstehe die pq-Formel nicht',
      a: 'Die pq-Formel löst Gleichungen der Form x² + p·x + q = 0.\n\nDu musst nur p und q richtig einsetzen: x = −p/2 ± √((p/2)² − q).\n\nNimm x² + 6x + 5 = 0 — was ist hier p, und was ist q?' }
  ];
  var CHAT_FALLBACK = 'Gute Frage. Sag mir kurz, wo genau du hängst — an einem Begriff, einem Rechenschritt oder dem ganzen Thema? Dann steige ich genau da ein und frage zwischendurch nach, ob es sitzt.';
  /* Skript der automatischen Live-Demo in der #chat-Section: eine
     zusammenhängende Deutsch-Unterhaltung zum Thema Konjunktiv II
     (passt zum Kontext-Kopf der Demo). Läuft in Schleife, nicht
     vom Nutzer bedienbar (chatAppMarkup({auto:true})). */
  var CHAT_AUTO = [
    { q: 'Erklär mir den Konjunktiv II',
      a: 'Der Konjunktiv II sagt: das ist gerade nicht real — Wunsch, Bedingung oder Höflichkeit.\n\n1) Meistens: „würde" + Infinitiv → „Ich würde gern kommen."\n2) Bei sein / haben / Modalverben gibt es eigene Formen: wäre, hätte, könnte, müsste.\n\nProbier du: Wie sagst du „Ich habe keine Zeit" höflicher im Konjunktiv II?' },
    { q: 'Ich hätte gerade keine Zeit',
      a: 'Genau. „hätte" ist die eigene Konjunktiv-II-Form von „haben" — hier brauchst du kein „würde".\n\nBei den meisten anderen Verben nimmst du „würde" + Infinitiv: „Ich würde dir helfen, wenn ich könnte."\n\nNächste: Wie klingt „Ich komme später" als höfliche Bitte?' },
    { q: 'Ich würde gern etwas später kommen',
      a: 'Perfekt — jetzt hast du alle drei Fälle: Wunsch, Bedingung und Höflichkeit.\n\nFür die Klausur reicht die Regel: eigene Formen für sein, haben und die Modalverben, sonst „würde" + Infinitiv.\n\nSoll ich dir daraus einen kurzen Lernzettel machen?' }
  ];
  var CHAT_SEND_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>';
  var CHAT_MARK = LOGO_MARK;
  var CHAT_NAV = [
    { l: 'Dashboard', i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect></svg>' },
    { l: 'Fächer', on: true, i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 8l9 5 9-5-9-5Z"></path><path d="M3 12l9 5 9-5"></path></svg>' },
    { l: 'KI-Chat', i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5C4 4.67 4.67 4 5.5 4h13c.83 0 1.5.67 1.5 1.5v10c0 .83-.67 1.5-1.5 1.5H9l-4 3.5v-3.5H5.5C4.67 16.5 4 15.83 4 15V5.5Z"></path></svg>' },
    { l: 'Klausuren', i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V8L14 3Z"></path><path d="m9 14 2 2 4-4"></path></svg>' }
  ];

  function chatDemoMarkup(opts) {
    opts = opts || {};
    var cls = 'chat-demo';
    if (opts.size) cls += ' chat-demo--' + opts.size;
    if (opts.frame) cls += ' chat-demo--frame';
    if (opts.app) cls += ' chat-demo--app';
    var chips = CHAT_DEMO.map(function (d, i) {
      return '<button type="button" class="chat-demo__chip" data-demo-i="' + i + '">' + d.q + '</button>';
    }).join('');
    var nav = opts.app ? '<div class="chat-demo__nav"><span class="chat-demo__nav-brand"><span class="chat-demo__mark">' + CHAT_MARK + '</span>Lesify</span>' +
      CHAT_NAV.map(function (n) { return '<a class="' + (n.on ? 'is-on' : '') + '">' + n.i + n.l + '</a>'; }).join('') + '</div>' : '';
    return '<div class="' + cls + '" data-chat-demo>' +
      (opts.frame ? '<div class="chat-demo__bar"><i></i><i></i><i></i><span>app.lesify.de/ki-chat</span></div>' : '') +
      nav +
      '<div class="chat-demo__main">' +
        '<div class="chat-demo__head">' +
          '<span class="chat-demo__id"><span class="chat-demo__mark">' + CHAT_MARK + '</span>' +
            '<span><b>Lesify KI-Chat</b><small>Deutsch · Konjunktiv II</small></span></span>' +
          '<span class="chat-demo__mode" data-demo-mode>Erklären</span>' +
        '</div>' +
        '<div class="chat-demo__log" data-demo-log></div>' +
        '<div class="chat-demo__foot">' +
          '<div class="chat-demo__chips">' + chips + '</div>' +
          '<form class="chat-demo__input" data-demo-form>' +
            '<input type="text" placeholder="Frag etwas zum Thema…" data-demo-field aria-label="Nachricht an den KI-Chat">' +
            '<button type="submit" class="chat-demo__send" aria-label="Senden">' + CHAT_SEND_ICON + '</button>' +
          '</form>' +
          '<p class="chat-demo__note">Demo — Beispielantworten, kein echter Chat.</p>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function initChatDemo(root) {
    var box = root.querySelector('[data-chat-demo]');
    if (!box) return null;
    var log = box.querySelector('[data-demo-log]');
    var form = box.querySelector('[data-demo-form]');
    var field = box.querySelector('[data-demo-field]');
    var modeEl = box.querySelector('[data-demo-mode]');
    var auto = box.hasAttribute('data-chat-auto');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var busy = false, typeTimer = null, pending = null;

    function bubble(role, text) {
      var el = document.createElement('div');
      el.className = 'chat-demo__msg chat-demo__msg--' + role;
      if (role === 'ai') {
        el.innerHTML = '<span class="chat-demo__ava">' + CHAT_MARK + '</span><span class="chat-demo__txt"></span>';
        el.querySelector('.chat-demo__txt').textContent = text;
      } else {
        el.textContent = text;
      }
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
      return el;
    }
    function typeInto(el, text, done) {
      var target = el.querySelector('.chat-demo__txt') || el;
      if (reduce) { target.textContent = text; log.scrollTop = log.scrollHeight; done(); return; }
      var i = 0;
      (function step() {
        target.textContent = text.slice(0, i);
        log.scrollTop = log.scrollHeight;
        if (i++ < text.length) typeTimer = setTimeout(step, 12);
        else done();
      })();
    }
    function answer(text, mode) {
      busy = true;
      var t = document.createElement('div');
      t.className = 'chat-demo__msg chat-demo__msg--ai chat-demo__typing';
      t.innerHTML = '<span class="chat-demo__ava">' + CHAT_MARK + '</span><span class="chat-demo__dots"><i></i><i></i><i></i></span>';
      log.appendChild(t);
      log.scrollTop = log.scrollHeight;
      pending = setTimeout(function () {
        t.remove();
        if (mode && modeEl) modeEl.textContent = mode;
        typeInto(bubble('ai', ''), text, function () { busy = false; });
      }, reduce ? 0 : 650);
    }
    function ask(i) {
      if (busy) return;
      var d = CHAT_DEMO[i];
      if (!d) return;
      bubble('me', d.q);
      answer(d.a, d.mode);
    }

    /* ---- Automatische Live-Demo (#chat) ---- */
    if (auto) {
      var fieldEl = box.querySelector('.chat-app__composer input, .chat-demo__input input');
      var timers = [];
      var visIO = null;
      function at(fn, ms) { var id = setTimeout(fn, ms); timers.push(id); return id; }
      function clearAll() {
        timers.forEach(clearTimeout); timers = [];
        if (typeTimer) { clearTimeout(typeTimer); typeTimer = null; }
        if (pending) { clearTimeout(pending); pending = null; }
        if (visIO) { visIO.disconnect(); visIO = null; }
      }
      function typeField(text, done) {
        if (!fieldEl || reduce) { if (fieldEl) fieldEl.value = ''; done(); return; }
        var i = 0;
        (function step() {
          fieldEl.value = text.slice(0, i);
          if (i++ < text.length) typeTimer = setTimeout(step, 32);
          else at(function () { fieldEl.value = ''; done(); }, 240);
        })();
      }
      function idle(cb) { busy ? at(function () { idle(cb); }, 120) : cb(); }
      function playStep(i) {
        if (document.hidden) { at(function () { playStep(i); }, 600); return; }
        if (i >= CHAT_AUTO.length) {
          at(function () { log.innerHTML = ''; playStep(0); }, reduce ? 3600 : 4400);
          return;
        }
        var d = CHAT_AUTO[i];
        typeField(d.q, function () {
          bubble('me', d.q);
          answer(d.a);
          idle(function () { at(function () { playStep(i + 1); }, reduce ? 700 : 1700); });
        });
      }
      function startAuto() { at(function () { playStep(0); }, reduce ? 200 : 700); }
      if ('IntersectionObserver' in window) {
        visIO = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            if (visIO) { visIO.disconnect(); visIO = null; }
            startAuto();
          });
        }, { threshold: 0.3 });
        visIO.observe(box);
      } else {
        startAuto();
      }
      return { run: function () {}, destroy: clearAll };
    }

    bubble('ai', CHAT_INTRO_MSG);

    box.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-demo-i]');
      if (chip) ask(parseInt(chip.getAttribute('data-demo-i'), 10));
    });
    if (form && field) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = field.value.trim();
        if (!v || busy) return;
        field.value = '';
        bubble('me', v);
        answer(CHAT_FALLBACK, 'Freie Frage');
      });
    }

    return {
      run: ask,
      destroy: function () { if (typeTimer) clearTimeout(typeTimer); if (pending) clearTimeout(pending); }
    };
  }

  function chatPerkList() {
    return '<ul class="chat-perks">' + CHAT_PERKS.map(function (p) {
      return '<li><span class="chat-perk__ico">' + p.icon + '</span>' +
        '<div><b>' + p.title + '</b><p>' + p.text + '</p></div></li>';
    }).join('') + '</ul>';
  }
  function chatPerkGrid(cls) {
    return '<ul class="chat-perks ' + cls + '">' + CHAT_PERKS.map(function (p) {
      return '<li><span class="chat-perk__ico">' + p.icon + '</span><b>' + p.title + '</b><p>' + p.text + '</p></li>';
    }).join('') + '</ul>';
  }
  function chatHead(center) {
    return '<div class="lab-head' + (center ? ' is-center' : '') + '">' +
      '<span class="eyebrow">' + CHAT_EYEBROW + '</span><h2>' + CHAT_H + '</h2>' +
      '<p>' + CHAT_LEAD + '</p></div>';
  }
  function chatWrap(n, inner) { return '<div class="chat-var chat-var--v' + n + '">' + inner + '</div>'; }

  function chatPerkInline() {
    return '<ul class="chat-perks chat-perks--inline">' + CHAT_PERKS.map(function (p) {
      return '<li><span class="chat-perk__ico">' + p.icon + '</span><b>' + p.title + '</b><span>' + p.text + '</span></li>';
    }).join('') + '</ul>';
  }
  function chatPerkChecks() {
    return '<ul class="chat-perks chat-perks--check">' + CHAT_PERKS.map(function (p) {
      return '<li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg><div><b>' + p.title + '</b><p>' + p.text + '</p></div></li>';
    }).join('') + '</ul>';
  }

  /* =========================================================
     Chat-Section — 4 Designs um denselben realistischen App-Nachbau
     (chatAppMarkup): Verlauf-Spalte links, Kontext-Kopf mit
     Fach-Kachel + Nutzungs-Donut, Messenger-Thread, Composer mit
     Klammer + Rund-Senden — 1:1 der Look von app/chat.html.
     v1 = Strip (früheres v8), v2–v4 = inhaltsreichere Redesigns
     (Perk-Karten, vier Chat-Modi, Eltern-Notiz, Kennzahlen).
     Zusätzliche Achse "Chat-Farbe" (data-chat-color): fb/fw/wc/bc.
     Demo-Skript unverändert (initChatDemo, data-demo-*).
     ========================================================= */
  var CHAT_CLIP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.49"></path></svg>';
  var CHAT_BOOK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"></path><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20"></path></svg>';
  var CHAT_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
  var CHAT_HISTORY = [
    { t: 'Konjunktiv II erklären lassen', th: 'Deutsch · Konjunktiv II', time: 'jetzt', tone: 'var(--fach-rose)', on: true,
      i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"></path><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20"></path></svg>' },
    { t: 'Zellatmung abfragen', th: 'Biologie · Zellatmung', time: '1 Std', tone: 'var(--fach-teal)',
      i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20c9 0 16-7 16-16C11 4 4 11 4 20z"></path><path d="M5 19C9 13 13 10 19 7"></path></svg>' },
    { t: 'pq-Formel Schritt für Schritt', th: 'Mathe · Quadr. Gleichungen', time: 'Gestern', tone: 'var(--fach-blue)',
      i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14M9 8v11M15 8v11"></path></svg>' },
    { t: 'Hebelgesetz üben', th: 'Physik · Kräfte & Bewegung', time: 'Mo', tone: 'var(--fach-pink)',
      i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="2"></circle><ellipse cx="12" cy="12" rx="9" ry="4"></ellipse><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)"></ellipse></svg>' }
  ];

  function chatDonut() {
    var r = 15, circ = 2 * Math.PI * r, dash = 0.42 * circ;
    return '<svg class="chat-app__donut" viewBox="0 0 40 40" aria-hidden="true"><g transform="rotate(-90 20 20)">' +
      '<circle class="chat-app__donut-t" cx="20" cy="20" r="' + r + '" fill="none" stroke-width="5"></circle>' +
      '<circle class="chat-app__donut-v" cx="20" cy="20" r="' + r + '" fill="none" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + dash + ' ' + circ + '"></circle>' +
      '</g></svg>';
  }
  function chatAppSidebar() {
    return '<aside class="chat-app__side">' +
      '<button type="button" class="chat-app__new">' + CHAT_PLUS + 'Neuer Chat</button>' +
      '<div class="chat-app__vh">Verlauf</div>' +
      '<div class="chat-app__list">' + CHAT_HISTORY.map(function (c) {
        return '<div class="chat-app__row' + (c.on ? ' is-active' : '') + '" style="--t:' + c.tone + '">' +
          '<span class="chat-app__rav">' + c.i + '</span>' +
          '<span class="chat-app__rmain"><span class="chat-app__rt">' + c.t + '</span>' +
          '<span class="chat-app__rm"><span class="chat-app__rth">' + c.th + '</span><span class="chat-app__rtime">' + c.time + '</span></span></span></div>';
      }).join('') + '</div></aside>';
  }
  function chatAppMarkup(opts) {
    opts = opts || {};
    var cls = 'chat-app';
    if (opts.size) cls += ' chat-app--' + opts.size;
    if (!opts.sidebar) cls += ' chat-app--nosb';
    if (opts.chrome) cls += ' chat-app--chrome';
    if (opts.plain) cls += ' chat-app--plain';
    if (opts.auto) cls += ' chat-app--auto';
    var chips = CHAT_DEMO.map(function (d, i) {
      return '<button type="button" class="chat-demo__chip" data-demo-i="' + i + '">' + d.q + '</button>';
    }).join('');
    /* Auto-Modus: keine Beispiel-Chips, Composer nur Attrappe (kein
       data-demo-form / -field), Hinweis benennt die Live-Demo. Der Chat
       spielt sich in initChatDemo selbst ab (data-chat-auto). */
    var cw = opts.auto
      ? '<form class="chat-app__composer" aria-hidden="true" tabindex="-1">' +
          '<span class="chat-app__clip">' + CHAT_CLIP + '</span>' +
          '<input type="text" placeholder="Antwort schreiben…" disabled aria-label="Composer (Demo, nicht bedienbar)">' +
          '<span class="chat-app__send" aria-hidden="true">' + CHAT_SEND_ICON + '</span>' +
        '</form>' +
        '<p class="chat-app__hint">Live-Demo — die Unterhaltung läuft automatisch, ein echter Chat funktioniert genauso.</p>'
      : '<div class="chat-demo__chips chat-app__chips">' + chips + '</div>' +
        '<form class="chat-app__composer" data-demo-form>' +
          '<span class="chat-app__clip">' + CHAT_CLIP + '</span>' +
          '<input type="text" placeholder="Antwort schreiben…" data-demo-field aria-label="Nachricht an den KI-Chat">' +
          '<button type="submit" class="chat-app__send" aria-label="Senden">' + CHAT_SEND_ICON + '</button>' +
        '</form>' +
        '<p class="chat-app__hint">Demo — Beispielantworten, kein echter Chat.</p>';
    return '<div class="' + cls + '" data-chat-demo' + (opts.auto ? ' data-chat-auto' : '') + '>' +
      (opts.chrome ? '<div class="chat-app__bar"><i></i><i></i><i></i><span>app.lesify.de/chat</span></div>' : '') +
      (opts.sidebar ? chatAppSidebar() : '') +
      '<div class="chat-app__main">' +
        '<div class="chat-app__ctx">' +
          '<span class="chat-app__idtile">' + CHAT_BOOK + '</span>' +
          '<span class="chat-app__ctx-txt"><span class="chat-app__mode" data-demo-mode>Erklären</span>' +
          '<span class="chat-app__thema">Deutsch · Konjunktiv II</span></span>' +
          '<span class="chat-app__usage">' + chatDonut() + '</span>' +
        '</div>' +
        '<div class="chat-demo__log chat-app__thread" data-demo-log></div>' +
        '<div class="chat-app__cw">' + cw + '</div>' +
      '</div>' +
    '</div>';
  }
  function chatHeadD(center, lead) {
    return '<div class="lab-head' + (center ? ' is-center' : '') + '">' +
      '<span class="eyebrow">' + CHAT_EYEBROW + '</span><h2>' + CHAT_H + '</h2>' +
      (lead ? '<p>' + CHAT_LEAD + '</p>' : '') + '</div>';
  }
  function chatStage(inner) { return '<div class="chat-cv__stage">' + inner + '</div>'; }

  /* Die vier Chat-Modi (wie in app/chat.html) + Kennzahlen — Zusatz-Info
     für die inhaltsreicheren Redesigns v2–v4. */
  var CHAT_MODES = [
    { l: 'Erklären', d: 'Konzepte Schritt für Schritt verstehen, mit Rückfragen zwischendurch.',
      i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 8l9 5 9-5-9-5Z"></path><path d="M3 12l9 5 9-5"></path></svg>' },
    { l: 'Üben', d: 'Mündlich abgefragt werden, sofort Rückmeldung zu jeder Antwort.',
      i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="4"></circle><circle cx="12" cy="12" r="0.6" fill="currentColor"></circle></svg>' },
    { l: 'Hausaufgabenhilfe', d: 'Fragen klären, Lösungsweg erklären, keine Lösungen ausgegeben.',
      i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V8L14 3Z"></path><path d="m9 14 2 2 4-4"></path></svg>' },
    { l: 'Zusammenfassen', d: 'Inhalte kompakt und verständlich bündeln.',
      i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"></path><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20"></path></svg>' }
  ];
  var CHAT_STATS = [
    { n: '4', l: 'Chat-Modi' },
    { n: '9', l: 'Schulfächer' },
    { n: '24/7', l: 'erreichbar' },
    { n: 'EU', l: 'Server · DSGVO' }
  ];
  function chatModeCards() {
    return '<ul class="chat-modes">' + CHAT_MODES.map(function (m) {
      return '<li><span class="chat-mode__ico">' + m.i + '</span><div><b>' + m.l + '</b><p>' + m.d + '</p></div></li>';
    }).join('') + '</ul>';
  }
  function chatStatRow() {
    return '<ul class="chat-stats">' + CHAT_STATS.map(function (s) {
      return '<li><b>' + s.n + '</b><span>' + s.l + '</span></li>';
    }).join('') + '</ul>';
  }
  function chatParentNote() {
    return '<div class="chat-parentnote"><span class="chat-parentnote__ico">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M17 20a5 5 0 0 0-10 0"></path><circle cx="12" cy="9" r="4"></circle></svg></span>' +
      '<p><b>Für Eltern nachvollziehbar.</b> Das Elternkonto bekommt eine wöchentliche Zusammenfassung zu Fortschritt und offenen Themen — den Chat-Wortlaut selbst sieht nur das Kind.</p></div>';
  }

  /* Zusatz-Inhalte für die inhaltsreichen Redesigns: echte Beispiel-Fragen,
     ein ehrlicher Vergleich zu einem allgemeinen KI-Chat, die Leitplanken
     und ein Eltern-Zitat. */
  var CHAT_EXAMPLES = [
    { s: 'Deutsch', p: 'Erklär mir den Konjunktiv II an drei Beispielsätzen und frag mich danach ab.' },
    { s: 'Mathe', p: 'Ich verstehe die pq-Formel nicht — geh ein Beispiel mit mir Schritt für Schritt durch.' },
    { s: 'Biologie', p: 'Frag mich die Zellatmung mündlich ab, eine Frage nach der anderen.' },
    { s: 'Physik', p: 'Hilf mir bei Aufgabe 4 zum Hebelgesetz — nicht die Lösung, nur der nächste Schritt.' },
    { s: 'Geschichte', p: 'Fasse die Ursachen des Ersten Weltkriegs so zusammen, dass daraus mein Lernzettel wird.' },
    { s: 'Englisch', p: 'Übe mit mir if-clauses Typ II — gib mir Lückensätze und korrigiere sofort.' }
  ];
  var CHAT_VS = [
    { k: 'Bleibt beim Thema', a: 'fester Themen-Riegel pro Chat', b: 'schweift schnell ab' },
    { k: 'Richtiges Niveau', a: 'auf 8./9. Klasse eingestellt', b: 'oft zu abstrakt oder zu knapp' },
    { k: 'Kennt den Stoff', a: 'liest Lernzettel & Dateien des Themas', b: 'kennt nur das Eingetippte' },
    { k: 'Sagt nicht vor', a: 'erklärt den Weg, fragt zurück', b: 'liefert oft die fertige Lösung' },
    { k: 'Eltern-Einblick', a: 'wöchentliche Zusammenfassung', b: 'keiner' },
    { k: 'Datenschutz', a: 'Server in der EU, DSGVO-konform', b: 'unklar' }
  ];
  var CHAT_GUARD = [
    { t: 'Themen-Riegel', d: 'Jeder Chat ist an ein Fach und ein Thema gebunden. Fragen daneben führt die KI freundlich zum Stoff zurück.' },
    { t: 'Niveau der Jahrgangsstufe', d: 'Wortwahl, Beispiele und Aufgabentiefe sind auf die 8. und 9. Klasse eingestellt — nicht auf Uni-Niveau.' },
    { t: 'Kein Lösungs-Automat', d: 'Im Hausaufgaben-Modus wird der Lösungsweg erklärt und mit Rückfragen geprüft, statt nur das Ergebnis auszugeben.' },
    { t: 'EU & DSGVO', d: 'Verarbeitung auf Servern in der EU. Jede Familie sieht nur die eigenen Inhalte, den Wortlaut sieht nur das Kind.' }
  ];
  var CHAT_QUOTE = {
    t: 'Zum ersten Mal hat meine Tochter abends von selbst den Chat aufgemacht, weil sie eine Matheaufgabe knacken wollte — nicht, weil ich sie erinnert habe.',
    by: 'Katrin R., Mutter, 8. Klasse'
  };
  function chatCTA() { return '<div class="chat-cv__cta"><a class="btn btn-primary btn-on-dark btn-lg" href="/preise/">KI-Chat testen</a></div>'; }
  function chatStripSmall() {
    return '<ul class="chat-cv__strip">' + CHAT_PERKS.map(function (p) {
      return '<li><span class="chat-perk__ico">' + p.icon + '</span><b>' + p.title + '</b></li>';
    }).join('') + '</ul>';
  }
  function chatModesBlock(h, top) {
    return '<div class="chat-cv__modes' + (top ? ' chat-cv__modes--top' : '') + '">' +
      '<span class="chat-cv__modes-h">' + h + '</span>' + chatModeCards() + '</div>';
  }
  function chatExamplesGrid() {
    return '<div class="chat-cv__ex"><span class="chat-cv__col-h">Beispiel-Fragen aus echten Fächern</span>' +
      '<ul class="chat-ex">' + CHAT_EXAMPLES.map(function (e) {
        return '<li><span class="chat-ex__s">' + e.s + '</span><span class="chat-ex__p">' + e.p + '</span></li>';
      }).join('') + '</ul></div>';
  }
  function chatVsBlock() {
    return '<div class="chat-cv__vs"><span class="chat-cv__col-h">Lesify-Chat vs. allgemeiner KI-Chat</span>' +
      '<div class="chat-vs"><div class="chat-vs__row chat-vs__row--head"><span></span>' +
      '<span class="is-a">Lesify-Chat</span><span>Allgemeiner KI-Chat</span></div>' +
      CHAT_VS.map(function (r) {
        return '<div class="chat-vs__row"><span class="chat-vs__k">' + r.k + '</span>' +
          '<span class="chat-vs__a">' + LAB_CHECK + r.a + '</span>' +
          '<span class="chat-vs__b">' + LAB_DASH + r.b + '</span></div>';
      }).join('') + '</div></div>';
  }
  function chatGuardCards() {
    return '<div class="chat-cv__guard"><span class="chat-cv__col-h">So bleibt es beim Schulstoff</span>' +
      '<ul class="chat-guard">' + CHAT_GUARD.map(function (g) {
        return '<li><b>' + g.t + '</b><p>' + g.d + '</p></li>';
      }).join('') + '</ul></div>';
  }
  function chatQuoteBlock() {
    return '<blockquote class="chat-quote"><p>&bdquo;' + CHAT_QUOTE.t + '&ldquo;</p><cite>' + CHAT_QUOTE.by + '</cite></blockquote>';
  }
  function chatDemoLg() { return chatStage(chatAppMarkup({ sidebar: true, chrome: true, size: 'lg', auto: true })); }

  /* 1 · Explainer — App, dann Perk-Liste + die vier Modi nebeneinander + CTA */
  function chatV1() {
    return chatWrap(1, '<div class="container chat-cv chat-cv--1">' + chatHeadD(true, true) + chatDemoLg() +
      '<div class="chat-cv__grid">' +
        '<div class="chat-cv__col"><span class="chat-cv__col-h">Was den Chat besonders macht</span>' + chatPerkList() + '</div>' +
        '<div class="chat-cv__col"><span class="chat-cv__col-h">Die vier Chat-Modi</span>' + chatModeCards() + '</div>' +
      '</div>' + chatCTA() + '</div>');
  }
  /* 2 · Deep — Perk-Karten + Eltern-Notiz + Modi + Kennzahlen */
  function chatV2() {
    return chatWrap(2, '<div class="container chat-cv chat-cv--2">' + chatHeadD(true, true) + chatDemoLg() +
      chatPerkGrid('chat-perks--row') + chatParentNote() +
      chatModesBlock('Die vier Chat-Modi') + chatStatRow() + '</div>');
  }
  /* 3 · Cards — Perk-Karten-Reihe + Modi-Zeile */
  function chatV3() {
    return chatWrap(3, '<div class="container chat-cv chat-cv--3">' + chatHeadD(true, true) + chatDemoLg() +
      chatPerkGrid('chat-perks--row') +
      chatModesBlock('Vier Modi, passend zu Fach und Thema') + '</div>');
  }
  /* 4 · Modi zuerst — die vier Modi groß über der App, darunter Perk-Strip */
  function chatV4() {
    return chatWrap(4, '<div class="container chat-cv chat-cv--4">' + chatHeadD(true, true) +
      chatModesBlock('Ein Chat, vier Modi — Erklären, Hausaufgaben, Üben, Zusammenfassen', true) +
      chatDemoLg() + chatStripSmall() + '</div>');
  }
  /* 5 · Leitplanken — App, „So bleibt es beim Schulstoff" + Perk-Karten + CTA */
  function chatV5() {
    return chatWrap(5, '<div class="container chat-cv chat-cv--5">' + chatHeadD(true, true) + chatDemoLg() +
      chatGuardCards() + chatPerkGrid('chat-perks--row') + chatCTA() + '</div>');
  }
  /* 6 · Beispiele — App, echte Beispiel-Fragen nach Fach + die vier Modi */
  function chatV6() {
    return chatWrap(6, '<div class="container chat-cv chat-cv--6">' + chatHeadD(true, true) + chatDemoLg() +
      chatExamplesGrid() + chatModesBlock('Die vier Chat-Modi') + '</div>');
  }
  /* 7 · Vergleich — App, dann Lesify-Chat vs. allgemeiner KI-Chat + CTA */
  function chatV7() {
    return chatWrap(7, '<div class="container chat-cv chat-cv--7">' + chatHeadD(true, true) + chatDemoLg() +
      chatVsBlock() + chatCTA() + '</div>');
  }
  /* 8 · Editorial — Eltern-Zitat, dann App, dann zweispaltig Perks + Modi */
  function chatV8() {
    return chatWrap(8, '<div class="container container--mid chat-cv chat-cv--8">' +
      '<div class="lab-head is-center"><span class="eyebrow">' + CHAT_EYEBROW + '</span><h2>' + CHAT_H + '</h2></div>' +
      chatQuoteBlock() + chatDemoLg() +
      '<div class="chat-cv__grid">' +
        '<div class="chat-cv__col"><span class="chat-cv__col-h">Was den Chat besonders macht</span>' + chatPerkList() + '</div>' +
        '<div class="chat-cv__col"><span class="chat-cv__col-h">Die vier Chat-Modi</span>' + chatModeCards() + '</div>' +
      '</div></div>');
  }
  /* 9 · Für Eltern — App, große Eltern-Notiz + Leitplanken + Perk-Strip */
  function chatV9() {
    return chatWrap(9, '<div class="container chat-cv chat-cv--9">' + chatHeadD(true, true) + chatDemoLg() +
      chatParentNote() + chatGuardCards() + chatStripSmall() + '</div>');
  }
  /* 10 · Komplett — alles: Perks + Modi + Beispiele + Eltern + Kennzahlen + CTA */
  function chatV10() {
    return chatWrap(10, '<div class="container chat-cv chat-cv--10">' + chatHeadD(true, true) + chatDemoLg() +
      chatPerkGrid('chat-perks--row') + chatModesBlock('Die vier Chat-Modi') +
      chatExamplesGrid() + chatParentNote() + chatStatRow() + chatCTA() + '</div>');
  }

  var CHAT_BUILDERS = { '1': chatV1, '2': chatV2, '3': chatV3, '4': chatV4, '5': chatV5, '6': chatV6, '7': chatV7, '8': chatV8, '9': chatV9, '10': chatV10 };
  var CHAT_VARIANTS = [['1', 'Explainer'], ['2', 'Deep'], ['3', 'Cards'], ['4', 'Modi zuerst'], ['5', 'Leitplanken'], ['6', 'Beispiele'], ['7', 'Vergleich'], ['8', 'Editorial'], ['9', 'Für Eltern'], ['10', 'Komplett']];
  var chatDemoApi = null;

  /* KI-Chat: schwarzer Abschnitt, Layout final = v3 (Cards) — kein
     Dev-Panel-Umschalter mehr. */
  function chatVariant() { return '3'; }
  function chatColorVariant() { return 'fb'; }
  function applyChatColor(v) {
    var s = document.getElementById('chat');
    if (s) s.setAttribute('data-chat-color', v);
  }

  function buildChatSection() {
    var host = document.getElementById('chat-section');
    if (!host) return;
    var v = chatVariant();
    var sec = document.getElementById('chat');
    if (sec) { sec.setAttribute('data-chat', v); sec.setAttribute('data-chat-color', chatColorVariant()); }
    if (chatDemoApi && chatDemoApi.destroy) chatDemoApi.destroy();
    host.innerHTML = (CHAT_BUILDERS[v] || chatV1)();
    markRevealBlocks(host);
    chatDemoApi = initChatDemo(host);
    var tabs = host.querySelector('[data-chat-tabs]');
    if (tabs) {
      tabs.addEventListener('click', function (e) {
        var b = e.target.closest('[data-tab]');
        if (!b) return;
        tabs.querySelectorAll('[data-tab]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
        if (chatDemoApi) chatDemoApi.run(parseInt(b.getAttribute('data-tab'), 10) % CHAT_DEMO.length);
      });
    }
  }

  function applyChatVariant() { buildChatSection(); }

  /* =========================================================
     Hero-Farb-Achse (Prototyp, per Dev-Panel).
       Hero-Farbe : data-hero-color auf .hv9 — Auszeichnung von
                    <em>Nachhilfe</em> (h1 em::after) + Akzent der
                    Foto-Leiste (.hs-c2 → --hs-accent)
     Buttons sind final gewählt und NICHT (mehr) im Dev-Panel:
       .btn-primary  = Pill, solide Tinte, "Ring"-Hover (schmaler
                       Kontur-Ring, ohne Bewegung)
       .btn-secondary = Pill + 1,5-px-Rand, "Snappy"-Hover (Micro-Lift)
     Fest in marketing.css. CSS der Hero-Farbe: landing-lab.css.
     ========================================================= */
  var HERO_COLOR_VARIANTS = [['1', 'Gelb→Akzent'], ['2', 'Blau'], ['3', 'Grün'], ['4', 'Violett'], ['5', 'Verlauf'], ['6', 'Tinte'], ['7', 'Linie'], ['8', 'Marker'], ['9', 'Fog'], ['10', 'Doppel']];

  function pickVar(ls, rx, def) {
    try { var v = localStorage.getItem(ls); if (rx.test(v)) return v; } catch (e) {}
    return def;
  }
  function heroColorVariant() { return pickVar('lesify:herocolor:v', /^([1-9]|10)$/, '1'); }
  function applyHeroColor(v) { var s = document.querySelector('.hv9'); if (s) s.setAttribute('data-hero-color', v); }

  /* =========================================================
     Landing-Lab — 8 weitere Sections nach #chat, je 10 Layout-
     Designs, per Dev-Panel umschaltbar (data-{key} auf der
     Section, localStorage['lesify:{key}:v']). Reihenfolge:
     kv · cmp · subj · price · test · parent · faq · cta.
     Reiner Prototyp-Content (Demo-Zahlen/-Stimmen).
     ========================================================= */
  /* Variantennummer 1–16 (pro Section zusätzlich per +v <= max begrenzt). */
  var RX10 = /^([1-9]|1[0-6])$/;
  var LAB_ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>';
  var LAB_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
  var LAB_DASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
  function lh(eb, h, lead, c) {
    return '<div class="lab-head' + (c ? ' is-center' : '') + '"><span class="eyebrow">' + eb + '</span><h2>' + h + '</h2>' + (lead ? '<p>' + lead + '</p>' : '') + '</div>';
  }
  function lw(key, v, inner) { return '<div class="sv sv--' + key + v + '">' + inner + '</div>'; }
  function pad2(i) { return ('0' + (i + 1)).slice(-2); }

  /* ---------- Klausurvorbereitung (kv) — der GANZE Prozess ----------
     10 Varianten um denselben "Klausur-Cockpit"-Mock (kvxMock): Kopf mit
     Fach + Countdown, Journey-Schiene über den kompletten Ablauf
     (Klausur · Testklausur 1 · Lernplan · Lernphase · Lernzettel ·
     Testklausur 2) und ein Panel, das die sechs Phasen automatisch
     durchläuft (kvInit) — Testklausur, Lernplan, Lernzettel und die
     zweite Testklausur greifen ineinander. Optionale Übersichts-Rail
     (Countdown, Themen-Ampel, Lernzettel, nächster Lerntag). */
  var KVX = {
    eb: 'Klausurvorbereitung',
    h: 'Der ganze Weg zur Klausur — an einem Ort.',
    lead: 'Testklausur, Lernplan, Lernzettel und die zweite Testklausur greifen ineinander: Lesify misst den Stand, baut den Plan, begleitet die Lernphase und prüft am Ende noch einmal nach.',
    fach: 'Mathe',
    titel: 'Klassenarbeit · Bruchterme & Gleichungen',
    countdown: 'in 8 Tagen',
    themen: [
      { n: 'Bruchterme kürzen', a: 'gruen' },
      { n: 'Bruchgleichungen', a: 'rot' },
      { n: 'Termumformung', a: 'gelb' }
    ],
    steps: ['Klausur', 'Testklausur 1', 'Lernplan', 'Lernphase', 'Lernzettel', 'Testklausur 2'],
    plan: [
      { d: 'Mo', t: 'Bruchgleichungen — Grundlagen', tone: 'rot', done: true },
      { d: 'Di', t: 'Bruchgleichungen — Definitionsmenge', tone: 'rot', done: true },
      { d: 'Mi', t: 'Termumformung auffrischen', tone: 'gelb', done: true },
      { d: 'Do', t: 'Nachtest Bruchgleichungen', tone: 'rot', now: true },
      { d: 'Fr', t: 'Gemischte Aufgaben', tone: 'gelb' },
      { d: 'Sa', t: 'Lernzettel durchgehen', tone: 'gruen' },
      { d: 'So', t: 'Zweite Testklausur', tone: 'ink' }
    ],
    t1: { note: '3,6', ampel: 'rot', pro: [
      { th: 'Bruchterme kürzen', note: '2,4', a: 'gruen' },
      { th: 'Bruchgleichungen', note: '5,1', a: 'rot' },
      { th: 'Termumformung', note: '3,4', a: 'gelb' }
    ] },
    t2: { note: '2,0', ampel: 'gruen', delta: '+1,6', pro: [
      { th: 'Bruchterme kürzen', note: '1,8', a: 'gruen' },
      { th: 'Bruchgleichungen', note: '2,3', a: 'gruen' },
      { th: 'Termumformung', note: '2,0', a: 'gruen' }
    ] },
    lernzettel: [
      { h: 'Bruchterm kürzen', b: 'Zähler und Nenner faktorisieren, gemeinsame Faktoren streichen. (x²−9)/(x+3) = x−3.' },
      { h: 'Bruchgleichung lösen', b: 'Erst Definitionsmenge (Nenner ≠ 0), dann mit dem Hauptnenner multiplizieren.' },
      { h: 'Typischer Fehler', b: 'Definitionsmenge vergessen → Scheinlösung wird nicht ausgeschlossen.' }
    ]
  };
  var KVX_ICON = {
    spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.7 6.1L20 10l-6.3 1.9L12 18l-1.7-6.1L4 10l6.3-1.9L12 2z"></path></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 3v5h5"></path></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="16" rx="2"></rect><path d="M4 10h16M8 3v4M16 3v4"></path></svg>'
  };
  function kvxAmpelCards(set) {
    return set.map(function (p) {
      return '<div class="kvx__card kvx__card--' + p.a + '"><span>' + p.th + '</span>' +
        '<span class="kvx-chip kvx-chip--' + p.a + '">' + p.note + '</span></div>';
    }).join('');
  }
  function kvxSteps() {
    return '<ol class="kvx__steps">' + KVX.steps.map(function (s, i) {
      return '<li class="kvx__step' + (i === 0 ? ' is-current' : '') + '">' +
        '<span class="kvx__step-n">' + (i + 1) + '</span><span class="kvx__step-l">' + s + '</span></li>';
    }).join('') + '</ol>';
  }
  function kvxDays(check) {
    return '<ol class="kvx__days' + (check ? ' kvx__days--check' : '') + '">' + KVX.plan.map(function (p) {
      var st = p.done ? ' is-done' : (p.now ? ' is-now' : '');
      var mark = check
        ? '<span class="kvx__day-ck">' + (p.done ? KVX_ICON.check : (p.now ? KVX_ICON.play : '')) + '</span>'
        : '';
      return '<li class="kvx__day kvx__day--' + p.tone + st + '">' + mark +
        '<span class="kvx__day-d">' + p.d + '</span><span class="kvx__day-t">' + p.t + '</span></li>';
    }).join('') + '</ol>';
  }
  function kvxPhases() {
    return (
      /* 0 · Klausur angelegt */
      '<div class="kvx__ph is-on" data-kvx-phase>' +
        '<h4>Klausur angelegt</h4>' +
        '<p class="kvx__lead">Drei Themen zugeordnet, Termin eingetragen. Lesify plant rückwärts vom Klausurtag.</p>' +
        '<div class="kvx__themen">' + KVX.themen.map(function (t) {
          return '<span class="kvx__thema"><i class="kvx__dot kvx__dot--' + t.a + '"></i>' + t.n + '</span>';
        }).join('') + '</div>' +
        '<div class="kvx__cta-row"><span class="kvx__btn kvx__btn--primary">' + KVX_ICON.spark + 'Erste Testklausur erstellen</span></div>' +
      '</div>' +
      /* 1 · Testklausur 1 */
      '<div class="kvx__ph" data-kvx-phase>' +
        '<div class="kvx__note kvx__note--' + KVX.t1.ampel + '"><span class="kvx__note-num">' + KVX.t1.note + '</span>' +
          '<span class="kvx__note-meta"><span class="kvx__note-cap">' + KVX_ICON.lock + 'Testklausur 1</span>' +
          '<span class="kvx__note-lbl">Eingefroren · freie Antworten, aufgabenweise korrigiert</span></span></div>' +
        '<div class="kvx__sec-h">Ampel pro Thema</div>' +
        '<div class="kvx__cards">' + kvxAmpelCards(KVX.t1.pro) + '</div>' +
      '</div>' +
      /* 2 · Lernplan */
      '<div class="kvx__ph" data-kvx-phase>' +
        '<h4>Lernplan erstellt</h4>' +
        '<p class="kvx__lead">7 Tage bis zum Klausurtag — schwache Themen zuerst, mit den meisten Einheiten.</p>' +
        kvxDays(false) +
      '</div>' +
      /* 3 · Lernphase */
      '<div class="kvx__ph" data-kvx-phase>' +
        '<h4>Lernphase läuft · Tag 4 von 7</h4>' +
        '<p class="kvx__lead">Jeder Lerntag führt direkt in den passenden KI-Chat — erklären, üben, mündlich abfragen. Fortschritt wird abgehakt.</p>' +
        kvxDays(true) +
        '<div class="kvx__prog-lbl">3 von 7 Lerntagen erledigt</div>' +
      '</div>' +
      /* 4 · Lernzettel */
      '<div class="kvx__ph" data-kvx-phase>' +
        '<h4>Lernzettel — wächst aus den Chats</h4>' +
        '<p class="kvx__lead">Definitionen, Formeln und typische Fehler, automatisch aus den Lern-Chats zusammengefasst.</p>' +
        '<div class="kvx__zettel">' + KVX.lernzettel.map(function (z) {
          return '<div class="kvx__zettel-item"><b>' + z.h + '</b><p>' + z.b + '</p></div>';
        }).join('') + '</div>' +
      '</div>' +
      /* 5 · Testklausur 2 */
      '<div class="kvx__ph" data-kvx-phase>' +
        '<div class="kvx__note kvx__note--' + KVX.t2.ampel + '"><span class="kvx__note-num">' + KVX.t2.note + '</span>' +
          '<span class="kvx__note-meta"><span class="kvx__note-cap">' + KVX_ICON.check + 'Testklausur 2 · ' + KVX.t2.delta + '</span>' +
          '<span class="kvx__note-lbl">Alle Themen grün — bereit für die Klausur</span></span></div>' +
        '<div class="kvx__sec-h">Vergleich Testklausur 1 → 2</div>' +
        '<div class="kvx__compare">' + KVX.t1.pro.map(function (p, i) {
          var q = KVX.t2.pro[i];
          return '<div class="kvx__cmp-row"><span class="kvx__cmp-th">' + p.th + '</span>' +
            '<span class="kvx-chip kvx-chip--' + p.a + '">' + p.note + '</span>' +
            '<span class="kvx__cmp-arw">→</span>' +
            '<span class="kvx-chip kvx-chip--' + q.a + '">' + q.note + '</span></div>';
        }).join('') + '</div>' +
      '</div>'
    );
  }
  function kvxOverviewRail() {
    return '<aside class="kvx__rail">' +
      '<div class="kvx__rail-h">Klausur-Übersicht</div>' +
      '<div class="kvx__rail-count"><b>' + KVX.titel.replace('Klassenarbeit · ', '') + '</b><span>' + KVX.countdown + '</span></div>' +
      '<ul class="kvx__rail-themen">' + KVX.themen.map(function (t) {
        return '<li><i class="kvx__dot kvx__dot--' + t.a + '"></i>' + t.n + '</li>';
      }).join('') + '</ul>' +
      '<div class="kvx__rail-links">' +
        '<span class="kvx__rail-link">' + KVX_ICON.doc + 'Lernzettel · 3 Einträge</span>' +
        '<span class="kvx__rail-link">' + KVX_ICON.cal + 'Nächster Lerntag · Do</span>' +
      '</div></aside>';
  }
  function kvxMock(opts) {
    opts = opts || {};
    var cls = 'kvx';
    if (opts.chrome) cls += ' kvx--chrome';
    if (opts.rail) cls += ' kvx--rail';
    if (opts.size) cls += ' kvx--' + opts.size;
    return '<div class="' + cls + '" data-kvx>' +
      (opts.chrome ? '<div class="kvx__bar"><i></i><i></i><i></i><span>app.lesify.de/klausur</span></div>' : '') +
      '<div class="kvx__progress"><i data-kvx-bar></i></div>' +
      '<div class="kvx__inner">' +
        '<div class="kvx__head"><span class="kvx__badge">' + KVX.fach + '</span>' +
          '<h3 class="kvx__title">' + KVX.titel + '</h3>' +
          '<span class="kvx__meta"><i class="kvx__meta-ico">' + KVX_ICON.cal + '</i>Klausur ' + KVX.countdown + ' · 3 Themen</span></div>' +
        '<div class="kvx__body">' + kvxSteps() + '<div class="kvx__panel">' + kvxPhases() + '</div></div>' +
      '</div>' +
      (opts.rail ? kvxOverviewRail() : '') +
    '</div>';
  }
  function kvxStage(inner) { return '<div class="kvx-cv__stage">' + inner + '</div>'; }

  /* ---------- Klausurvorbereitung (kv) — Nachbau der echten Lernplan-
     Seite (app/lernplan.html?id=lp1): Kopf mit Fach + Countdown, links die
     7-Tage-Navigation, rechts der aktive Lerntag mit abhakbarer
     Checkliste. 8 Rahmen (.sv--kv1..8) um denselben kvlMock; kvlInit
     lässt die Tage automatisch durchlaufen. Reiner Prototyp-Content.
     (Die alten kvx*-Bausteine bleiben — die Feature-Unterseiten nutzen
     sie weiter.) */
  var KVL = {
    eb: 'Klausurvorbereitung',
    h: 'Mit strukturierter Klausurvorbereitung zu besseren Noten.',
    lead: 'Zwei Testklausuren, sieben Lerntage und ein mitwachsender Lernzettel greifen ineinander: So werden Schwachstellen gezielt ausgemerzt und Ihr Kind gewinnt Schritt für Schritt Sicherheit für den Klausurtag.',
    fach: 'Mathe',
    titel: 'Bruchterme & Gleichungen',
    countdown: '14. Sep · noch 5 Tage',
    doneDays: 2,
    points: [
      { ic: 'check', t: 'Testklausuren', s: 'Eine Testklausur an Tag 1 deckt die Schwachstellen auf, eine zweite an Tag 5 prüft, wo noch letzte kleine Lücken liegen.' },
      { ic: 'chat', t: 'Schwachstelle erklären', s: 'Nach jeder Testklausur werden die Schwachstellen aufgelistet und die Fehler im Detail verständlich erklärt.' },
      { ic: 'cal', t: 'Lernplan', s: 'Der Plan bündelt Aufgaben, Erklärungen und Abfragen, um die erkannten Schwachstellen gezielt zu verbessern.' },
      { ic: 'doc', t: 'Lernzettel', s: 'Der Lernzettel entsteht Schritt für Schritt und fasst am Ende alle wichtigen Themen und Erklärungen zusammen.' }
    ],
    facts: [{ n: '7', l: 'Lerntage' }, { n: '2', l: 'Testklausuren' }, { n: '1', l: 'Lernzettel' }],
    themen: [
      { n: 'Bruchterme kürzen', a: 'gruen', t1: '2,4', t2: '1,8' },
      { n: 'Bruchgleichungen', a: 'rot', t1: '5,1', t2: '2,3' },
      { n: 'Termumformung', a: 'gelb', t1: '3,4', t2: '2,0' }
    ],
    /* Der Lernzettel ist ein eigenes Dokument (wie eine Datei) — er wird
       auf der Lernplan-Seite nicht als Text vorgeschaut, sondern nur als
       Link darauf verlinkt (Selbsttest an Tag 7). */
    lzTitle: 'Lernzettel · Bruchterme & Gleichungen',
    lzMeta: '3 Themen zusammengefasst · vor 2 Tagen aktualisiert',
    /* Jeder Lerntag außer den beiden Testklausur-Tagen ist eine abhakbare
       Checkliste — 1:1 wie lpChecklist / lpTagAufgaben in app/assets/js/app.js
       (Tag 2/4/6/7 = kind:'checklist', nicht mehr die alte Kurzansicht). */
    days: [
      { t: 'Testklausur 1', d: 'Diagnose: eine echte Übungsklausur pro Thema, aufgabenweise korrigiert und eingefroren.', st: 'done', kind: 'note', note: '3,6', ampel: 'rot', noteLbl: 'Ausgewertet · Ampel je Thema' },
      { t: 'Schwachstellen verstehen', d: 'Verständnis der schwächsten Themen neu aufbauen — ausgehend vom tatsächlichen Fehler in Testklausur 1.', st: 'done', kind: 'checklist',
        tasks: ['Fehler klären: Bruchgleichungen', 'Beispiel dazu: Bruchgleichungen', 'Verständnis-Check: Bruchgleichungen', 'Fehler klären: Termumformung', 'Verständnis-Check: Termumformung'], done: 5 },
      { t: 'Schwachstellen üben', d: 'Beispielaufgaben selbst lösen, dann die Lösungswege prüfen lassen. Danach startet der Lernzettel.', st: 'now', kind: 'checklist',
        tasks: ['Abfragen: Bruchgleichungen', 'Abfragen: Termumformung', 'Gemischt abfragen', 'Lösungen checken'], done: 1 },
      { t: 'Schwachstellen festigen', d: 'Feynman-Prinzip: den Stoff jetzt selbst erklären, dazu eine Transferaufgabe. Der Lernzettel wächst.', st: 'soon', kind: 'checklist',
        tasks: ['Feynman: Bruchgleichungen erklären', 'Feynman: Termumformung erklären', 'Wiederholung Tag 2', 'Transferaufgabe: Bruchgleichungen'], done: 0 },
      { t: 'Testklausur 2', d: 'Zweite Messung kurz vor der Klausur. Der direkte Vergleich zeigt, welche Themen von Rot auf Grün gewandert sind.', st: 'soon', kind: 'note', note: '2,0', ampel: 'gruen', noteLbl: 'Erwartet · +1,6 zur ersten' },
      { t: 'Restlücken schließen', d: 'Hartnäckige Lücken aus Testklausur 2 gezielt angehen und die ursprünglichen Schwachstellen auffrischen.', st: 'soon', kind: 'checklist',
        tasks: ['Lücke schließen: Bruchgleichungen', 'Auffrischen: Bruchterme kürzen', 'Auffrischen: Termumformung'], done: 0 },
      { t: 'Selbsttest mit dem Lernzettel', d: 'Kurz und gemischt anhand des eigenen Lernzettels — kein neuer Stoff mehr.', st: 'soon', kind: 'checklist', lz: true,
        tasks: ['Selbsttest mit dem Lernzettel'], done: 0 }
    ]
  };
  var KVL_ICON = {
    cal: KVX_ICON.cal, check: KVX_ICON.check, doc: KVX_ICON.doc,
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5C4 4.67 4.67 4 5.5 4h13c.83 0 1.5.67 1.5 1.5v10c0 .83-.67 1.5-1.5 1.5H9l-4 3.5v-3.5H5.5C4.67 16.5 4 15.83 4 15V5.5Z"></path></svg>',
    arr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>',
    tick: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
  };
  function kvlText(opts) {
    opts = opts || {};
    return '<div class="kvl-cv__text">' +
      '<span class="eyebrow">' + KVL.eb + '</span><h2>' + KVL.h + '</h2>' +
      '<p class="lab-lead">' + KVL.lead + '</p>' +
      '<ul class="kvl-cv__points">' + KVL.points.map(function (p) {
        return '<li><span class="kvl-cv__pico">' + KVL_ICON[p.ic] + '</span>' +
          '<div><b>' + p.t + '</b><span>' + p.s + '</span></div></li>';
      }).join('') + '</ul>' +
      '<div class="kvl-cv__facts">' + KVL.facts.map(function (f) {
        return '<div><b>' + f.n + '</b><span>' + f.l + '</span></div>';
      }).join('') + '</div>' +
      (opts.noCta ? '' : '<a class="btn btn-primary btn-lg" href="/preise/">Klausur anlegen</a>') +
      '</div>';
  }
  function kvlStepMarkup(day, i, active) {
    var st = i === active ? 'now' : (i < KVL.doneDays ? 'done' : 'soon');
    return '<li class="kvl__step" data-state="' + st + '"' + (i === active ? ' data-active' : '') + ' data-kvl-step="' + i + '">' +
      '<span class="kvl__step-n">' + (st === 'done' ? KVL_ICON.tick : (i + 1)) + '</span>' +
      '<span class="kvl__step-tx"><span class="kvl__step-t">Tag ' + (i + 1) + '</span>' +
      '<span class="kvl__step-d">' + day.t + '</span></span></li>';
  }
  function kvlNav(active) {
    var pct = Math.round(KVL.doneDays / KVL.days.length * 100);
    return '<aside class="kvl__nav">' +
      '<div class="kvl__count"><b>' + KVL.doneDays + '</b><span>/ ' + KVL.days.length + ' Tagen</span>' +
      '<div class="kvl__cbar"><i style="width:' + pct + '%"></i></div></div>' +
      '<ol class="kvl__steps">' + KVL.days.map(function (day, i) { return kvlStepMarkup(day, i, active); }).join('') +
      '</ol></aside>';
  }
  function kvlMainFor(i) {
    var day = KVL.days[i];
    var chip = day.st === 'done'
      ? '<span class="kvl__chip kvl__chip--done">' + KVL_ICON.tick + 'Erledigt</span>'
      : day.st === 'now'
        ? '<span class="kvl__chip kvl__chip--now">Heute dran</span>'
        : '<span class="kvl__chip kvl__chip--soon">Kommt noch</span>';
    var head = '<div class="kvl__mhead"><span class="kvl__focus-day">Tag ' + (i + 1) + ' · ' + day.t + '</span>' + chip + '</div>' +
      '<p class="kvl__focus-desc">' + day.d + '</p>';
    var body;
    if (day.kind === 'checklist') {
      var total = day.tasks.length;
      var pct = Math.round(day.done / total * 100);
      /* Lernzettel ist ein Dokument, kein Fließtext auf der Seite — eine
         einzelne „öffnen"-Zeile wie ein Datei-/Klausur-Link, keine
         inline vorgeschaute Zusammenfassung. */
      var lzBlock = day.lz
        ? '<a class="kvl__lz-doc" href="#" onclick="return false">' +
          '<span class="kvl__lz-doc-ico">' + KVL_ICON.doc + '</span>' +
          '<span class="kvl__lz-doc-tx"><b>' + KVL.lzTitle + '</b><span>' + KVL.lzMeta + '</span></span>' +
          '<span class="kvl__lz-doc-cta">öffnen' + KVL_ICON.arr + '</span></a>'
        : '';
      var foot;
      if (day.st === 'done') {
        foot = '<div class="kvl__foot"><span class="kvl__pill kvl__pill--ok">' + KVL_ICON.tick + 'Alle Schritte erledigt</span></div>';
      } else if (day.st === 'now') {
        foot = '<div class="kvl__foot"><span class="kvl__pill">Lernzettel läuft schon</span>' +
          '<span class="kvl__pill kvl__pill--btn">Tag abschließen</span></div>';
      } else {
        foot = '<div class="kvl__foot"><span class="kvl__pill kvl__pill--soon">Freigeschaltet an Tag ' + (i + 1) + '</span></div>';
      }
      body = lzBlock + '<div class="kvl__cl"><div class="kvl__cl-head">' +
        '<span class="kvl__cl-count">' + day.done + '<span>&thinsp;/&thinsp;' + total + ' erledigt</span></span>' +
        '<div class="kvl__cl-bar"><i style="width:' + pct + '%"></i></div></div>' +
        '<ul class="kvl__cl-list">' + day.tasks.map(function (t, ti) {
          return '<li class="kvl__cl-item' + (ti < day.done ? ' is-done' : '') + '">' +
            '<span class="kvl__cl-check">' + KVL_ICON.tick + '</span>' +
            '<span class="kvl__cl-open"><span class="kvl__cl-ico">' + KVL_ICON.chat + '</span>' +
            '<span class="kvl__cl-label">' + t + '</span>' +
            '<span class="kvl__cl-cta">öffnen ' + KVL_ICON.arr + '</span></span></li>';
        }).join('') + '</ul></div>' + foot;
    } else if (day.kind === 'note') {
      var isT1 = i === 0;
      body = '<div class="kvl__note kvl__note--' + day.ampel + '">' +
        '<span class="kvl__note-num">' + day.note + '</span>' +
        '<span class="kvl__note-tx"><b>' + (isT1 ? 'Testklausur 1 · ausgewertet' : 'Testklausur 2 · Vorhersage') + '</b>' +
        '<span>' + day.noteLbl + '</span></span></div>' +
        '<div class="kvl__mini-h">Ampel pro Thema</div>' +
        '<ul class="kvl__mini">' + KVL.themen.map(function (th) {
          var a = isT1 ? th.a : 'gruen', note = isT1 ? th.t1 : th.t2;
          return '<li><i class="kvl__dot kvl__dot--' + a + '"></i><span>' + th.n + '</span>' +
            '<b class="kvl__mini-n kvl__mini-n--' + a + '">' + note + '</b></li>';
        }).join('') + '</ul>';
    } else {
      body = '<ul class="kvl__mini kvl__mini--plain">' + KVL.themen.map(function (th) {
        return '<li><i class="kvl__dot kvl__dot--' + th.a + '"></i><span>' + th.n + '</span></li>';
      }).join('') + '</ul>' +
        '<p class="kvl__hint">' + (day.st === 'done'
          ? 'Tag abgeschlossen — alle Haken gesetzt.'
          : 'Wird nach Tag ' + i + ' freigeschaltet.') + '</p>';
    }
    return head + '<div class="kvl__focus-body">' + body + '</div>';
  }
  function kvlMock(opts) {
    opts = opts || {};
    var active = opts.active != null ? opts.active : 2;
    var cls = 'kvl';
    if (opts.chrome) cls += ' kvl--chrome';
    if (opts.size) cls += ' kvl--' + opts.size;
    return '<div class="' + cls + '" data-kvl data-kvl-active="' + active + '">' +
      (opts.chrome ? '<div class="kvl__bar"><i></i><i></i><i></i><span>app.lesify.de/lernplan</span></div>' : '') +
      '<div class="kvl__head"><span class="kvl__badge">' + KVL.fach + '</span>' +
      '<b class="kvl__title">' + KVL.titel + '</b>' +
      '<span class="kvl__meta"><i class="kvl__meta-ico">' + KVL_ICON.cal + '</i>' + KVL.countdown + '</span></div>' +
      '<div class="kvl__split">' + kvlNav(active) +
      '<div class="kvl__main" data-kvl-main>' + kvlMainFor(active) + '</div></div></div>';
  }
  function kvlStage(inner) { return '<div class="kvl-cv__stage">' + inner + '</div>'; }
  function kvlPointsRow() {
    return '<ul class="kvl-cv__points kvl-cv__points--row">' + KVL.points.map(function (p) {
      return '<li><span class="kvl-cv__pico">' + KVL_ICON[p.ic] + '</span>' +
        '<div><b>' + p.t + '</b><span>' + p.s + '</span></div></li>';
    }).join('') + '</ul>';
  }

  function renderKv(v) {
    var head = lh(KVL.eb, KVL.h, KVL.lead), headC = lh(KVL.eb, KVL.h, KVL.lead, true);

    /* 2 · Fenster — Text links, Demo rechts mit Browser-Chrome */
    if (v === '2') return lw('kv', v, '<div class="container kvl-cv kvl-cv--split">' +
      kvlText() + kvlStage(kvlMock({ chrome: true, size: 'lg' })) + '</div>');

    /* 3 · Sticky-Aside — schmale Textspalte links, Demo groß rechts */
    if (v === '3') return lw('kv', v, '<div class="container kvl-cv kvl-cv--sticky">' +
      '<div class="kvl-cv__aside">' + kvlText() + '</div>' +
      kvlStage(kvlMock({ chrome: true, size: 'xl' })) + '</div>');

    /* 4 · Flip — Demo links, Text rechts */
    if (v === '4') return lw('kv', v, '<div class="container kvl-cv kvl-cv--flip">' +
      kvlStage(kvlMock({ size: 'lg' })) + kvlText() + '</div>');

    /* 5 · Zentriert (final gewählt) — Kopf mittig, Punkte-Reihe, dann die
       Demo, darunter Tag-Nummern als Slideshow-Steuerung (data-kvl-dot;
       wechselt denselben Fokus-Tag wie ein Klick in der Demo selbst). */
    if (v === '5') return lw('kv', v, '<div class="container kvl-cv kvl-cv--center">' + headC +
      kvlPointsRow() +
      kvlStage(kvlMock({ chrome: true, size: 'xl', active: 0 })) +
      '<div class="kvl-dots" role="tablist" aria-label="Lerntag wählen">' + KVL.days.map(function (d, i) {
        return '<button type="button" class="kvl-dots__d' + (i === 0 ? ' is-active' : '') + '" data-kvl-dot="' + i + '"' +
          ' aria-label="Tag ' + (i + 1) + ': ' + d.t + '">' + (i + 1) + '</button>';
      }).join('') + '</div></div>');

    /* 6 · Dark — dunkler Abschnitt, Demo dunkel */
    if (v === '6') return lw('kv', v, '<div class="container kvl-cv kvl-cv--dark">' + headC +
      kvlStage(kvlMock({ chrome: true, size: 'xl' })) + kvlPointsRow() + '</div>');

    /* 7 · Bento — Demo groß, Punkte + CTA als Kacheln drumherum */
    if (v === '7') return lw('kv', v, '<div class="container kvl-cv kvl-cv--bento">' + head +
      '<div class="kvl-bento"><div class="kvl-bento__demo">' + kvlMock({ chrome: true }) + '</div>' +
      KVL.points.map(function (p) {
        return '<div class="kvl-bento__cell"><span class="kvl-cv__pico">' + KVL_ICON[p.ic] + '</span>' +
          '<b>' + p.t + '</b><span>' + p.s + '</span></div>';
      }).join('') +
      '<div class="kvl-bento__cell kvl-bento__cell--cta"><b>In zwei Minuten startklar</b>' +
      '<a class="btn btn-primary" href="/preise/">Klausur anlegen</a></div></div></div>');

    /* 8 · Timeline — 7 Tage als horizontale Schiene, darunter der Fokus-Tag */
    if (v === '8') return lw('kv', v, '<div class="container container--mid kvl-cv kvl-cv--timeline">' + headC +
      '<div class="kvl-tl" data-kvl data-kvl-active="2">' +
      '<ol class="kvl-tl__track">' + KVL.days.map(function (day, i) {
        var st = i === 2 ? 'now' : (i < KVL.doneDays ? 'done' : 'soon');
        return '<li class="kvl__step kvl-tl__step" data-state="' + st + '"' + (i === 2 ? ' data-active' : '') + ' data-kvl-step="' + i + '">' +
          '<span class="kvl__step-n">' + (st === 'done' ? KVL_ICON.tick : (i + 1)) + '</span>' +
          '<span class="kvl__step-tx"><span class="kvl__step-t">Tag ' + (i + 1) + '</span>' +
          '<span class="kvl__step-d">' + day.t + '</span></span></li>';
      }).join('') + '</ol>' +
      '<div class="kvl__main kvl-tl__panel" data-kvl-main>' + kvlMainFor(2) + '</div></div></div>');

    /* 1 · Split (Default, früher v4) — Text links, Lernplan-Demo rechts */
    return lw('kv', v, '<div class="container kvl-cv kvl-cv--split">' +
      kvlText() + kvlStage(kvlMock({ size: 'lg' })) + '</div>');
  }

  var kvlTimer = null;
  function kvlInit(host) {
    if (kvlTimer) { clearInterval(kvlTimer); kvlTimer = null; }
    var mock = host.querySelector('[data-kvl]');
    if (!mock) return;
    var main = mock.querySelector('[data-kvl-main]');
    var steps = Array.prototype.slice.call(mock.querySelectorAll('[data-kvl-step]'));
    var dots = Array.prototype.slice.call(host.querySelectorAll('[data-kvl-dot]'));
    if (!main || !steps.length) return;
    var n = KVL.days.length;
    var idx = parseInt(mock.getAttribute('data-kvl-active'), 10) || 0;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function show(i) {
      idx = (i + n) % n;
      main.innerHTML = kvlMainFor(idx);
      steps.forEach(function (s, si) {
        var st = si === idx ? 'now' : (si < KVL.doneDays ? 'done' : 'soon');
        s.setAttribute('data-state', st);
        if (si === idx) s.setAttribute('data-active', ''); else s.removeAttribute('data-active');
        if (s.firstElementChild) s.firstElementChild.innerHTML = (st === 'done' ? KVL_ICON.tick : (si + 1));
      });
      dots.forEach(function (d, di) { d.classList.toggle('is-active', di === idx); });
    }
    function stop() { if (kvlTimer) { clearInterval(kvlTimer); kvlTimer = null; } }
    function start() { if (reduce) return; stop(); kvlTimer = setInterval(function () { if (mock.offsetParent !== null) show(idx + 1); }, 3800); }
    steps.forEach(function (s, si) { s.style.cursor = 'pointer'; s.addEventListener('click', function () { show(si); start(); }); });
    dots.forEach(function (d, di) { d.addEventListener('click', function () { show(di); start(); }); });
    show(idx); onVisible(mock, start);
  }

  var kvTimer = null;
  function kvInit(host) {
    if (kvTimer) { clearInterval(kvTimer); kvTimer = null; }
    var mock = host.querySelector('[data-kvx]');
    if (!mock) return;
    var panels = Array.prototype.slice.call(mock.querySelectorAll('[data-kvx-phase]'));
    if (!panels.length) return;
    var steps = Array.prototype.slice.call(mock.querySelectorAll('.kvx__step'));
    var bar = mock.querySelector('[data-kvx-bar]');
    var n = panels.length, idx = 0;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function show(i) {
      idx = (i + n) % n;
      panels.forEach(function (p, pi) { p.classList.toggle('is-on', pi === idx); });
      steps.forEach(function (s, si) {
        s.classList.toggle('is-done', si < idx);
        s.classList.toggle('is-current', si === idx);
      });
      if (bar) bar.style.width = ((idx + 1) / n * 100) + '%';
    }
    function stop() { if (kvTimer) { clearInterval(kvTimer); kvTimer = null; } }
    function start() { if (reduce) return; stop(); kvTimer = setInterval(function () { if (mock.offsetParent !== null) show(idx + 1); }, 3600); }
    steps.forEach(function (s, si) { s.style.cursor = 'pointer'; s.addEventListener('click', function () { show(si); start(); }); });
    host.addEventListener('mouseenter', stop, true);
    host.addEventListener('mouseleave', start, true);
    show(0); onVisible(mock, start);
  }

  /* ---------- Organisation (org) — Fach → Thema → Datei ----------
     Section zwischen KI-Chat und Vergleich. Demo im Stil der Klausur-
     vorbereitung: links drei Schritte (Fach · Thema · Dateien), rechts
     eine von drei Mini-Seiten, nachgebaut aus den echten App-Seiten
     (fach.html · thema.html · dateien.html). orgInit lässt die drei
     Seiten als Slideshow laufen — Schritte, Nummern unter der Demo und
     die drei Nutzen-Punkte schalten um. 10 Rahmen (.org-cv--*). */
  var ORG_IC = {
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5C4 4.67 4.67 4 5.5 4h13c.83 0 1.5.67 1.5 1.5v10c0 .83-.67 1.5-1.5 1.5H9l-4 3.5v-3.5H5.5C4.67 16.5 4 15.83 4 15V5.5Z"></path></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 3v5h5M9 13h6M9 17h4"></path></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M13 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10z"></path><path d="M13 3v7h7"></path></svg>',
    exam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V8L14 3Z"></path><path d="m9 14 2 2 4-4"></path></svg>',
    fach: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 8l9 5 9-5-9-5Z"></path><path d="M3 12l9 5 9-5"></path></svg>',
    topic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"></circle><circle cx="12" cy="12" r="3"></circle></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4M8 8l4-4 4 4"></path><path d="M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4"></path></svg>'
  };
  var ORG = {
    eb: 'Organisation',
    h: 'Ob Chats, Lernzettel, Dokumente — alles nach Fach und Thema geordnet.',
    lead: 'Schluss mit unordentlichen Ordnern, Collegeblöcken und Zettelwirtschaft: Jeder Chat, jedes Dokument und jeder Lernzettel wird einem Fach und Thema zugeordnet — alles leicht auffindbar, alles am richtigen Platz.',
    steps: [
      { l: 'Fach', s: 'Deutsch' },
      { l: 'Thema', s: 'Bruchrechnung' },
      { l: 'Dateien', s: 'automatisch zugeordnet' }
    ],
    points: [
      { ic: 'fach', t: 'Nach Fach geordnet', s: 'Jedes Fach hat seinen eigenen Bereich, in dem alle Themen und Klausuren übersichtlich aufgelistet sind.' },
      { ic: 'topic', t: 'Nach Thema sortiert', s: 'Innerhalb jedes Themas sind die Inhalte nach Chats, Lernzetteln, Dateien und Klausuren gebündelt.' },
      { ic: 'file', t: 'Alle Dateien am Platz', s: 'Alle Dokumente werden klar identifizierbar nach Fach und Thema gespeichert und sind sofort auffindbar.' }
    ],
    fach: {
      name: 'Deutsch', meta: '8. Klasse · 3 Themen · 2 Klausuren',
      themen: [
        { n: 'Gedichtanalyse', d: 'Metrik, Reimschema und sprachliche Mittel systematisch untersuchen.', c: '2 Chats', z: '1 Lernzettel', f: '1 Datei', on: true },
        { n: 'Erörterung', d: 'Argumente strukturieren und eine schlüssige Erörterung aufbauen.', c: '1 Chat', z: '0 Lernzettel', f: '1 Datei', on: true },
        { n: 'Satzglieder', d: 'Subjekt, Prädikat und Objekte sicher bestimmen.', c: '0 Chats', z: '1 Lernzettel', f: '0 Dateien', on: true }
      ],
      klausurUp: { t: 'Deutsch Klausur — Gedichtanalyse', chips: ['Gedichtanalyse'], when: '20. Sep 2026 · in 10 Tagen', note: '2,8', ampel: 'gelb', noteLbl: 'Testklausur 1 · befriedigend' }
    },
    /* Thema-Karte bewusst wieder Mathematik/Bruchrechnung (nicht Deutsch
       wie die Fach-Karte) — eigene, von der Fach-Karte unabhängige
       Beispielseite, Akzent entsprechend wieder Mathe-Blau
       (siehe .orgx-page--thema { --oc: var(--fach-blue) } unten). */
    thema: {
      fach: 'Mathematik', name: 'Bruchrechnung',
      desc: 'Kürzen, Erweitern und Rechnen mit Brüchen — die Grundlage für Prozent- und Verhältnisrechnung.',
      tabs: [['Übersicht', ''], ['Chats', '2'], ['Lernzettel', '1'], ['Dateien', '1'], ['Klausuren', '2']],
      groups: [
        { ic: 'chat', h: 'Chats', n: '2', rows: [
          ['Erklär mir das Kürzen von Brüchen', 'Thema erklären · vor 2 Std'],
          ['Bruchgleichungen üben', 'Thema üben · gerade eben'] ] },
        { ic: 'file', h: 'Dateien', n: '1', rows: [
          ['Bruchrechnung_Uebungsblatt.pdf', 'Datei · 1,2 MB · vor 2 Std'] ] },
        { ic: 'doc', h: 'Lernzettel', n: '1', rows: [
          ['Bruchrechnung — Grundlagen & Regeln', 'Lernzettel · vor 2 Std'] ] },
        { ic: 'exam', h: 'Klausuren', n: '2', rows: [
          ['Mathe Klausur 1 — 8. Klasse', '14. Sep 2026 · in 5 Tagen'],
          ['Mathe Klausur — Bruch- & Prozentrechnung', '31. Jul 2026 · vor 40 Tagen'] ] }
      ]
    },
    dateien: {
      filters: ['Alle', 'Mathe', 'Deutsch', 'Biologie', 'Geschichte'],
      files: [
        { n: 'Bruchrechnung_Uebungsblatt.pdf', d: 'Übungsblatt mit 12 Aufgaben zum Kürzen und Erweitern von Brüchen.', fach: 'Mathematik', thema: 'Bruchrechnung', c: 'var(--fach-blue)', m: '1,2 MB' },
        { n: 'Zellaufbau_Diagramm.png', d: 'Beschriftetes Diagramm: Tier- und Pflanzenzelle im Vergleich.', fach: 'Biologie', thema: 'Zellbiologie', c: 'var(--fach-teal)', m: '2,1 MB' },
        { n: 'Gedicht_Erlkoenig_Analyse.pdf', d: 'Musteranalyse von Goethes „Erlkönig" mit Fokus auf Metrik.', fach: 'Deutsch', thema: 'Gedichtanalyse', c: 'var(--fach-rose)', m: '340 KB' },
        { n: 'Weimar_Quellenanalyse.pdf', d: 'Quellenanalyse zu einer Rede aus der Weimarer Republik.', fach: 'Geschichte', thema: 'Weimarer Republik', c: 'var(--fach-terracotta)', m: '610 KB' }
      ]
    }
  };
  function orgRows(rows) {
    return rows.map(function (r) {
      return '<div class="orgx-row"><span class="orgx-row__ic">' + ORG_IC.doc + '</span>' +
        '<span class="orgx-row__tx"><span class="orgx-row__t">' + r[0] + '</span>' +
        '<span class="orgx-row__m">' + r[1] + '</span></span></div>';
    }).join('');
  }
  function orgKchips(chips) {
    return '<div class="orgx-kchips">' + chips.map(function (c) {
      return '<span class="orgx-kchip">' + c + '</span>';
    }).join('') + '</div>';
  }
  function orgPageFach() {
    var f = ORG.fach, kUp = f.klausurUp;
    return '<div class="orgx-page orgx-page--fach">' +
      '<div class="orgx-fhead"><span class="orgx-avatar">' + ORG_IC.fach + '</span>' +
        '<span class="orgx-fhead__tx"><span class="orgx-eyebrow">Fach</span>' +
        '<b class="orgx-title">' + f.name + '</b><span class="orgx-meta">' + f.meta + '</span></span></div>' +
      '<span class="orgx-sec-h">Themen</span>' +
      '<div class="orgx-tgrid">' + f.themen.map(function (t) {
        return '<div class="orgx-tcard' + (t.on ? ' is-on' : '') + '"><b>' + t.n + '</b>' +
          '<p class="orgx-tcard__d">' + t.d + '</p>' +
          '<div class="orgx-tcard__foot"><span>' + t.c + '</span><span>' + t.z + '</span><span>' + t.f + '</span></div></div>';
      }).join('') + '</div>' +
      '<span class="orgx-sec-h">Klausuren</span>' +
      '<div class="orgx-klist">' +
        '<article class="orgx-kcard">' +
          '<b class="orgx-kcard__t">' + kUp.t + '</b>' +
          '<div class="orgx-kcard__top">' + orgKchips(kUp.chips) +
            '<span class="orgx-kcard__date">' + kUp.when + '</span></div>' +
          '<div class="orgx-kcard__foot"><span class="orgx-knote orgx-knote--' + kUp.ampel + '">' + kUp.note + '</span>' +
            '<span class="orgx-kmeta"><span>' + kUp.noteLbl + '</span></span></div>' +
        '</article>' +
      '</div></div>';
  }
  function orgPageThema() {
    var t = ORG.thema;
    return '<div class="orgx-page orgx-page--thema">' +
      '<div class="orgx-crumb">' + t.fach + ' <i>/</i> ' + t.name + '</div>' +
      '<span class="orgx-fpill"><i></i>' + t.fach + '</span>' +
      '<b class="orgx-title">' + t.name + '</b><p class="orgx-desc">' + t.desc + '</p>' +
      '<div class="orgx-tabs">' + t.tabs.map(function (tb, i) {
        return '<span class="orgx-tab' + (i === 0 ? ' is-on' : '') + '">' + tb[0] +
          (tb[1] ? '<i>' + tb[1] + '</i>' : '') + '</span>';
      }).join('') + '</div>' +
      '<div class="orgx-groups">' + t.groups.map(function (g) {
        return '<div class="orgx-group"><span class="orgx-group-h">' + ORG_IC[g.ic] + g.h +
          '<i>' + g.n + '</i></span>' + orgRows(g.rows) + '</div>';
      }).join('') + '</div></div>';
  }
  function orgPageDateien() {
    var d = ORG.dateien;
    return '<div class="orgx-page orgx-page--dateien">' +
      '<div class="orgx-fhead orgx-fhead--sm"><span class="orgx-fhead__tx"><span class="orgx-eyebrow">Dateien</span>' +
      '<b class="orgx-title">Alle Dateien</b>' +
      '<span class="orgx-meta">Jede Datei ist automatisch einem Fach und Thema zugeordnet.</span></span></div>' +
      '<div class="orgx-drop"><span class="orgx-drop__ic">' + ORG_IC.upload + '</span>' +
        '<span class="orgx-drop__tx"><b>Datei hierher ziehen oder auswählen</b>' +
        '<span>PDF, DOCX, PNG — wird direkt einem Fach &amp; Thema zugeordnet</span></span></div>' +
      '<div class="orgx-filters">' + d.filters.map(function (f, i) {
        return '<span class="orgx-filter' + (i === 0 ? ' is-on' : '') + '">' + f + '</span>';
      }).join('') + '</div>' +
      '<div class="orgx-fgrid">' + d.files.map(function (f) {
        return '<div class="orgx-fcard" style="--t:' + f.c + '">' +
          '<b>' + f.n + '</b><p>' + f.d + '</p>' +
          '<div class="orgx-fcard__foot"><span class="orgx-fcard__chip"><i></i>' + f.fach + ' &middot; ' + f.thema + '</span>' +
          '<span class="orgx-fcard__m">' + f.m + '</span></div></div>';
      }).join('') + '</div></div>';
  }
  var ORG_PAGES = [orgPageFach, orgPageThema, orgPageDateien];

  function orgNav(active) {
    return '<aside class="orgx__nav"><ol class="orgx__steps">' + ORG.steps.map(function (st, i) {
      var state = i === active ? 'now' : (i < active ? 'done' : 'soon');
      return '<li class="orgx__step" data-state="' + state + '"' + (i === active ? ' data-active' : '') +
        ' data-org-step="' + i + '"><span class="orgx__step-n">' + (i + 1) + '</span>' +
        '<span class="orgx__step-tx"><span class="orgx__step-l">' + st.l + '</span>' +
        '<span class="orgx__step-s">' + st.s + '</span></span></li>';
    }).join('') + '</ol></aside>';
  }
  /* Kompakte App-Icon-Leiste (wie die eingeklappte Sidebar der App) —
     nur für die Erklär-Karten-Varianten 11–15, macht die Demo schmaler.
     Fächer/Themen/Dateien tragen data-org-nav und schalten mit. */
  var ORG_RAIL = [
    { i: 'grid' }, { i: 'chat' },
    { i: 'fach', nav: 0 }, { i: 'topic', nav: 1 }, { i: 'exam' }, { i: 'file', nav: 2 },
    { i: 'search', div: true }, { i: 'settings' }
  ];
  var ORG_RAIL_IC = {
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="3" width="7" height="7" rx="1.5"></rect><rect x="14" y="3" width="7" height="7" rx="1.5"></rect><rect x="3" y="14" width="7" height="7" rx="1.5"></rect><rect x="14" y="14" width="7" height="7" rx="1.5"></rect></svg>',
    chat: ORG_IC.chat, fach: ORG_IC.fach, topic: ORG_IC.topic, exam: ORG_IC.exam, file: ORG_IC.file,
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.7" y2="16.7"></line></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.63.66 1.09 1.31 1.09H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>'
  };
  function orgRail(active) {
    return '<aside class="orgx__rail"><span class="orgx__rail-brand">' + LOGO_MARK + '</span>' +
      '<div class="orgx__rail-nav">' + ORG_RAIL.map(function (it) {
        return (it.div ? '<span class="orgx__rail-div"></span>' : '') +
          '<span class="orgx__rail-i' + (it.nav === active ? ' is-active' : '') + '"' +
          (it.nav != null ? ' data-org-nav="' + it.nav + '"' : '') + '>' + ORG_RAIL_IC[it.i] + '</span>';
      }).join('') + '</div>' +
      '<span class="orgx__rail-av">JB</span></aside>';
  }
  function orgMock(opts) {
    opts = opts || {};
    var active = opts.active != null ? opts.active : 0;
    var cls = 'orgx' + (opts.size ? ' orgx--' + opts.size : '') + (opts.rail ? ' orgx--rail' : '');
    return '<div class="' + cls + '" data-org-demo data-org-active="' + active + '">' +
      '<div class="orgx__bar"><i></i><i></i><i></i><span>app.lesify.de</span></div>' +
      '<div class="orgx__progress"><i data-org-bar></i></div>' +
      '<div class="orgx__split">' + (opts.rail ? orgRail(active) : orgNav(active)) +
        '<div class="orgx__main" data-org-main>' + ORG_PAGES[active]() + '</div>' +
      '</div></div>';
  }
  /* Erklär-Karten links neben der Demo (Varianten 11–15) — jede Karte
     wechselt auf ihre Seite (data-org-point, von orgInit verdrahtet). */
  function orgSwitchCards(cls) {
    return '<div class="org-cv__switch' + (cls ? ' ' + cls : '') + '">' + ORG.points.map(function (p, i) {
      return '<button type="button" class="org-cv__scard"' + (i === 0 ? ' data-active' : '') + ' data-org-point="' + i + '">' +
        '<span class="org-cv__scard-ic">' + ORG_IC[p.ic] + '</span>' +
        '<span class="org-cv__scard-tx"><b>' + p.t + '</b><span>' + p.s + '</span></span>' +
        '<span class="org-cv__scard-n">' + (i + 1) + '</span></button>';
    }).join('') + '</div>';
  }
  function orgSwitchText(cta) {
    return '<div class="org-cv__text"><span class="eyebrow">' + ORG.eb + '</span><h2>' + ORG.h + '</h2>' +
      '<p class="lab-lead">' + ORG.lead + '</p>' + orgSwitchCards() +
      (cta ? '<a class="btn btn-primary btn-lg" href="/preise/">Kostenlos starten</a>' : '') + '</div>';
  }
  function orgDots() {
    return '<div class="orgx-dots" role="tablist" aria-label="Seite wählen">' + ORG.steps.map(function (st, i) {
      return '<button type="button" class="orgx-dots__d' + (i === 0 ? ' is-active' : '') + '" data-org-dot="' + i + '"' +
        ' aria-label="' + st.l + '">' + (i + 1) + '</button>';
    }).join('') + '</div>';
  }
  function orgStage(size, opts) {
    opts = opts || {};
    return '<div class="org-cv__stage">' + orgMock({ size: size || 'lg', rail: opts.rail }) +
      (opts.noDots ? '' : orgDots()) + '</div>';
  }
  function orgPoints(cls) {
    return '<ul class="org-cv__points' + (cls ? ' ' + cls : '') + '">' + ORG.points.map(function (p, i) {
      return '<li' + (i === 0 ? ' data-active' : '') + ' data-org-point="' + i + '"><b>' + p.t + '</b><span>' + p.s + '</span></li>';
    }).join('') + '</ul>';
  }
  function orgText(cta) {
    return '<div class="org-cv__text"><span class="eyebrow">' + ORG.eb + '</span><h2>' + ORG.h + '</h2>' +
      '<p class="lab-lead">' + ORG.lead + '</p>' + orgPoints('org-cv__points--stack') +
      (cta ? '<a class="btn btn-primary btn-lg" href="/preise/">Kostenlos starten</a>' : '') + '</div>';
  }
  function orgCTA() { return '<div class="org-cv__cta"><a class="btn btn-primary btn-lg" href="/preise/">Kostenlos starten</a></div>'; }
  /* ---------- Fächer-Übersicht (früher eigene „Fächer & Klassenstufen"-
     Section) — jetzt in die Struktur-Section integriert. Zeigt bewusst nur
     6 kuratierte Fächer + eine "und X weitere"-Karte (18 Fächer insgesamt
     laut Subheadline, aber 18 Karten wären unübersichtlich) + "Eigenes Fach"-
     Karte. Final auf v2 (Ghost) gewählt (2026-09-16, siehe LAB_SECTIONS),
     die anderen 9 Layout-Varianten bleiben als toter Code stehen. ---------- */
  /* Lazy statt Modul-Konstante: SUBJ_LIST wird erst weiter unten im Skript
     deklariert, ist zur Ladezeit dieser Zeile also noch undefined — daher
     als Funktion, die erst beim ersten renderOrgFaecher()-Aufruf läuft. */
  function orgFaecherItems() {
    return [
      { n: 'Mathematik', t: 'var(--fach-blue)', m: '4 Themen · 3 Klausuren', i: SUBJ_LIST[0].i },
      { n: 'Deutsch', t: 'var(--fach-rose)', m: '3 Themen · 2 Klausuren', i: SUBJ_LIST[1].i },
      { n: 'Englisch', t: 'var(--fach-amber)', m: '5 Themen · 1 Klausur', i: SUBJ_LIST[2].i },
      { n: 'Biologie', t: 'var(--fach-teal)', m: '2 Themen · 1 Klausur', i: SUBJ_LIST[6].i },
      { n: 'Physik', t: 'var(--fach-pink)', m: '3 Themen · 2 Klausuren', i: SUBJ_LIST[4].i },
      { n: 'Geschichte', t: 'var(--fach-terracotta)', m: '2 Themen · 0 Klausuren', i: SUBJ_LIST[7].i }
    ];
  }
  var ORG_FAECHER_MORE = 12; /* 18 insgesamt − 6 gezeigt */
  var ORG_FAECHER_H = 'Alle Fächer an einem Ort';
  var ORG_FAECHER_LEAD = '18 Schulfächer sind bereits vorinstalliert. Jedes bündelt Themen, Klausuren und Fortschritt, und eigene Fächer lassen sich jederzeit mit einem Klick anlegen.';
  var ORG_ELLIPSIS_IC = '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"></circle><circle cx="12" cy="12" r="1.6"></circle><circle cx="19" cy="12" r="1.6"></circle></svg>';
  function orgFachHead(cls) {
    return '<div class="org-faecher__h' + (cls ? ' ' + cls : '') + '"><b>' + ORG_FAECHER_H + '</b>' +
      '<span>' + ORG_FAECHER_LEAD + '</span></div>';
  }
  function orgFachCard(f, cls) {
    return '<article class="org-fach' + (cls ? ' ' + cls : '') + '" style="--t:' + f.t + '"><span class="org-fach__av">' + f.i + '</span>' +
      '<b>' + f.n + '</b><span class="org-fach__m">' + f.m + '</span></article>';
  }
  function orgFachAddCard(cls) {
    return '<article class="org-fach org-fach--add' + (cls ? ' ' + cls : '') + '"><span class="org-fach__av">' + SUBJ_PLUS + '</span>' +
      '<b>Eigenes Fach</b><span class="org-fach__m">in Sekunden anlegen</span></article>';
  }
  function renderOrgFaecher(v) {
    var items = orgFaecherItems();

    /* 2 · Ghost — "weitere"-Karte gestrichelt wie die "Eigenes Fach"-Karte,
       mit Auslassungs-Icon statt Plus. */
    if (v === '2') return lw('orgfaecher', v, '<div class="org-faecher">' + orgFachHead() +
      '<div class="org-faecher__grid">' + items.map(function (f) { return orgFachCard(f); }).join('') +
      '<article class="org-fach org-fach--add"><span class="org-fach__av">' + ORG_ELLIPSIS_IC + '</span>' +
      '<b>und ' + ORG_FAECHER_MORE + ' weitere</b><span class="org-fach__m">von Kunst bis Wirtschaft</span></article>' +
      orgFachAddCard() + '</div></div>');

    /* 3 · Avatar-Stack — überlappende Farbpunkte statt Icon, wie die
       Trust-Avatare im Hero. */
    if (v === '3') {
      var tones = ['var(--fach-violet)', 'var(--fach-pink)', 'var(--fach-graphit)', 'var(--fach-amber)'];
      var dots = tones.map(function (t) { return '<span class="org-fach__dot" style="--t:' + t + '"></span>'; }).join('');
      return lw('orgfaecher', v, '<div class="org-faecher">' + orgFachHead() +
        '<div class="org-faecher__grid">' + items.map(function (f) { return orgFachCard(f); }).join('') +
        '<article class="org-fach org-fach--more"><span class="org-fach__stack">' + dots + '</span>' +
        '<b>+' + ORG_FAECHER_MORE + ' weitere</b><span class="org-fach__m">alle Fächer im Überblick</span></article>' +
        orgFachAddCard() + '</div></div>');
    }

    /* 4 · Pill-Reihe — Fächer als Chips statt Karten, "weitere" als
       letzter Chip, Eigenes-Fach als eigener Button darunter. */
    if (v === '4') return lw('orgfaecher', v, '<div class="org-faecher org-faecher--pills">' + orgFachHead('is-center') +
      '<ul class="org-fpills">' + items.map(function (f) {
        return '<li class="org-fpill" style="--t:' + f.t + '"><span class="org-fpill__ico">' + f.i + '</span>' + f.n + '</li>';
      }).join('') + '<li class="org-fpill org-fpill--more">+' + ORG_FAECHER_MORE + ' weitere</li></ul>' +
      '<a class="btn btn-secondary" href="/preise/">Eigenes Fach anlegen</a></div>');

    /* 5 · Bento — ein Fach groß, Rest kompakt, "weitere" als breite Zeile
       am Fuß des Rasters. */
    if (v === '5') {
      var hero = items[0], rest = items.slice(1);
      return lw('orgfaecher', v, '<div class="org-faecher">' + orgFachHead() +
        '<div class="org-fbento">' + orgFachCard(hero, 'org-fbento__hero') +
        rest.map(function (f) { return orgFachCard(f); }).join('') +
        '<article class="org-fach org-fach--more org-fbento__more"><b>+' + ORG_FAECHER_MORE + ' weitere Fächer</b>' +
        '<span class="org-fach__m">von Kunst bis Wirtschaft — jederzeit ergänzbar</span></article>' +
        orgFachAddCard() + '</div></div>');
    }

    /* 6 · Dark — gleiches Raster, dunkler Kartenhintergrund. */
    if (v === '6') return lw('orgfaecher', v, '<div class="org-faecher org-faecher--dark">' + orgFachHead() +
      '<div class="org-faecher__grid">' + items.map(function (f) { return orgFachCard(f); }).join('') +
      '<article class="org-fach org-fach--more"><b class="org-fach__more-n">+' + ORG_FAECHER_MORE + '</b>' +
      '<span class="org-fach__m">weitere Fächer</span></article>' +
      orgFachAddCard() + '</div></div>');

    /* 7 · Scroll-Reihe — horizontal scrollbare Karten statt Raster. */
    if (v === '7') return lw('orgfaecher', v, '<div class="org-faecher">' + orgFachHead() +
      '<div class="org-fscroll">' + items.map(function (f) { return orgFachCard(f, 'org-fach--tall'); }).join('') +
      '<article class="org-fach org-fach--tall org-fach--more"><b class="org-fach__more-n">+' + ORG_FAECHER_MORE + '</b>' +
      '<span class="org-fach__m">weitere Fächer</span></article>' +
      orgFachAddCard('org-fach--tall') + '</div></div>');

    /* 8 · Kompakt-Liste — Zeilen statt Karten. */
    if (v === '8') return lw('orgfaecher', v, '<div class="org-faecher">' + orgFachHead() +
      '<ul class="org-flist">' + items.map(function (f) {
        return '<li style="--t:' + f.t + '"><span class="org-fach__av">' + f.i + '</span><b>' + f.n + '</b><span>' + f.m + '</span></li>';
      }).join('') +
      '<li class="org-flist__more"><b>und ' + ORG_FAECHER_MORE + ' weitere Fächer</b><span>von Kunst bis Wirtschaft</span></li></ul>' +
      '<a class="btn btn-secondary" href="/preise/">Eigenes Fach anlegen</a></div>');

    /* 9 · Ring — kreisrunde Avatare statt Kacheln. */
    if (v === '9') return lw('orgfaecher', v, '<div class="org-faecher">' + orgFachHead('is-center') +
      '<div class="org-fring">' + items.map(function (f) {
        return '<div class="org-fring__it"><span class="org-fring__av" style="--t:' + f.t + '">' + f.i + '</span><b>' + f.n + '</b></div>';
      }).join('') +
      '<div class="org-fring__it"><span class="org-fring__av org-fring__av--more">+' + ORG_FAECHER_MORE + '</span><b>weitere</b></div>' +
      '<div class="org-fring__it"><span class="org-fring__av org-fring__av--add">' + SUBJ_PLUS + '</span><b>Eigenes Fach</b></div></div></div>');

    /* 10 · Editorial — reiner Fließtext statt Karten, sehr zurückhaltend. */
    if (v === '10') {
      var names = items.map(function (f) { return f.n; }).join(', ');
      return lw('orgfaecher', v, '<div class="org-faecher org-faecher--editorial">' + orgFachHead('is-center') +
        '<p class="org-fedit">' + names + ' und ' + ORG_FAECHER_MORE + ' weitere Fächer — <b>18 insgesamt</b>, ' +
        'jederzeit um ein eigenes ergänzbar.</p>' +
        '<a class="btn btn-primary" href="/preise/">Eigenes Fach anlegen</a></div>');
    }

    /* 1 · Zahlen-Kachel (Default) — gleiches Raster wie bisher, "weitere"
       als eigene Kachel mit großer Zahl zwischen Geschichte und Eigenes Fach. */
    return lw('orgfaecher', v, '<div class="org-faecher">' + orgFachHead() +
      '<div class="org-faecher__grid">' + items.map(function (f) { return orgFachCard(f); }).join('') +
      '<article class="org-fach org-fach--more"><b class="org-fach__more-n">+' + ORG_FAECHER_MORE + '</b>' +
      '<span class="org-fach__m">weitere Fächer</span></article>' +
      orgFachAddCard() + '</div></div>');
  }

  function renderOrg(v) {
    var head = lh(ORG.eb, ORG.h, ORG.lead), headC = lh(ORG.eb, ORG.h, ORG.lead, true);

    /* 2 · Split — Text links, Demo rechts */
    if (v === '2') return lw('org', v, '<div class="container org-cv org-cv--split">' +
      orgText(true) + orgStage('lg') + '</div>');

    /* 3 · Flip — Demo links, Text rechts */
    if (v === '3') return lw('org', v, '<div class="container org-cv org-cv--flip">' +
      orgStage('lg') + orgText(true) + '</div>');

    /* 4 · Fenster — Kopf mittig, große Demo, Punkte + CTA */
    if (v === '4') return lw('org', v, '<div class="container org-cv org-cv--window">' + headC +
      orgStage('xl') + orgPoints() + orgCTA() + '</div>');

    /* 5 · Sticky — schmale, klebende Textspalte + große Demo */
    if (v === '5') return lw('org', v, '<div class="container org-cv org-cv--sticky">' +
      '<div class="org-cv__aside">' + orgText(true) + '</div>' + orgStage('xl') + '</div>');

    /* 6 · Dark — dunkler Abschnitt */
    if (v === '6') return lw('org', v, '<div class="container org-cv org-cv--dark">' + headC +
      orgStage('xl') + orgPoints() + '</div>');

    /* 7 · Bento — Demo groß + Punkt-/CTA-Kacheln */
    if (v === '7') return lw('org', v, '<div class="container org-cv org-cv--bento">' + head +
      '<div class="org-bento"><div class="org-bento__demo">' + orgMock() + orgDots() + '</div>' +
      ORG.points.map(function (p, i) {
        return '<div class="org-bento__cell" data-org-point="' + i + '"' + (i === 0 ? ' data-active' : '') +
          '><b>' + p.t + '</b><span>' + p.s + '</span></div>';
      }).join('') +
      '<div class="org-bento__cell org-bento__cell--cta"><b>Von Anfang an sortiert</b>' +
      '<a class="btn btn-primary" href="/preise/">Kostenlos starten</a></div></div></div>');

    /* 8 · Zebra — Punkte als volle Wechsel-Reihen unter der Demo */
    if (v === '8') return lw('org', v, '<div class="container container--mid org-cv org-cv--zebra">' + headC +
      orgStage('lg') + orgPoints('org-cv__points--zebra') + '</div>');

    /* 9 · Karten — Punkte als drei umrandete Karten + CTA */
    if (v === '9') return lw('org', v, '<div class="container org-cv org-cv--cards">' + headC +
      orgStage('lg') + orgPoints('org-cv__points--cards') + orgCTA() + '</div>');

    /* 10 · Editorial — Lead als eigener Block, dann Demo, dann Punkte */
    if (v === '10') return lw('org', v, '<div class="container container--mid org-cv org-cv--editorial">' +
      '<div class="lab-head is-center"><span class="eyebrow">' + ORG.eb + '</span><h2>' + ORG.h + '</h2></div>' +
      '<p class="org-cv__lead">' + ORG.lead + '</p>' + orgStage('lg') + orgPoints() + '</div>');

    /* --- Erklär-Karten-Runde (11–15): kompakte App-Icon-Leiste in der
       Demo (schmaler), links Erklär-Karten, die auf ihre Seite schalten. --- */

    /* 11 · Erklär-Spalte (final gewählt) — Kopf mittig, darunter die drei
       Erklär-Karten als Reihe, darunter die kompakte Demo (App-Icon-
       Leiste). Alles gestapelt wie in der KI-Chat- und KV-Section. */
    if (v === '11') return lw('org', v, '<div class="container org-cv org-cv--ecol">' + headC +
      orgSwitchCards('org-cv__switch--row') +
      orgStage('lg', { rail: true, noDots: true }) + '<div id="orgfaecher-section"></div></div>');

    /* 12 · Erklär-Flip — Demo links, Karten + Text rechts */
    if (v === '12') return lw('org', v, '<div class="container org-cv org-cv--eflip">' +
      orgStage('lg', { rail: true, noDots: true }) + orgSwitchText(true) + '</div>');

    /* 13 · Erklär-Karten pur — nur die drei Karten (ohne Lead) + Demo */
    if (v === '13') return lw('org', v, '<div class="container org-cv org-cv--ecards">' + headC +
      '<div class="org-cv__erow"><div class="org-cv__easide">' + orgSwitchCards() + orgCTA() + '</div>' +
      orgStage('lg', { rail: true, noDots: true }) + '</div></div>');

    /* 14 · Erklär-Sticky — klebende Karten-Spalte + große Demo */
    if (v === '14') return lw('org', v, '<div class="container org-cv org-cv--esticky">' +
      '<div class="org-cv__aside">' + orgSwitchText(false) + '</div>' +
      orgStage('xl', { rail: true, noDots: true }) + '</div>');

    /* 15 · Erklär-Dark — dunkler Abschnitt, Karten + kompakte Demo */
    if (v === '15') return lw('org', v, '<div class="container org-cv org-cv--edark">' +
      orgSwitchText(true) + orgStage('lg', { rail: true, noDots: true }) + '</div>');

    /* 1 · Zentriert (Default) — Kopf mittig, Demo, Punkte-Reihe */
    return lw('org', v, '<div class="container org-cv org-cv--center">' + headC +
      orgStage('lg') + orgPoints() + '</div>');
  }
  var orgTimer = null;
  function orgInit(host) {
    if (orgTimer) { clearInterval(orgTimer); orgTimer = null; }
    var demo = host.querySelector('[data-org-demo]');
    if (!demo) return;
    var main = demo.querySelector('[data-org-main]');
    var steps = Array.prototype.slice.call(demo.querySelectorAll('[data-org-step]'));
    var navs = Array.prototype.slice.call(demo.querySelectorAll('[data-org-nav]'));
    var dots = Array.prototype.slice.call(host.querySelectorAll('[data-org-dot]'));
    var points = Array.prototype.slice.call(host.querySelectorAll('[data-org-point]'));
    if (!main) return;
    var n = ORG_PAGES.length;
    var idx = parseInt(demo.getAttribute('data-org-active'), 10) || 0;
    var bar = demo.querySelector('[data-org-bar]');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function setActive(el, on) { if (on) el.setAttribute('data-active', ''); else el.removeAttribute('data-active'); }
    function armBar() {
      if (!bar || reduce) return;
      bar.style.animation = 'none';
      void bar.offsetWidth; /* Reflow → Balken startet neu, im Takt mit der Folie */
      bar.style.animation = '';
    }
    /* Akzent der Demo folgt der gerade gezeigten Seite: Fach (Deutsch) =
       rose, Thema (Mathe) = blau, Dateien (kein einzelnes Fach) =
       schwarz — färbt Fortschrittsbalken, Schritt-Navi und die
       fach-getönten Elemente der Seite selbst (siehe --oc auf .orgx). */
    var ORG_ACCENT = ['var(--fach-rose)', 'var(--fach-blue)', 'var(--ink-950)'];
    function show(i) {
      idx = (i + n) % n;
      main.innerHTML = ORG_PAGES[idx]();
      demo.style.setProperty('--oc', ORG_ACCENT[idx] || 'var(--ink-950)');
      armBar();
      steps.forEach(function (s, si) {
        s.setAttribute('data-state', si === idx ? 'now' : (si < idx ? 'done' : 'soon'));
        setActive(s, si === idx);
      });
      navs.forEach(function (el) { el.classList.toggle('is-active', +el.getAttribute('data-org-nav') === idx); });
      dots.forEach(function (d, di) { d.classList.toggle('is-active', di === idx); });
      points.forEach(function (p, pi) { setActive(p, pi === idx); });
    }
    function stop() { if (orgTimer) { clearInterval(orgTimer); orgTimer = null; } }
    function start() { if (reduce) return; stop(); orgTimer = setInterval(function () { if (demo.offsetParent !== null) show(idx + 1); }, 5200); }
    steps.forEach(function (s, si) { s.style.cursor = 'pointer'; s.addEventListener('click', function () { show(si); start(); }); });
    navs.forEach(function (el) { el.style.cursor = 'pointer'; el.addEventListener('click', function () { show(+el.getAttribute('data-org-nav')); start(); }); });
    dots.forEach(function (d, di) { d.addEventListener('click', function () { show(di); start(); }); });
    points.forEach(function (p, pi) { p.style.cursor = 'pointer'; p.addEventListener('click', function () { show(pi); start(); }); });
    show(idx); onVisible(demo, start);
  }

  /* ---------- Vergleich zu Nachhilfe (cmp) ---------- */
  var CMP = {
    eb: 'Lesify oder klassische Nachhilfe?',
    h: 'Die Vorteile von Lesify gegenüber klassischer Nachhilfe.',
    lead: 'Preis, Verfügbarkeit, Flexibilität, messbare Ergebnisse u. v. m. – Punkt für Punkt zeigt sich, dass Lesify der klassischen Nachhilfe überall einen Schritt voraus ist.',
    rows: [
      { k: 'Kosten pro Monat', a: 'ab 12,99 €, 14 Tage gratis', b: 'meist 80 bis 160 € (2×/Woche)', w: 'a' },
      { k: 'Verfügbarkeit', a: 'rund um die Uhr, sofort', b: 'feste Termine, 1 bis 2×/Woche', w: 'a' },
      { k: 'Zeit bis zur Hilfe', a: 'Sekunden', b: 'Tage bis zum nächsten Termin', w: 'a' },
      { k: 'Alle Fächer abgedeckt', a: 'ja, gleicher Zugang', b: 'meist eine Lehrkraft, ein Fach', w: 'a' },
      { k: 'Messbare Klausurvorbereitung', a: 'Testklausur, Notenprognose, Ampel', b: 'mündliche Einschätzung', w: 'a' },
      { k: 'Fahrweg & Organisation', a: 'keiner, vom Schreibtisch aus', b: 'Hin- und Rückweg, feste Uhrzeit', w: 'a' }
    ]
  };
  /* „Lesify"-Marker auf der Vergleichs-Karte = echtes Logo. */
  var CMP_SPARK = '<img class="cmp-card__logo" src="/assets/img/logo.png" alt="Lesify" width="24" height="24">';
  var CMP_HONEST = 'In genau einem Punkt hat klassische Nachhilfe die Nase vorn: eine feste Bezugsperson, die dein Kind über Monate kennt und von außen motiviert.';
  function cmpMark(win, side) { return win === side ? '<span class="cmp-i cmp-i--y">' + LAB_CHECK + '</span>' : '<span class="cmp-i cmp-i--n">' + LAB_DASH + '</span>'; }
  function cmpCard(side, opts) {
    opts = opts || {};
    var name = side === 'a' ? 'Lesify' : 'Klassische Nachhilfe';
    return '<article class="cmp-card cmp-card--' + side + (opts.cls ? ' ' + opts.cls : '') + '">' +
      (opts.tag && side === 'a' ? '<span class="cmp-card__tag">Empfohlen</span>' : '') +
      '<h3>' + (side === 'a' ? CMP_SPARK : '') + name + '</h3><ul>' +
      CMP.rows.map(function (r) {
        return '<li class="' + (r.w === side ? 'is-win' : 'is-lose') + '">' + cmpMark(r.w, side) +
          '<div><b>' + r.k + '</b><span>' + r[side] + '</span></div></li>';
      }).join('') + '</ul>' +
      (side === 'a' && opts.cta !== false ? '<a class="btn btn-primary btn-block" href="/preise/">Kostenlos starten</a>' : '') +
    '</article>';
  }
  function cmpHonest() { return '<p class="cmp-honest">' + CMP_HONEST + '</p>'; }

  /* ---------- Preisvergleich (cmp) — "gleicher Preis, was bekommt man
     dafür": 30 Tage Lesify Premium vs. eine einzelne Nachhilfestunde,
     gleicher Preispunkt (~20 €). Final auf v1 (Cards) gewählt (2026-09-16),
     die alte "Lesify vs. klassische Nachhilfe"-Section (CMP/cmpCard oben,
     ehem. v11) bleibt als toter Code stehen, ebenso die anderen
     Layout-Varianten v2–v10. ---------- */
  var CMP_VALUE = {
    eb: 'Gleicher Preis, mehr Wert',
    h: '30 Tage Lesify Premium oder eine Stunde Nachhilfe.',
    lead: 'Preis, Verfügbarkeit, Flexibilität, messbare Ergebnisse u. v. m. – Punkt für Punkt zeigt sich, dass Lesify der klassischen Nachhilfe überall einen Schritt voraus ist.',
    rows: [
      { k: 'Preis', a: '19,99 € im Monat', b: 'ca. 20 € pro Stunde', w: 'x' },
      { k: 'Nutzungsdauer', a: '30 Tage lang rund um die Uhr verfügbar', b: 'einmalig 60 Minuten pro Termin', w: 'a' },
      { k: 'Erreichbarkeit', a: '24/7 sofort verfügbar bei jeder Frage', b: 'erst nach vorheriger Terminabsprache', w: 'a' },
      { k: 'Fächer', a: '18 vorinstalliert, weitere jederzeit kostenlos ergänzbar', b: 'meist nur ein Fach pro Nachhilfelehrer', w: 'a' },
      { k: 'Themen', a: 'unbegrenzt viele Themen anlegbar', b: 'nur 2–3 Themen pro Sitzung', w: 'a' },
      { k: 'Klausurvorbereitung', a: 'bis zu 5 Klausurvorbereitungen pro Monat', b: 'mehrere Stunden für eine einzige Klausur', w: 'a' },
      { k: 'Organisation', a: 'sortiert alle Dokumente und Dateien automatisch', b: 'die Zettelwirtschaft wird nur noch größer', w: 'a' },
      { k: 'Selbstständigkeit', a: 'Ihr Kind lernt, sich Inhalte selbst zu erarbeiten', b: 'Ihr Kind bleibt auf den Nachhilfelehrer angewiesen', w: 'a' },
      { k: 'Motivation', a: 'sichtbare Fortschritte halten Ihr Kind von allein bei der Sache', b: 'die Motivation hängt stark von Terminen und Druck ab', w: 'a' }
    ]
  };
  /* Gewinner-Markierung: grüner Haken beim Gewinner, roter X-Akzent bei der
     unterlegenen Seite (deutlicher als der neutrale Strich), echtes
     Unentschieden (w:'x', z. B. beim Preis) bleibt neutral grau. */
  var LAB_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"></line><line x1="18" y1="6" x2="6" y2="18"></line></svg>';
  function cmpValueMark(win, side) {
    if (win === side) return '<span class="cmp-i cmp-i--y">' + LAB_CHECK + '</span>';
    if (win === 'x') return '<span class="cmp-i cmp-i--n">' + LAB_DASH + '</span>';
    return '<span class="cmp-i cmp-i--x">' + LAB_X + '</span>';
  }
  function cmpValueCard(side, opts) {
    opts = opts || {};
    var name = side === 'a' ? '30 Tage Lesify Premium' : '60 Minuten Nachhilfe';
    return '<article class="cmp-card cmp-card--' + side + (opts.cls ? ' ' + opts.cls : '') + '">' +
      (opts.tag && side === 'a' ? '<span class="cmp-card__tag">Mehr für Ihr Geld</span>' : '') +
      '<h3>' + (side === 'a' ? CMP_SPARK : '') + name + '</h3><ul>' +
      CMP_VALUE.rows.map(function (r) {
        return '<li class="' + (r.w === side ? 'is-win' : 'is-lose') + '">' + cmpValueMark(r.w, side) +
          '<div><b>' + r.k + '</b><span>' + r[side] + '</span></div></li>';
      }).join('') + '</ul>' +
      (side === 'a' && opts.cta !== false ? '<a class="btn btn-primary btn-block" href="/preise/">Premium jetzt testen</a>' : '') +
    '</article>';
  }
  function renderCmp(v) {
    var head = lh(CMP_VALUE.eb, CMP_VALUE.h, CMP_VALUE.lead), headC = lh(CMP_VALUE.eb, CMP_VALUE.h, CMP_VALUE.lead, true);
    var aw = CMP_VALUE.rows.filter(function (r) { return r.w === 'a'; }).length;
    var bw = CMP_VALUE.rows.filter(function (r) { return r.w === 'b'; }).length;

    /* 2 · Empfohlen — große, hervorgehobene Premium-Karte + Tag. */
    if (v === '2') return lw('cmp', v, '<div class="container">' + headC +
      '<div class="cmp-cards cmp-cards--feat">' + cmpValueCard('a', { tag: true, cls: 'cmp-card--big' }) + cmpValueCard('b') + '</div>' + '</div>');

    /* 3 · Gleichung — "="-Zeichen statt "vs", betont den identischen Preis. */
    if (v === '3') return lw('cmp', v, '<div class="container">' + headC +
      '<div class="cmp-cards cmp-cards--vs">' + cmpValueCard('a') + '<span class="cmp-vs cmp-vs--eq">=</span>' + cmpValueCard('b') + '</div>' + '</div>');

    /* 4 · Tabelle — Zeile für Zeile nebeneinander ausgerichtet. */
    if (v === '4') return lw('cmp', v, '<div class="container">' + head +
      '<div class="cmp-aligned"><div class="cmp-aligned__head"><span></span><span class="is-a">' + CMP_SPARK + ' 30 Tage Premium</span><span>60 Min. Nachhilfe</span></div>' +
      CMP_VALUE.rows.map(function (r) {
        return '<div class="cmp-aligned__row"><span class="cmp-aligned__k">' + r.k + '</span>' +
          '<span class="cmp-aligned__a ' + (r.w === 'a' ? 'is-win' : '') + '">' + cmpMark(r.w, 'a') + r.a + '</span>' +
          '<span class="cmp-aligned__b ' + (r.w === 'b' ? 'is-win' : '') + '">' + cmpMark(r.w, 'b') + r.b + '</span></div>';
      }).join('') + '</div></div>');

    /* 5 · Dark. */
    if (v === '5') return lw('cmp', v, '<div class="container">' + headC +
      '<div class="cmp-cards cmp-cards--dark">' + cmpValueCard('a') + cmpValueCard('b') + '</div>' + '</div>');

    /* 6 · Lead-in — Premium breit und betont, Nachhilfe schmal/gedämpft. */
    if (v === '6') return lw('cmp', v, '<div class="container">' + head +
      '<div class="cmp-lead-in">' + cmpValueCard('a', { cls: 'cmp-card--wide' }) + cmpValueCard('b', { cls: 'cmp-card--muted' }) + '</div></div>');

    /* 7 · Punktestand — X von Y Punkten für Premium (Unentschieden beim Preis ausgeklammert). */
    if (v === '7') return lw('cmp', v, '<div class="container">' + headC +
      '<div class="cmp-score"><b>' + aw + '</b><span>:</span><b class="is-b">' + bw + '</b><em>Vorteile für 30 Tage Premium vs. eine Nachhilfestunde, beim Preis gleichauf</em></div>' +
      '<div class="cmp-cards">' + cmpValueCard('a') + cmpValueCard('b') + '</div></div>');

    /* 8 · Pills. */
    if (v === '8') return lw('cmp', v, '<div class="container">' + headC +
      '<div class="cmp-cards cmp-cards--pill">' +
      ['a', 'b'].map(function (side) {
        return '<article class="cmp-card cmp-card--' + side + '"><h3>' + (side === 'a' ? '<span class="cmp-card__spark">' + CMP_SPARK + '</span>' : '') + (side === 'a' ? '30 Tage Premium' : '60 Min. Nachhilfe') + '</h3><ul>' +
          CMP_VALUE.rows.map(function (r) {
            return '<li><b>' + r.k + '</b><span class="cmp-pill ' + (r.w === side ? 'is-win' : '') + '">' + r[side] + '</span></li>';
          }).join('') + '</ul>' + (side === 'a' ? '<a class="btn btn-on-dark btn-primary btn-block" href="/preise/">Premium jetzt testen</a>' : '') + '</article>';
      }).join('') + '</div></div>');

    /* 9 · Preisschild — großer, zentrierter Preis-Anker über den zwei Karten. */
    if (v === '9') return lw('cmp', v, '<div class="container">' +
      '<div class="cmp-price-hero"><span class="eyebrow">' + CMP_VALUE.eb + '</span>' +
      '<b class="cmp-price-hero__amt">≈ 20 €</b><span class="cmp-price-hero__sub">kostet eine einzelne Nachhilfestunde — genau wie 30 Tage Lesify Premium.</span></div>' +
      '<div class="cmp-cards">' + cmpValueCard('a') + cmpValueCard('b') + '</div></div>');

    /* 10 · Bento — jede Zeile als eigene Kachel, Seite an Seite. */
    if (v === '10') return lw('cmp', v, '<div class="container">' + headC +
      '<div class="cmp-vbento">' + CMP_VALUE.rows.map(function (r) {
        return '<div class="cmp-vbento__tile"><b>' + r.k + '</b>' +
          '<span class="cmp-vbento__side' + (r.w === 'a' ? ' is-win' : '') + '">' + cmpMark(r.w, 'a') + r.a + '</span>' +
          '<span class="cmp-vbento__side' + (r.w === 'b' ? ' is-win' : '') + '">' + cmpMark(r.w, 'b') + r.b + '</span></div>';
      }).join('') + '</div>' +
      '<div class="lab-cta"><a class="btn btn-primary btn-lg" href="/preise/">Premium jetzt testen</a></div></div>');

    /* 11 · Aktuell — die bisherige Section unverändert: "Lesify oder
       klassische Nachhilfe?" mit den 6 allgemeinen Vorteils-Zeilen. */
    if (v === '11') return lw('cmp', v, '<div class="container">' + lh(CMP.eb, CMP.h, CMP.lead, true) +
      '<div class="cmp-cards">' + cmpCard('a', { cta: false }) + cmpCard('b') + '</div></div>');

    /* 1 · Cards (Default) — je eine Karte, Hinweis zur Preisspanne darunter. */
    return lw('cmp', v, '<div class="container">' + headC +
      '<div class="cmp-cards">' + cmpValueCard('a') + cmpValueCard('b') + '</div>' + '</div>');
  }

  /* ---------- Fächer & Klassenstufen (subj) ---------- */
  var SUBJ = {
    eb: 'Fächer & Klassenstufen',
    h: 'Neun Fächer — und deins, wenn es fehlt.',
    lead: 'Inhalte und Tonfall der KI orientieren sich am Niveau der 8. und 9. Klasse an Gymnasium, Real- und Gesamtschule. Fehlt ein Fach, legt dein Kind es selbst an.',
    grades: ['8. Klasse', '9. Klasse'],
    schools: ['Gymnasium', 'Realschule', 'Gesamtschule'],
    custom: 'Fehlt ein Fach? In wenigen Sekunden selbst anlegen — Lesify stellt Ton und Niveau passend ein.'
  };
  /* Fach-Farben 1:1 wie die App-Voreinstellung (Lesify.faecher seed in
     data.js): Mathe=blue, Deutsch=rose, Englisch=amber, Biologie=teal,
     Geschichte=terracotta. Nicht geseedete Fächer bekommen die restlichen
     kuratierten Töne (violet, pink, graphit). */
  var SUBJ_LIST = [
    { n: 'Mathe', t: 'var(--fach-blue)', i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14M9 8v11M15 8v11"/></svg>' },
    { n: 'Deutsch', t: 'var(--fach-rose)', i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20"/></svg>' },
    { n: 'Englisch', t: 'var(--fach-amber)', i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>' },
    { n: 'Französisch', t: 'var(--fach-violet)', i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5C4 4.7 4.7 4 5.5 4h13c.8 0 1.5.7 1.5 1.5v9c0 .8-.7 1.5-1.5 1.5H9l-4 3.5V16H5.5C4.7 16 4 15.3 4 14.5z"/></svg>' },
    { n: 'Physik', t: 'var(--fach-pink)', i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="2"/><ellipse cx="12" cy="12" rx="9" ry="4"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="4" transform="rotate(120 12 12)"/></svg>' },
    { n: 'Chemie', t: 'var(--fach-graphit)', i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/><path d="M7 15h10"/></svg>' },
    { n: 'Biologie', t: 'var(--fach-teal)', i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20c9 0 16-7 16-16C11 4 4 11 4 20z"/><path d="M5 19C9 13 13 10 19 7"/></svg>' },
    { n: 'Geschichte', t: 'var(--fach-terracotta)', i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21h16M5 21V9M19 21V9M9 21V9M15 21V9M3 9h18l-3-5H6z"/></svg>' },
    { n: 'Erdkunde', t: 'var(--fach-violet)', i: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>'}
  ];
  var SUBJ_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  function subjCard(s, extra) {
    return '<article class="subj-card ' + (extra || '') + '" style="--t:' + s.t + '"><span class="subj-card__ico">' + s.i + '</span><b>' + s.n + '</b></article>';
  }
  function subjCustomCard() {
    return '<article class="subj-card subj-card--custom"><span class="subj-card__ico">' + SUBJ_PLUS + '</span><b>Eigenes Fach</b><span class="subj-card__hint">selbst anlegen</span></article>';
  }
  function subjMeta() {
    return '<div class="subj-meta"><div><b>Klassenstufen</b><span>' + SUBJ.grades.join(' · ') + '</span></div>' +
      '<div><b>Schulformen</b><span>' + SUBJ.schools.join(' · ') + '</span></div>' +
      '<div><b>Eigene Fächer</b><span>jederzeit ergänzbar</span></div></div>';
  }
  function renderSubj(v) {
    var head = lh(SUBJ.eb, SUBJ.h, SUBJ.lead), headC = lh(SUBJ.eb, SUBJ.h, SUBJ.lead, true);
    var cards = SUBJ_LIST.map(function (s) { return subjCard(s); }).join('');

    if (v === '2') return lw('subj', v, '<div class="container">' + headC +
      '<div class="subj-grid subj-grid--big">' + SUBJ_LIST.map(function (s) {
        return '<article class="subj-card subj-card--big" style="--t:' + s.t + '"><span class="subj-card__ico">' + s.i + '</span><b>' + s.n + '</b><span class="subj-card__sub">8. &amp; 9. Klasse</span></article>';
      }).join('') + subjCustomCard() + '</div>' + subjMeta() + '</div>');
    if (v === '3') return lw('subj', v, '<div class="container">' + head +
      '<div class="subj-bento">' + subjCard(SUBJ_LIST[0], 'subj-card--hero') +
      SUBJ_LIST.slice(1).map(function (s) { return subjCard(s); }).join('') + subjCustomCard() + '</div>' + subjMeta() + '</div>');
    if (v === '4') return lw('subj', v, '<div class="subj-scroll-wrap">' + headC +
      '<div class="subj-scroll">' + SUBJ_LIST.map(function (s) {
        return '<article class="subj-card subj-card--tall" style="--t:' + s.t + '"><span class="subj-card__ico">' + s.i + '</span><b>' + s.n + '</b></article>';
      }).join('') + subjCustomCard() + '</div><div class="container">' + subjMeta() + '</div></div>');
    if (v === '5') return lw('subj', v, '<div class="container subj-split">' +
      '<div class="subj-split__l">' + head + subjMeta() +
      '<p class="subj-custom">' + SUBJ.custom + '</p></div>' +
      '<div class="subj-grid subj-split__grid">' + cards + subjCustomCard() + '</div></div>');

    return lw('subj', v, '<div class="container">' + headC +
      '<div class="subj-grid">' + cards + subjCustomCard() + '</div>' + subjMeta() + '</div>');
  }

  /* ---------- Preise (price) ---------- */
  /* Preise je Tarif × Sitzplatz (1 = Einzelplatz, 2-4 = Familie), exakt
     gespiegelt aus `stripe-config.js` (`plans`/`family.tiers`) — Quelle ist
     die Preistabelle vom 2026-09-14. `m`/`mWas` = Monatspreis (Angebot/
     Normalpreis), `y`/`yWas` = Jahresabo umgerechnet auf den Monat (Angebot/
     Normalpreis) — bei „Jährlich" zeigt die Karte immer den Monatsbetrag,
     nie die Jahressumme. */
  var PRICE = {
    eb: 'Preise',
    h: 'Monatlich kündbar, 14 Tage kostenlos testen.',
    lead: '14 Tage kostenlos testen, danach automatisch der gewählte Tarif. Monatlich kündbar. Aktuell −20 % zum Schuljahresstart. Für Geschwister: Familien-Pakete mit Sitzen für 2 bis 4 Kinder.',
    plans: [
      {
        name: 'Starter', desc: 'Der Einstieg für ein Fach.',
        feats: ['100 KI-Nachrichten / Monat', '20 Dokumente / Monat', '1 Klausurvorbereitung / Monat'],
        seats: {
          1: { m: 15.99, mWas: 19.99, y: 12.99, yWas: 19.99 },
          2: { m: 28.99, mWas: 32.99, y: 22.99, yWas: 29.99 },
          3: { m: 41.99, mWas: 45.99, y: 32.99, yWas: 39.99 },
          4: { m: 54.99, mWas: 58.99, y: 42.99, yWas: 49.99 }
        }
      },
      {
        name: 'Premium', desc: 'Für ein Schuljahr mit Plan.', feat: true,
        feats: ['250 KI-Nachrichten / Monat', '50 Dokumente / Monat', '5 Klausurvorbereitungen / Monat'],
        seats: {
          1: { m: 19.99, mWas: 24.99, y: 15.99, yWas: 24.99 },
          2: { m: 35.99, mWas: 40.99, y: 27.66, yWas: 36.99 },
          3: { m: 51.99, mWas: 56.99, y: 39.66, yWas: 48.99 },
          4: { m: 67.99, mWas: 72.99, y: 51.66, yWas: 60.99 }
        }
      },
      {
        name: 'Infinite', desc: 'Kein Nachdenken über Kontingente.',
        feats: ['Unbegrenzt KI-Nachrichten', '100 Dokumente / Monat', '15 Klausurvorbereitungen / Monat'],
        seats: {
          1: { m: 35.99, mWas: 44.99, y: 27.99, yWas: 44.99 },
          2: { m: 64.99, mWas: 73.99, y: 49.99, yWas: 66.99 },
          3: { m: 93.99, mWas: 102.99, y: 71.99, yWas: 88.99 },
          4: { m: 122.99, mWas: 131.99, y: 93.99, yWas: 110.99 }
        }
      }
    ]
  };
  function eur(n) { return n.toFixed(2).replace('.', ',') + ' €'; }
  var PRICE_MINUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>';
  var PRICE_PLUS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"></line><line x1="12" y1="5" x2="12" y2="19"></line></svg>';
  function priceSeatDots(n) {
    var s = '';
    for (var i = 0; i < 4; i++) s += '<i' + (i < n ? ' class="is-on"' : '') + '></i>';
    return s;
  }
  /* Abrechnungs-Umschalter (Monatlich / Jährlich). */
  function priceIntToggle() {
    return '<div class="price-toggle price-toggle--pill" data-price-int>' +
      '<button type="button" data-int="m" class="is-on">Monatlich</button>' +
      '<button type="button" data-int="y">Jährlich <i>−20 %</i></button></div>';
  }
  /* Kinderzahl als Segment-Reihe (1·2·3·4). */
  function priceSeatSegment() {
    var b = '';
    for (var i = 1; i <= 4; i++) b += '<button type="button" data-seats-set="' + i + '"' + (i === 1 ? ' class="is-on"' : '') + '>' + i + '</button>';
    return '<div class="price-seats price-seats--seg" data-price-seats>' +
      '<span class="price-seats__cap">Kinder</span><div class="price-seats__segrow">' + b + '</div></div>';
  }
  /* Fest gewählt (frühere v1): Abrechnungs-Umschalter + Kinderzahl als
     zwei getrennte Pillen in EINER horizontalen Reihe. */
  function priceControls() {
    return '<div class="price-ctrl price-ctrl--v1">' + priceIntToggle() + priceSeatSegment() + '</div>' +
      '<p class="price-seatnote" data-seats-note></p>';
  }
  function priceAmount(p) {
    var idx = PRICE.plans.indexOf(p);
    var d1 = p.seats[1];
    return '<div class="price-amt" data-plan="' + idx + '">' +
      '<del data-was>' + eur(d1.mWas) + '</del>' +
      '<b data-amt>' + eur(d1.m) + '</b>' +
      '<span>/ Monat</span></div>';
  }
  function priceFeats(p) { return '<ul class="price-feats">' + p.feats.map(function (f) { return '<li>' + LAB_CHECK + f + '</li>'; }).join('') + '</ul>'; }
  /* Ziel-URL der Kasse für einen Tarif bei gegebenem Intervall/Sitzplätzen —
     bei >1 Sitz als Familien-Paket (plan=family&tier=…&seats=…), sonst als
     Einzelplatz (plan=<tarif>). Muss zu `checkout.js`s Parametern passen. */
  function priceCheckoutHref(name, interval, seats) {
    var qs = 'interval=' + (interval === 'y' ? 'yearly' : 'monthly');
    return seats > 1
      ? '/checkout/?plan=family&tier=' + name.toLowerCase() + '&seats=' + seats + '&' + qs
      : '/checkout/?plan=' + name.toLowerCase() + '&' + qs;
  }
  function priceCard(p, cls) {
    return '<article class="price-card' + (p.feat ? ' is-feat' : '') + (cls ? ' ' + cls : '') + '">' +
      (p.feat ? '<span class="price-card__tag"><span class="price-card__dot"></span>Bestseller</span>' : '') +
      '<h3>' + p.name + '</h3><p class="price-card__desc">' + p.desc + '</p>' + priceAmount(p) + priceFeats(p) +
      '<a class="btn btn-primary btn-block" data-cta-plan="' + p.name.toLowerCase() + '" href="' + priceCheckoutHref(p.name, 'm', 1) + '">' + p.name + ' testen</a></article>';
  }
  /* Stimmen von Familien — direkt unter den Preisen. Fest gewählt
     (frühere v1): Avatar-Reihe + „+9.994" + ein hervorgehobenes Zitat,
     ohne Überschrift. */
  function pvAv(t, i) { return '<span class="price-voice__av" style="--t:' + TEST_TONES[i % TEST_TONES.length] + '">' + testInitials(t.who) + '</span>'; }
  function priceVoices() {
    var t = TEST.items[0];
    return '<div class="price-voices">' +
      '<div class="price-voices__avrow">' + TEST.items.map(function (x, i) { return pvAv(x, i); }).join('') +
      '<span class="price-voices__more">+9.994</span></div>' +
      '<blockquote class="price-voices__lead">' + t.q + '</blockquote>' +
      '<cite class="price-voices__cite">' + t.who + ' · ' + t.role + '</cite></div>';
  }
  function renderPrice(v) {
    var head = lh(PRICE.eb, PRICE.h, PRICE.lead), headC = lh(PRICE.eb, PRICE.h, PRICE.lead, true);
    var cards = PRICE.plans.map(function (p) { return priceCard(p); }).join('');

    if (v === '2') return lw('price', v, '<div class="container">' + headC + priceControls() +
      '<div class="price-grid price-grid--raise">' + cards + '</div></div>');
    if (v === '3') { // Spotlight: Bestseller groß in der Mitte
      return lw('price', v, '<div class="container">' + headC + priceControls() +
        '<div class="price-grid price-grid--spot">' + priceCard(PRICE.plans[0]) + priceCard(PRICE.plans[1], 'price-card--spot') + priceCard(PRICE.plans[2]) + '</div></div>');
    }
    if (v === '4') return lw('price', v, '<div class="container">' + headC + priceControls() +
      '<div class="price-grid price-grid--darkfeat">' + cards + '</div>' + priceVoices() + '</div>');
    if (v === '5') return lw('price', v, '<div class="container">' + headC + priceControls() +
      '<div class="price-grid price-grid--glow">' + cards + '</div></div>');
    if (v === '6') return lw('price', v, '<div class="container">' + headC + priceControls() +
      '<div class="price-strip">' + PRICE.plans.map(function (p) {
        return '<div class="price-strip__cell' + (p.feat ? ' is-feat' : '') + '">' +
          (p.feat ? '<span class="price-card__tag"><span class="price-card__dot"></span>Bestseller</span>' : '') +
          '<b>' + p.name + '</b><span class="price-strip__desc">' + p.desc + '</span>' + priceAmount(p) +
          '<a class="btn ' + (p.feat ? 'btn-primary' : 'btn-secondary') + ' btn-block" data-cta-plan="' + p.name.toLowerCase() + '" href="' + priceCheckoutHref(p.name, 'm', 1) + '">Testen</a></div>';
      }).join('') + '</div></div>');
    return lw('price', v, '<div class="container">' + headC + priceControls() +
      '<div class="price-grid">' + cards + '</div></div>');
  }
  function priceInit(host) {
    var intBox = host.querySelector('[data-price-int]');
    if (!intBox) return;
    var seatBox = host.querySelector('[data-price-seats]');
    var note = host.querySelector('[data-seats-note]');
    var valEl = host.querySelector('[data-seats-val]');
    var dotsEl = host.querySelector('[data-seats-dots]');
    var SEAT_MAX = 4;
    var state = { i: 'm', s: 1 };
    function apply() {
      host.querySelectorAll('[data-plan]').forEach(function (el) {
        var idx = parseInt(el.getAttribute('data-plan'), 10);
        var d = PRICE.plans[idx].seats[state.s];
        var was = el.querySelector('[data-was]'), amt = el.querySelector('[data-amt]');
        if (was) was.textContent = eur(d[state.i + 'Was']);
        if (amt) amt.textContent = eur(d[state.i]);
      });
      if (valEl) valEl.textContent = state.s === 1 ? '1 Kind' : state.s + ' Kinder';
      if (dotsEl) dotsEl.innerHTML = priceSeatDots(state.s);
      if (seatBox) {
        seatBox.classList.toggle('is-family', state.s > 1);
        seatBox.querySelectorAll('[data-seats-step]').forEach(function (b) {
          var d = parseInt(b.getAttribute('data-seats-step'), 10);
          b.disabled = (state.s + d < 1 || state.s + d > SEAT_MAX);
        });
        seatBox.querySelectorAll('[data-seats-set]').forEach(function (b) {
          b.classList.toggle('is-on', parseInt(b.getAttribute('data-seats-set'), 10) === state.s);
        });
      }
      if (note) note.textContent = state.s === 1
        ? 'Ein Kontingent für ein Kind. Für Geschwister die Kinderzahl erhöhen.'
        : 'Familien-Paket · ' + state.s + ' Sitze, jedes Kind mit vollem eigenem Kontingent.';
      host.querySelectorAll('[data-cta-plan]').forEach(function (a) {
        a.href = priceCheckoutHref(a.getAttribute('data-cta-plan'), state.i, state.s);
      });
    }
    intBox.addEventListener('click', function (e) {
      var b = e.target.closest('[data-int]'); if (!b) return;
      state.i = b.getAttribute('data-int');
      intBox.querySelectorAll('[data-int]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
      apply();
    });
    if (seatBox) seatBox.addEventListener('click', function (e) {
      var setb = e.target.closest('[data-seats-set]');
      if (setb) {
        var ns = parseInt(setb.getAttribute('data-seats-set'), 10);
        if (ns >= 1 && ns <= SEAT_MAX) { state.s = ns; apply(); }
        return;
      }
      var b = e.target.closest('[data-seats-step]'); if (!b || b.disabled) return;
      var nextS = state.s + parseInt(b.getAttribute('data-seats-step'), 10);
      if (nextS < 1 || nextS > SEAT_MAX) return;
      state.s = nextS;
      apply();
    });
    apply();
  }

  /* ---------- Testimonials (test) — Video-Wall im Hintergrund ---------- */
  var TEST = {
    eb: 'Stimmen',
    h: 'Tausende Familien lernen mit Lesify.',
    lead: 'Demo-Inhalte — im Prototyp laufen hier später echte Video-Stimmen von Schüler:innen und Eltern.',
    stat: { n: '10.000+', l: 'Schüler:innen und Eltern' },
    items: [
      { q: 'Zum ersten Mal konnte mir mein Sohn vor einer Mathearbeit sagen, welche zwei Themen noch wackeln. Die Arbeit wurde eine 2 minus.', who: 'Sandra B.', role: 'Mutter, 9. Klasse Gymnasium' },
      { q: 'Keine Fahrerei mehr am Dienstagabend. Meine Tochter setzt sich hin, wenn sie eine Frage hat — nicht erst beim nächsten Termin.', who: 'Markus T.', role: 'Vater, 8. Klasse Realschule' },
      { q: 'Der Lernplan hat den Stress rausgenommen. Wir wussten drei Tage vorher, dass es reicht.', who: 'Familie K.', role: 'Gesamtschule, 9. Klasse' },
      { q: 'Ich mag, dass die KI nicht einfach die Lösung sagt, sondern nachfragt. Nervt manchmal — aber ich kann es danach.', who: 'Jonas, 14', role: 'Schüler, 8. Klasse' }
    ]
  };
  var TEST_TONES = ['var(--fach-blue)', 'var(--fach-amber)', 'var(--fach-teal)', 'var(--fach-violet)', 'var(--fach-rose)'];
  var TEST_WALL = ['Mia · 9. Kl.', 'Ben · 8. Kl.', 'Lea · 9. Kl.', 'Jonas · 8. Kl.', 'Emma · 9. Kl.', 'Noah · 8. Kl.', 'Sophie · 9. Kl.', 'Elias · 8. Kl.', 'Lina · 9. Kl.', 'Paul · 8. Kl.', 'Marie · 9. Kl.', 'Finn · 8. Kl.'];
  var TEST_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>';
  function testInitials(w) { return w.replace(/[^A-Za-zÄÖÜ. ]/g, '').split(/[ .]/).filter(Boolean).slice(0, 2).map(function (x) { return x[0]; }).join(''); }
  function testVid(label, i, cls) {
    return '<div class="test-vid ' + (cls || '') + '" style="--t:' + TEST_TONES[i % TEST_TONES.length] + '">' +
      '<span class="test-vid__play">' + TEST_PLAY + '</span><span class="test-vid__name">' + label + '</span></div>';
  }
  function testWall(cols) {
    cols = cols || 4;
    var per = Math.ceil(TEST_WALL.length / cols), out = '';
    for (var c = 0; c < cols; c++) {
      var slice = TEST_WALL.slice(c * per, c * per + per);
      var col = slice.map(function (l, i) { return testVid(l, c + i); }).join('');
      out += '<div class="test-wall__col">' + col + col + '</div>';
    }
    return '<div class="test-wall" aria-hidden="true">' + out + '</div>';
  }
  function testCard(t, cls) {
    return '<figure class="test-card ' + (cls || '') + '"><blockquote>' + t.q + '</blockquote>' +
      '<figcaption><span class="test-av">' + testInitials(t.who) + '</span><span><b>' + t.who + '</b><em>' + t.role + '</em></span></figcaption></figure>';
  }
  function testStat() { return '<div class="test-stat"><b>' + TEST.stat.n + '</b><span>' + TEST.stat.l + '</span></div>'; }
  function renderTest(v) {
    var head = lh(TEST.eb, TEST.h, ''), headC = lh(TEST.eb, TEST.h, '', true);

    /* 1 · Hero — Video-Wall driftet dahinter, 2 Zitat-Karten davor */
    if (v === '1') return lw('test', v, '<div class="test-hero">' + testWall(5) +
      '<div class="container test-hero__in">' + headC + testStat() +
      '<div class="test-hero__cards">' + testCard(TEST.items[0]) + testCard(TEST.items[3]) + '</div></div></div>');
    /* 2 · Split — Zitate links, großes Video-Mock rechts */
    if (v === '2') return lw('test', v, '<div class="container test-split">' +
      '<div>' + head + '<div class="test-split__cards">' + TEST.items.slice(0, 2).map(function (t) { return testCard(t); }).join('') + '</div></div>' +
      '<div class="test-phone"><div class="test-phone__scr">' + testVid('Lea · 9. Kl.', 2, 'test-vid--big') + '</div></div></div>');
    /* 3 · Wall — Video-Grid mit Zitat-Overlay */
    if (v === '3') return lw('test', v, '<div class="container">' + headC +
      '<div class="test-grid3">' + TEST_WALL.slice(0, 8).map(function (l, i) {
        var q = TEST.items[i % TEST.items.length];
        return '<div class="test-vid test-vid--tile" style="--t:' + TEST_TONES[i % TEST_TONES.length] + '"><span class="test-vid__play">' + TEST_PLAY + '</span>' +
          '<span class="test-vid__q">' + q.q.split('. ')[0] + '.</span><span class="test-vid__name">' + l + '</span></div>';
      }).join('') + '</div></div>');
    /* 4 · Marquee — eine driftende Reihe + Zitate darunter */
    if (v === '4') return lw('test', v, '<div class="container">' + headC + '</div>' +
      '<div class="test-mrow" aria-hidden="true"><div class="test-mrow__track">' +
      TEST_WALL.concat(TEST_WALL).map(function (l, i) { return testVid(l, i, 'test-vid--row'); }).join('') + '</div></div>' +
      '<div class="container"><div class="test-grid2">' + TEST.items.slice(0, 2).map(function (t) { return testCard(t); }).join('') + '</div></div>');
    /* 5 · Dark — dunkle Section, glühende Video-Wall, große Zahl */
    if (v === '5') return lw('test', v, '<div class="test-dark">' + testWall(6) +
      '<div class="container test-dark__in"><div class="test-bignum"><b>' + TEST.stat.n + '</b><span>' + TEST.stat.l + ' lernen mit Lesify</span></div>' +
      '<div class="test-dark__q">' + testCard(TEST.items[2]) + '</div></div></div>');
    /* 6 · Thumbs — Zitat-Karten je mit Video-Thumbnail */
    if (v === '6') return lw('test', v, '<div class="container">' + headC +
      '<div class="test-grid2">' + TEST.items.map(function (t, i) {
        return '<figure class="test-thumb">' + testVid(t.who, i, 'test-vid--thumb') +
          '<div><blockquote>' + t.q + '</blockquote><figcaption>' + t.who + ' · ' + t.role + '</figcaption></div></figure>';
      }).join('') + '</div></div>');
    /* 7 · Spotlight — ein großes Video + Thumb-Strip + Zitat */
    if (v === '7') return lw('test', v, '<div class="container test-spot">' +
      '<div class="test-spot__main">' + testVid('Mia · 9. Kl.', 0, 'test-vid--big') +
      '<div class="test-spot__strip">' + TEST_WALL.slice(1, 6).map(function (l, i) { return testVid(l, i + 1, 'test-vid--sm'); }).join('') + '</div></div>' +
      '<div class="test-spot__q">' + headC + '<blockquote>' + TEST.items[0].q + '</blockquote><cite>' + TEST.items[0].who + ' · ' + TEST.items[0].role + '</cite></div></div>');
    /* 8 · Bento — Mix aus Zitat- und Video-Karten */
    if (v === '8') return lw('test', v, '<div class="container">' + headC +
      '<div class="test-bento">' + testCard(TEST.items[0], 'test-bento__q') + testVid('Ben · 8. Kl.', 1) +
      testVid('Lea · 9. Kl.', 2) + testCard(TEST.items[1], 'test-bento__q') +
      testVid('Emma · 9. Kl.', 4) + testCard(TEST.items[3], 'test-bento__q') + '</div></div>');
    /* 9 · Masonry — Video-Wall mit Namen */
    if (v === '9') return lw('test', v, '<div class="container">' + headC +
      '<div class="test-masonry">' + TEST_WALL.map(function (l, i) { return testVid(l, i, 'test-vid--mason'); }).join('') + '</div></div>');
    /* 10 · Circles — Headline + runde Video-Avatare + Zahl + Zitat */
    if (v === '10') return lw('test', v, '<div class="container container--narrow test-circ">' + headC +
      '<div class="test-circ__row">' + TEST_WALL.slice(0, 6).map(function (l, i) {
        return '<span class="test-circ__av" style="--t:' + TEST_TONES[i % TEST_TONES.length] + '">' + TEST_PLAY + '</span>';
      }).join('') + '<span class="test-circ__more">+9.994</span></div>' +
      '<blockquote class="test-circ__q">' + TEST.items[0].q + '</blockquote><cite>' + TEST.items[0].who + ' · ' + TEST.items[0].role + '</cite></div>');

    return lw('test', v, '<div class="test-hero">' + testWall(5) +
      '<div class="container test-hero__in">' + headC + testStat() + '</div></div>');
  }

  /* ---------- Eltern-Zugang (parent) — Nachbau des echten app/eltern.html ----------
     Feste Seiten-Struktur (Text + Argumente links, Demo rechts) und nur
     noch EINE Demo (kein Dev-Panel mehr, LAB_SECTIONS: parent → fixed
     '1'): drei Kinder wie im echten Eltern-Bereich (kindCard/kzGrid in
     app/eltern.html, Seed-Daten = SEED.familie.kinder in
     app/assets/js/data.js), eines aufgeklappt mit dem 7-Kachel-
     Wochenüberblick, die anderen zu (native <details>, wie im Original).
     App-Fenster-Hülle mit Browser-Chrome-Leiste + fester Höhe (scrollt
     bei Bedarf, wächst nie) — wie kvl/orgx/chat-app. Kein CTA-Button im
     Abschnitt. `parentKidCard`/`parentReport` (ptx-*) bleiben unten als
     tote Helfer für die (inerten) Feature-Unterseiten stehen. ---------- */
  var PARENT = {
    eb: 'Eltern-Zugang',
    h: 'Immer im Bild, ohne über die Schulter zu schauen.',
    lead: 'Ein Eltern-Konto bündelt alle Kinder. Pro Kind ein ruhiger Wochenüberblick: Aktivität, offene Lerntage, anstehende Klausuren — bewusst ohne Chat-Inhalte, ohne Lernzettel, ohne Noten.',
    kpis: [
      { n: '4', l: 'Fächer aktiv' },
      { n: '12', l: 'Themen bearbeitet' },
      { n: '9', l: 'Chats diese Woche' },
      { n: '47', l: 'Nachrichten diese Woche' },
      { n: '6', l: 'Lernzettel gesamt' },
      { n: '2', l: 'Testklausuren diese Woche' }
    ],
    cards: [
      { t: 'Ein Konto, mehrere Kinder', d: 'Familien-Paket mit 2 bis 4 Plätzen. Jedes Kind mit vollem eigenem Kontingent und getrenntem Lernbereich.' },
      { t: 'Datenschutz von Haus aus', d: 'Server in der EU, jede Familie sieht nur die eigenen Inhalte, Datei-Links laufen nach 60 Sekunden ab.' }
    ],
    /* 1:1 aus SEED.familie.kinder (app/assets/js/data.js) — inkl. der
       echten Ampel-Regel (nachrichtenDieWoche: ≥30 grün, ≥8 gelb, sonst
       rot) und dem Pending-Zustand für ein noch nicht eingeladenes Kind. */
    kinder: [
      { name: 'Mara Berger', initial: 'M', klasse: '8. Klasse', farbe: 'var(--fach-violet)',
        eingeladen: true, aktivitaet: 'vor 3 Stunden', ampel: 'gruen', open: true,
        kz: [
          { n: '6', l: 'Fächer' }, { n: '14', l: 'Themen' }, { n: '9', l: 'Chats diese Woche' },
          { n: '63', l: 'Nachrichten diese Woche' }, { n: '11', l: 'Lernzettel gesamt' },
          { n: '2', l: 'Testklausuren diese Woche' }, { n: '2', l: 'Anstehende Klausuren' }
        ] },
      { name: 'Jonas Berger', initial: 'J', klasse: '6. Klasse', farbe: 'var(--fach-teal)',
        eingeladen: true, aktivitaet: 'vor 2 Tagen', ampel: 'gelb' },
      { name: 'Lea Berger', initial: 'L', klasse: '9. Klasse', farbe: 'var(--fach-amber)',
        eingeladen: false }
    ]
  };
  var ELT_AMPEL_LABEL = { gruen: 'Diese Woche aktiv', gelb: 'Wenig aktiv', rot: 'Kaum aktiv' };
  function parentKidCard() {
    return '<details class="ptx-kid" open>' +
      '<summary><span class="ptx-kid__av">M</span>' +
      '<span class="ptx-kid__id"><b>Mia</b><span>9. Klasse · Gymnasium</span></span>' +
      '<span class="ptx-chip ptx-chip--g"><i></i>diese Woche aktiv</span>' +
      '<span class="ptx-kid__tog" aria-hidden="true"></span></summary>' +
      '<div class="ptx-kid__body"><div class="ptx-kgrid">' + PARENT.kpis.map(function (k) {
        return '<div class="ptx-k"><b>' + k.n + '</b><span>' + k.l + '</span></div>';
      }).join('') + '</div>' +
      '<p class="ptx-kid__hint">Bewusst ohne Chat- oder Lernzettel-Inhalte, ohne Noten — nur, ob Ihr Kind dranbleibt.</p></div></details>';
  }
  function parentReport() {
    return '<div class="ptx-report"><div class="ptx-report__top"><b>Wochenüberblick · Mia</b><span>KW 37</span></div>' +
      '<ul><li><span class="ptx-d g"></span>Mathe · 3 Lerntage erledigt<em>läuft</em></li>' +
      '<li><span class="ptx-d y"></span>Physik · Nachtest offen<em>bis Fr</em></li>' +
      '<li><span class="ptx-d g"></span>Englisch · Lernzettel aktualisiert<em>+2 Themen</em></li></ul>' +
      '<div class="ptx-report__foot">Nächste Klausur: Mathe in 4 Tagen</div></div>';
  }
  function parentCardsHtml() {
    return PARENT.cards.map(function (c) {
      return '<div class="ptx-card"><b>' + c.t + '</b><p>' + c.d + '</p></div>';
    }).join('');
  }

  /* Eine Kind-Karte — 1:1 der Aufbau von kindCard()/kzGrid() in
     app/eltern.html (Avatar + Name + Klasse/letzte Aktivität + Ampel-
     Chip in der Kopfzeile, Wochenüberblick als 7-Kachel-Raster nur beim
     aufgeklappten Kind). Klick auf eine zu-Karte klappt sie nativ auf
     (<details>), genau wie im echten Eltern-Bereich. */
  function eltKidCard(k) {
    var pending = !k.eingeladen;
    var sub = k.klasse + (k.eingeladen
      ? (k.aktivitaet ? ' · zuletzt aktiv ' + k.aktivitaet : ' · noch nicht gestartet')
      : ' · Einladung ausstehend');
    return '<details class="elt-kid-card' + (pending ? ' is-pending' : '') + '"' + (k.open ? ' open' : '') + '>' +
      '<summary><span class="elt-kid-card__av" style="background:' + k.farbe + '">' + k.initial + '</span>' +
      '<span class="elt-kid-card__meta"><b>' + k.name + '</b><span>' + sub + '</span></span>' +
      (k.eingeladen ? '<span class="elt-chip elt-chip--' + k.ampel + '"><i></i>' + ELT_AMPEL_LABEL[k.ampel] + '</span>' : '') +
      '<span class="elt-kid-card__chev">' + KVL_ICON.arr + '</span></summary>' +
      (k.kz
        ? '<div class="elt-kid-card__body"><div class="elt-kzgrid">' + k.kz.map(function (z) {
            return '<div class="elt-kz"><b>' + z.n + '</b><span>' + z.l + '</span></div>';
          }).join('') + '</div>' +
          '<p class="elt-kid-card__hint">Bewusst ohne Chat- oder Lernzettel-Inhalte, ohne Noten — nur, ob Ihr Kind dranbleibt.</p></div>'
        : '') +
    '</details>';
  }
  function eltDemo() {
    return '<div class="elt-demo" data-elt>' +
      '<div class="elt-demo__bar"><i></i><i></i><i></i><span>app.lesify.de/eltern</span></div>' +
      '<div class="elt-demo__in">' + PARENT.kinder.map(eltKidCard).join('') + '</div></div>';
  }

  function renderParent(v) {
    var head = lh(PARENT.eb, PARENT.h, PARENT.lead);
    return lw('parent', v, '<div class="container pt-2col">' +
      '<div class="pt-2col__text">' + head + '<div class="ptx-side pt-2col__cards">' + parentCardsHtml() + '</div></div>' +
      '<div class="pt-2col__demo">' + eltDemo() + '</div></div>');
  }

  /* ---------- FAQ (faq) ---------- */
  var FAQ = {
    eb: 'Häufige Fragen',
    h: 'Was Eltern vor dem Start wissen wollen.',
    items: [
      { q: 'Ersetzt Lesify die Nachhilfe komplett?', a: 'Für Verständnisfragen und Klausurvorbereitung in der Regel ja. Bei tiefen, über Jahre gewachsenen Lücken oder wenn Ihr Kind die Verbindlichkeit eines festen Termins braucht, bleibt persönliche Förderung sinnvoll.' },
      { q: 'Für welche Klassenstufen ist Lesify geeignet?', a: 'Lesify ist für alle Klassenstufen ab dem 5. Schuljahr geeignet. Die KI passt sich dabei automatisch der Klassenstufe an.' },
      { q: 'Macht die KI die Hausaufgaben einfach fertig?', a: 'Nein. Der Hausaufgaben-Modus erklärt den Lösungsweg und stellt Rückfragen, statt nur ein Ergebnis auszugeben.' },
      { q: 'Wie steht es um den Datenschutz?', a: 'Daten werden auf Servern in der EU verarbeitet, jede Familie sieht nur die eigenen Inhalte, hochgeladene Dateien sind nur über kurz gültige Links erreichbar.' },
      { q: 'Was kostet Lesify nach der Testphase?', a: 'Nach 14 Tagen wählst du einen Tarif: Starter, Premium oder Infinite. Im Angebot ab 15,99 € im Monat, monatlich kündbar. Familien-Pakete für 2 bis 4 Kinder.' }
    ]
  };
  function faqDetails(cls, i, it) {
    return '<details class="' + cls + '"' + (i === 0 ? ' open' : '') + '><summary>' + it.q + '<span class="faq-plus" aria-hidden="true"></span></summary><div>' + it.a + '</div></details>';
  }
  function renderFaq(v) {
    var head = lh(FAQ.eb, FAQ.h, ''), headC = lh(FAQ.eb, FAQ.h, '', true);
    if (v === '2') return lw('faq', v, '<div class="container">' + headC +
      '<div class="faq-2col">' + FAQ.items.map(function (it, i) { return faqDetails('faq-item', i, it); }).join('') + '</div></div>');
    if (v === '3') return lw('faq', v, '<div class="container faq-index">' +
      '<div>' + head + '</div>' +
      '<div class="faq-index__list">' + FAQ.items.map(function (it, i) { return faqDetails('faq-item', i, it); }).join('') + '</div></div>');
    if (v === '4') return lw('faq', v, '<div class="container container--narrow">' + head +
      '<div class="faq-plus-list">' + FAQ.items.map(function (it, i) { return faqDetails('faq-item faq-item--plus', i, it); }).join('') + '</div></div>');
    if (v === '5') return lw('faq', v, '<div class="container container--narrow">' + headC +
      '<div class="faq-cards">' + FAQ.items.map(function (it, i) { return faqDetails('faq-item faq-item--card', i, it); }).join('') + '</div></div>');
    if (v === '6') return lw('faq', v, '<div class="container container--narrow">' + headC +
      '<div class="faq-dark">' + FAQ.items.map(function (it, i) { return faqDetails('faq-item', i, it); }).join('') + '</div></div>');
    if (v === '7') return lw('faq', v, '<div class="container container--narrow">' + head +
      '<div class="faq-num">' + FAQ.items.map(function (it, i) {
        return '<details class="faq-item"' + (i === 0 ? ' open' : '') + '><summary><span>' + pad2(i) + '</span>' + it.q + '</summary><div>' + it.a + '</div></details>';
      }).join('') + '</div></div>');
    if (v === '8') return lw('faq', v, '<div class="container container--narrow">' + head +
      '<div class="faq-divide">' + FAQ.items.map(function (it, i) { return faqDetails('faq-item', i, it); }).join('') + '</div></div>');
    if (v === '9') return lw('faq', v, '<div class="container container--narrow faq-centered">' + headC +
      FAQ.items.map(function (it, i) { return faqDetails('faq-item', i, it); }).join('') + '</div>');
    if (v === '10') return lw('faq', v, '<div class="container faq-ask">' +
      '<div>' + head + '<p class="faq-ask__cta">Noch offen? <a href="/kontakt/">Schreib uns</a>.</p></div>' +
      '<div class="faq-ask__list">' + FAQ.items.map(function (it, i) { return faqDetails('faq-item', i, it); }).join('') + '</div></div>');
    /* v1 · Bold — kräftige nummerierte Karten, Kreis-Toggle, Kontakt-Fuß */
    return lw('faq', v, '<div class="container container--narrow faq-bold">' +
      '<div class="lab-head is-center"><span class="eyebrow">' + FAQ.eb + '</span><h2>' + FAQ.h + '</h2>' +
      '<p>Alles, was Eltern vor dem Start klären wollen — kurz beantwortet.</p></div>' +
      '<div class="faq-bold__list">' + FAQ.items.map(function (it, i) {
        return '<details class="faq-bcard"' + (i === 0 ? ' open' : '') + '>' +
          '<summary><span class="faq-bcard__n">' + pad2(i) + '</span><span class="faq-bcard__q">' + it.q + '</span>' +
          '<span class="faq-bcard__tog" aria-hidden="true"></span></summary>' +
          '<div class="faq-bcard__a">' + it.a + '</div></details>';
      }).join('') + '</div>' +
      '<div class="faq-bold__foot"><b>Noch eine Frage offen?</b><a class="btn btn-secondary" href="/kontakt/">Schreib uns</a></div></div>');
  }

  /* ---------- Abschluss-CTA (cta) ---------- */
  var CTA = {
    eb: 'Loslegen',
    h: 'Testen Sie Lesify diese Woche kostenlos.',
    lead: '14 Tage kostenlos testen und Lesify in Ruhe kennenlernen. Jederzeit kündbar, ganz ohne Risiko.',
    small: 'Prototyp mit Demo-Inhalten: die KI-Antworten sind derzeit simulierter Platzhaltertext.'
  };
  function ctaBtns(dark) {
    var c = dark ? ' btn-on-dark' : '';
    return '<div class="lab-cta"><a class="btn btn-primary' + c + ' btn-lg" href="/preise/">Kostenlos starten</a>' +
      '<a class="btn btn-secondary' + c + ' btn-lg" href="/preise/">Preise ansehen</a></div>';
  }
  function renderCta(v) {
    var h = '<h2>' + CTA.h + '</h2>', lead = '<p>' + CTA.lead + '</p>', small = '<small>' + CTA.small + '</small>';
    if (v === '2') return lw('cta', v, '<div class="container cta-split"><div><span class="eyebrow">' + CTA.eb + '</span>' + h + lead + '</div><div class="cta-split__act">' + ctaBtns() + small + '</div></div>');
    if (v === '3') return lw('cta', v, '<div class="container cta-bleed">' + h + lead + ctaBtns(true) + small + '</div>');
    if (v === '4') return lw('cta', v, '<div class="container container--narrow cta-min">' + h + ctaBtns() + '</div>');
    if (v === '5') return lw('cta', v, '<div class="container container--narrow cta-big">' + h + lead + ctaBtns() + '</div>');
    if (v === '6') return lw('cta', v, '<div class="container"><div class="cta-box">' + h + lead + ctaBtns() + small + '</div></div>');
    if (v === '7') return lw('cta', v, '<div class="container"><div class="cta-mesh"><span class="cta-mesh__m1"></span><span class="cta-mesh__m2"></span><div class="cta-mesh__in">' + h + lead + ctaBtns(true) + '</div></div></div>');
    if (v === '8') return lw('cta', v, '<div class="container container--narrow cta-stack">' + h + lead + '<a class="btn btn-primary btn-lg btn-block" href="/preise/">Kostenlos starten</a><a class="btn btn-secondary btn-lg btn-block" href="/preise/">Preise ansehen</a>' + small + '</div>');
    if (v === '9') return lw('cta', v, '<div class="container"><div class="cta-strip"><div><b>' + CTA.h + '</b><span>' + CTA.lead + '</span></div><a class="btn btn-primary btn-lg" href="/preise/">Kostenlos starten</a></div></div>');
    if (v === '10') return lw('cta', v, '<div class="container container--narrow cta-badge"><span class="cta-badge__b">14 Tage gratis</span>' + h + lead + ctaBtns() + '</div>');
    return lw('cta', v, '<div class="container"><div class="cta-band"><span class="eyebrow">' + CTA.eb + '</span>' + h + lead + ctaBtns(true) + small + '</div></div>');
  }

  /* ---------- TLDR — "Was Lesify besonders macht" (tldr) ----------
     Ein Abschnitt direkt hinter dem Hero: verdichtet alle Kernfunktionen
     und Alleinstellungen auf einen Blick. 10 Layout-Varianten um
     dieselben Daten (TLDR), Dev-Panel-Achse "tldr". Reiner Prototyp-
     Content, keine echten Berechnungen. */
  var TLDR_IC = {
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5C4 4.67 4.67 4 5.5 4h13c.83 0 1.5.67 1.5 1.5v10c0 .83-.67 1.5-1.5 1.5H9l-4 3.5v-3.5H5.5C4.67 16.5 4 15.83 4 15V5.5Z"></path></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 3v5h5M9 13h6M9 17h4"></path></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 3v5h5"></path><path d="m9 14 2 2 4-4"></path></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="16" rx="2"></rect><path d="M4 10h16M8 3v4M16 3v4"></path><path d="m9 15 2 2 4-4"></path></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5v-11Z"></path></svg>',
    shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z"></path><path d="m9 12 2 2 4-4"></path></svg>'
  };
  var TLDR = {
    eb: 'Alle Vorteile auf einen Blick',
    h: 'Alles, was Lesify besonders macht — auf einen Blick.',
    lead: 'Statt Chaos aus Heften, Apps, KI-Chats und Erklär-Videos gibt es bei uns alles an einem Ort – strukturiertes lernen statt planlos büffeln.',
    points: [
      { ic: 'cal', t: 'Klausurvorbereitung mit Plan', s: 'Ein fester Lernplan plus Testklausuren führt Ihr Kind Schritt für Schritt bis zur Prüfung.', m: 'Ein fester Lernplan plus Testklausuren führt Ihr Kind Schritt für Schritt bis zur Prüfung.', d: 'Ein fester Lernplan plus Testklausuren führt Ihr Kind Schritt für Schritt bis zur Prüfung.' },
      { ic: 'check', t: 'Testklausuren mit echter Note', s: 'Realistische Probeklausuren decken Schwachstellen auf, damit Ihr Kind sie gezielt verbessern kann.', m: 'Realistische Probeklausuren decken Schwachstellen auf, damit Ihr Kind sie gezielt verbessern kann.', d: 'Realistische Probeklausuren decken Schwachstellen auf, damit Ihr Kind sie gezielt verbessern kann.' },
      { ic: 'cal', t: 'Automatisch erstellte Lernpläne', s: 'Der Lernplan entsteht aus dem Testklausur-Ergebnis und verbessert gezielt die Schwachstellen.', m: 'Der Lernplan entsteht aus dem Testklausur-Ergebnis und verbessert gezielt die Schwachstellen.', d: 'Der Lernplan entsteht aus dem Testklausur-Ergebnis und verbessert gezielt die Schwachstellen.' },
      { ic: 'chat', t: 'Für Schüler entwickelte KI', s: 'Eine KI, die altersgerecht erklärt und beim Verstehen hilft, aber keine fertigen Lösungen ausgibt.', m: 'Eine KI, die altersgerecht erklärt und beim Verstehen hilft, aber keine fertigen Lösungen ausgibt.', d: 'Eine KI, die altersgerecht erklärt und beim Verstehen hilft, aber keine fertigen Lösungen ausgibt.' },
      { ic: 'folder', t: 'Organisation nach Fach und Thema', s: 'Alle Chats, Lernzettel und Dokumente sind immer sauber nach Fach und Thema geordnet.', m: 'Alle Chats, Lernzettel und Dokumente sind immer sauber nach Fach und Thema geordnet.', d: 'Alle Chats, Lernzettel und Dokumente sind immer sauber nach Fach und Thema geordnet.' },
      { ic: 'doc', t: 'Erstellung von Lernzetteln', s: 'Vor jeder Klausur fasst ein Lernzettel alle wichtigen Themen kompakt auf einem Blatt zusammen.', m: 'Vor jeder Klausur fasst ein Lernzettel alle wichtigen Themen kompakt auf einem Blatt zusammen.', d: 'Vor jeder Klausur fasst ein Lernzettel alle wichtigen Themen kompakt auf einem Blatt zusammen.' }
    ],
    stats: [
      { n: '24/7', l: 'erreichbar' },
      { n: 'ab 12,99 €', l: 'im Monat' }
    ],
    chips: ['14 Tage kostenlos', 'Keine Kreditkarte', 'Server in der EU', 'Monatlich kündbar']
  };
  function tldrCta(dark) {
    var c = dark ? ' btn-on-dark' : '';
    return '<div class="lab-cta"><a class="btn btn-primary' + c + ' btn-lg" href="/preise/">Kostenlos starten</a>' +
      '<a class="btn btn-secondary' + c + ' btn-lg" href="#kv">Mehr erfahren</a></div>';
  }
  function tldrItems(kind) {
    return TLDR.points.map(function (p, i) {
      if (kind === 'num') {
        return '<li class="tldr-num__row"><span class="tldr-num__n">' + pad2(i) + '</span>' +
          '<div><b>' + p.t + '</b><p>' + p.d + '</p></div></li>';
      }
      if (kind === 'line') {
        return '<li class="tldr-line__row"><span class="tldr-line__ic">' + TLDR_IC[p.ic] + '</span>' +
          '<div><b>' + p.t + '</b><p>' + p.d + '</p></div></li>';
      }
      if (kind === 'zebra') {
        return '<div class="tldr-zebra__row"><span class="tldr-zebra__ic">' + TLDR_IC[p.ic] + '</span>' +
          '<div class="tldr-zebra__tx"><b>' + p.t + '</b><p>' + p.d + '</p></div></div>';
      }
      if (kind === 'crow' || kind === 'crowm') {
        return '<div class="tldr-crow"><span class="tldr-crow__ic">' + TLDR_IC[p.ic] + '</span>' +
          '<div><b>' + p.t + '</b><p>' + (kind === 'crowm' ? p.m : p.s) + '</p></div></div>';
      }
      if (kind === 'ledger') {
        return '<div class="tldr-ledger__row"><span class="tldr-ledger__ic">' + TLDR_IC[p.ic] + '</span>' +
          '<b>' + p.t + '</b><span class="tldr-ledger__d">' + p.s + '</span></div>';
      }
      return '<article class="tldr-card"><span class="tldr-card__ic">' + TLDR_IC[p.ic] + '</span>' +
        '<h3>' + p.t + '</h3><p>' + p.d + '</p></article>';
    }).join('');
  }
  function tldrStats(cls) {
    return '<div class="tldr-stats' + (cls ? ' ' + cls : '') + '">' + TLDR.stats.map(function (s) {
      return '<div class="tldr-stat"><b>' + s.n + '</b><span>' + s.l + '</span></div>';
    }).join('') + '</div>';
  }
  function tldrChips() {
    return '<ul class="tldr-chips">' + TLDR.chips.map(function (c) {
      return '<li>' + LAB_CHECK + c + '</li>';
    }).join('') + '</ul>';
  }
  function renderTldr(v) {
    var head = lh(TLDR.eb, TLDR.h, TLDR.lead), headC = lh(TLDR.eb, TLDR.h, TLDR.lead, true);

    /* 2 · Bento — dunkle Leitzelle links, Feature-Zellen rechts */
    if (v === '2') return lw('tldr', v, '<div class="container"><div class="tldr-bento">' +
      '<div class="tldr-bento__lead"><span class="eyebrow">' + TLDR.eb + '</span><h2>' + TLDR.h + '</h2>' +
      '<p>' + TLDR.lead + '</p>' + tldrCta(true) + '</div>' + tldrItems('card') + '</div></div>');

    /* 3 · Split — Sticky-Aside + vertikale Liste */
    if (v === '3') return lw('tldr', v, '<div class="container"><div class="tldr-split">' +
      '<aside class="tldr-split__aside">' + head + tldrStats('is-stack') + tldrCta() + '</aside>' +
      '<ul class="tldr-split__list">' + tldrItems('line') + '</ul></div></div>');

    /* 4 · Rail — horizontaler Scroller */
    if (v === '4') return lw('tldr', v, '<div class="container">' + headC +
      '<div class="tldr-rail">' + tldrItems('card') + '</div>' + tldrChips() + '</div>');

    /* 5 · Dark — dunkler Abschnitt, 2-Spalten-Liste + Stat-Fuß */
    if (v === '5') return lw('tldr', v, '<div class="container">' + head +
      '<ul class="tldr-dark__list">' + tldrItems('line') + '</ul>' +
      '<div class="tldr-dark__foot">' + tldrStats('is-inline') + tldrCta(true) + '</div></div>');

    /* 6 · Ziffern — nummerierte Editorial-Liste, keine Karten */
    if (v === '6') return lw('tldr', v, '<div class="container container--narrow">' + head +
      '<ol class="tldr-num">' + tldrItems('num') + '</ol>' + tldrCta() + '</div>');

    /* 7 · Liste — zentriert schmal, Icon-Chip-Zeilen + Trust-Chips */
    if (v === '7') return lw('tldr', v, '<div class="container container--narrow">' + headC +
      '<ul class="tldr-line">' + tldrItems('line') + '</ul>' + tldrChips() + '</div>');

    /* 8 · Pills — Feature-Pills, darunter kompakte 2-Spalten */
    if (v === '8') return lw('tldr', v, '<div class="container">' + head +
      '<ul class="tldr-pills">' + TLDR.points.map(function (p) {
        return '<li>' + TLDR_IC[p.ic] + p.t + '</li>';
      }).join('') + '</ul>' +
      '<ul class="tldr-mini">' + TLDR.points.map(function (p) {
        return '<li>' + LAB_CHECK + '<div><b>' + p.t + '</b><span>' + p.d + '</span></div></li>';
      }).join('') + '</ul></div>');

    /* 9 · Zebra — abwechselnde volle Reihen + Stat-Band */
    if (v === '9') return lw('tldr', v, '<div class="container">' + head +
      '<div class="tldr-zebra">' + tldrItems('zebra') + '</div>' + tldrStats('is-band') + '</div>');

    /* 10 · Panorama — 3 Spalten mit Akzentkante, Zahlen als Punktzeile */
    if (v === '10') return lw('tldr', v, '<div class="container">' + headC +
      '<p class="tldr-pano__facts">' + TLDR.stats.map(function (s) {
        return '<span><b>' + s.n + '</b> ' + s.l + '</span>';
      }).join('') + '</p>' +
      '<div class="tldr-pano">' + tldrItems('card') + '</div></div>');

    /* ---- Kompakt-Runde (11–15): dichter, weniger Höhe. Aufsätze auf
       v1 (Grid), v2 (Bento) und v5 (Dark) plus zwei neue Kurzformen.
       Nutzen die Kurztexte (point.s) statt der langen Beschreibung. ---- */

    /* 11 · Grid Kompakt — v1 gestrafft: Icon neben Titel, Kurztext,
       Zahlen als schmale Inline-Zeile statt Stat-Leiste. */
    if (v === '11') return lw('tldr', v, '<div class="container">' + head +
      '<div class="tldr-cgrid">' + tldrItems('crow') + '</div>' +
      tldrStats('is-inline is-slim') + '</div>');

    /* 12 · Bento Kompakt — v2 gestrafft: dunkle Leitzelle wird zur
       flachen Kopfleiste (Headline + Lead + CTA nebeneinander),
       darunter kompaktes 3-Spalten-Raster. */
    if (v === '12') return lw('tldr', v, '<div class="container"><div class="tldr-cbento">' +
      '<div class="tldr-cbento__bar"><div><span class="eyebrow">' + TLDR.eb + '</span>' +
      '<h2>' + TLDR.h + '</h2></div>' + tldrCta(true) + '</div>' +
      '<div class="tldr-cbento__grid">' + tldrItems('crow') + '</div></div></div>');

    /* 13 · Dark Kompakt — v5 gestrafft: schwarzer Abschnitt über die volle
       Breite, Kopf + Zahlen in einer Zeile, Punkte als kompaktes
       3-Spalten-Raster (je ein voller Satz). */
    if (v === '13') return lw('tldr', v, '<div class="container"><div class="tldr-cdark">' +
      '<div class="tldr-cdark__head"><div class="lab-head"><span class="eyebrow">' + TLDR.eb + '</span>' +
      '<h2>' + TLDR.h + '</h2></div>' + tldrStats('is-inline') + '</div>' +
      '<div class="tldr-cdark__grid">' + tldrItems('crowm') + '</div>' + tldrCta(true) + '</div></div>');

    /* 14 · Ledger — sehr flache Spec-Sheet-Liste: Icon | Titel | Kurztext
       pro Zeile, Haarlinien dazwischen, Zahlen als Fußzeile im selben Rahmen. */
    if (v === '14') return lw('tldr', v, '<div class="container">' + head +
      '<div class="tldr-ledger">' + tldrItems('ledger') +
      '<div class="tldr-ledger__foot">' + tldrStats('is-inline') + '</div></div></div>');

    /* 15 · Split Kompakt — v3-Idee gestrafft: schmales Aside (Kopf + CTA),
       rechts geteilte Kurzliste; Zahlen als Inline-Zeile unter dem Split. */
    if (v === '15') return lw('tldr', v, '<div class="container"><div class="tldr-csplit">' +
      '<aside class="tldr-csplit__aside">' + head + tldrCta() + '</aside>' +
      '<div class="tldr-csplit__list">' + tldrItems('crow') + '</div>' +
      '</div>' + tldrStats('is-inline is-slim') + '</div>');

    /* 16 · Split Dark — v15 im schwarzen Vollbreiten-Abschnitt: Aside
       (Kopf + CTA) links, geteilte Liste rechts (je ein voller Satz),
       Zahlen als Inline-Zeile im Fuß. */
    if (v === '16') return lw('tldr', v, '<div class="container"><div class="tldr-csplit tldr-csplit--dark">' +
      '<aside class="tldr-csplit__aside">' + head + tldrCta(true) + '</aside>' +
      '<div class="tldr-csplit__list">' + tldrItems('crowm') + '</div>' +
      '<div class="tldr-csplit__foot">' + tldrStats('is-inline is-slim') + '</div>' +
      '</div></div>');

    /* 1 · Grid — 3-Spalten-Karten + Stat-Leiste (Default) */
    return lw('tldr', v, '<div class="container">' + head +
      '<div class="tldr-grid">' + tldrItems('card') + '</div>' + tldrStats('is-bar') + '</div>');
  }

  /* Finales Layout: alle Sections fest gewählt, kein Dev-Panel mehr.
     tldr bleibt als eigener Abschnitt (v16 Split Dark, direkt hinter dem
     Hero). subj/test entfallen als eigene Sections (subj-Inhalt steckt in
     org, test-Inhalt in price). */
  var LAB_SECTIONS = [
    { key: 'tldr', render: renderTldr, fixed: '16' },
    { key: 'kv', render: renderKv, init: kvlInit, fixed: '5' },
    { key: 'org', render: renderOrg, init: orgInit, fixed: '11' },
    { key: 'orgfaecher', render: renderOrgFaecher, fixed: '2' },
    { key: 'cmp', render: renderCmp, fixed: '1' },
    { key: 'price', render: renderPrice, init: priceInit, fixed: '4' },
    { key: 'parent', render: renderParent, fixed: '1' },
    { key: 'faq', render: renderFaq, fixed: '1' },
    { key: 'cta', render: renderCta, fixed: '1' }
  ];
  var LAB_LABELS = {
    tldr: [['1', 'Grid'], ['2', 'Bento'], ['3', 'Split'], ['4', 'Rail'], ['5', 'Dark'], ['6', 'Ziffern'], ['7', 'Liste'], ['8', 'Pills'], ['9', 'Zebra'], ['10', 'Panorama'], ['11', 'Grid Kompakt'], ['12', 'Bento Kompakt'], ['13', 'Dark Kompakt'], ['14', 'Ledger'], ['15', 'Split Kompakt'], ['16', 'Split Dark']],
    kv: [['1', 'Split'], ['2', 'Fenster'], ['3', 'Sticky'], ['4', 'Flip'], ['5', 'Zentriert'], ['6', 'Dark'], ['7', 'Bento'], ['8', 'Timeline']],
    org: [['1', 'Zentriert'], ['2', 'Split'], ['3', 'Flip'], ['4', 'Fenster'], ['5', 'Sticky'], ['6', 'Dark'], ['7', 'Bento'], ['8', 'Zebra'], ['9', 'Karten'], ['10', 'Editorial'], ['11', 'Erklär-Split'], ['12', 'Erklär-Flip'], ['13', 'Erklär-Karten'], ['14', 'Erklär-Sticky'], ['15', 'Erklär-Dark']],
    orgfaecher: [['1', 'Zahlen-Kachel'], ['2', 'Ghost'], ['3', 'Avatar-Stack'], ['4', 'Pill-Reihe'], ['5', 'Bento'], ['6', 'Dark'], ['7', 'Scroll-Reihe'], ['8', 'Kompakt-Liste'], ['9', 'Ring'], ['10', 'Editorial']],
    cmp: [['1', 'Cards'], ['2', 'Empfohlen'], ['3', 'Gleichung'], ['4', 'Tabelle'], ['5', 'Dark'], ['6', 'Lead-in'], ['7', 'Punktestand'], ['8', 'Pills'], ['9', 'Preisschild'], ['10', 'Bento'], ['11', 'Aktuell']],
    subj: [['1', 'Grid'], ['2', 'Big'], ['3', 'Bento'], ['4', 'Scroll'], ['5', 'Split']],
    price: [['1', 'Cards'], ['2', 'Raised'], ['3', 'Spotlight'], ['4', 'Dark-Feat'], ['5', 'Glow'], ['6', 'Strip']],
    test: [['1', 'Hero'], ['2', 'Split'], ['3', 'Wall'], ['4', 'Marquee'], ['5', 'Dark'], ['6', 'Thumbs'], ['7', 'Spotlight'], ['8', 'Bento'], ['9', 'Masonry'], ['10', 'Circles']],
    parent: [['1', 'Kinder']], /* final gewählt (Nachbau app/eltern.html), kein Dev-Panel mehr */
    faq: [['1', 'Bold'], ['2', '2-Col'], ['3', 'Index'], ['4', 'Plus'], ['5', 'Cards'], ['6', 'Dark'], ['7', 'Numbered'], ['8', 'Divided'], ['9', 'Centered'], ['10', 'Ask']],
    cta: [['1', 'Band'], ['2', 'Split'], ['3', 'Bleed'], ['4', 'Minimal'], ['5', 'Big-Type'], ['6', 'Box'], ['7', 'Mesh'], ['8', 'Stack'], ['9', 'Strip'], ['10', 'Badge']]
  };

  function labSectionApi(sec) {
    var max = LAB_LABELS[sec.key].length;
    function variant() {
      if (sec.fixed) return sec.fixed; /* final gewählt, kein Dev-Panel-Umschalter */
      try { var v = localStorage.getItem('lesify:' + sec.key + ':v'); if (RX10.test(v) && +v <= max) return v; } catch (e) {}
      return sec.def || '1';
    }
    function build() {
      var host = document.getElementById(sec.key + '-section');
      if (!host) return;
      var v = variant();
      var el = document.getElementById(sec.key);
      if (el) el.setAttribute('data-' + sec.key, v);
      host.innerHTML = sec.render(v);
      markRevealBlocks(host);
      if (sec.init) sec.init(host, v);
    }
    return { key: sec.key, get: variant, apply: build, build: build, list: LAB_LABELS[sec.key], fixed: sec.fixed };
  }
  var LAB_API = LAB_SECTIONS.map(labSectionApi);
  function buildLabSections() { LAB_API.forEach(function (a) { a.build(); }); }

  /* =========================================================
     Feature-Unterseiten (feature-*.html) — EIN gemeinsames Schritt-
     Layout, das jede der fünf Seiten aus ihren eigenen Schritten füllt.
     Kein Snap-Scroll: die Schritte stehen als normale Sektionen
     untereinander (Text links, Demo rechts; auf Mobile Text über Demo).
     Die Demos sind die vorhandenen interaktiven Bausteine der Startseite
     (chatDemoMarkup/initChatDemo, chatAppMarkup, kvxMock/kvInit,
     kvxDays, kvxAmpelCards) bzw. daraus zusammengesetzte Karten.
     Seite wählt über <body data-feature="…"> (siehe FEATURE_PAGES).
     ========================================================= */
  var FEAT_ARROW_UP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>';
  var FEAT_FILE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"></path><path d="M14 3v5h5"></path></svg>';
  var FEAT_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';

  function featCard(h, inner) {
    return '<div class="feat-demo-card">' + (h ? '<div class="feat-demo-card__h">' + h + '</div>' : '') + inner + '</div>';
  }
  function featChecks(items) {
    return '<ul class="feat-step__list">' + items.map(function (t) {
      return '<li>' + LAB_CHECK + '<span>' + t + '</span></li>';
    }).join('') + '</ul>';
  }
  function featModes() {
    return featCard('Vier Modi', '<ul class="feat-modes">' + CHAT_MODES.map(function (m) {
      return '<li><span class="feat-modes__ico">' + m.i + '</span><div><b>' + m.l + '</b><p>' + m.d + '</p></div></li>';
    }).join('') + '</ul>');
  }
  function featThemenCard() {
    return featCard(KVX.fach + ' · ' + KVX.countdown,
      '<div class="kvx__title" style="font-size:1rem;font-weight:600;margin-bottom:14px">' + KVX.titel + '</div>' +
      '<div class="kvx__themen">' + KVX.themen.map(function (t) {
        return '<span class="kvx__thema"><i class="kvx__dot kvx__dot--' + t.a + '"></i>' + t.n + '</span>';
      }).join('') + '</div>');
  }
  function featAmpelCard(h) {
    return featCard(h || 'Ampel pro Thema', '<div class="kvx__cards">' + kvxAmpelCards(KVX.t1.pro) + '</div>');
  }
  function featNoteCard() {
    return featCard('Testklausur 1',
      '<div class="kvx__note kvx__note--' + KVX.t1.ampel + '"><span class="kvx__note-num">' + KVX.t1.note + '</span>' +
      '<span class="kvx__note-meta"><span class="kvx__note-cap">Eingefroren</span>' +
      '<span class="kvx__note-lbl">Freie Antworten, aufgabenweise korrigiert</span></span></div>' +
      '<div class="kvx__cards">' + kvxAmpelCards(KVX.t1.pro) + '</div>');
  }
  function featCompareCard() {
    return featCard('Testklausur 1 → 2', '<div class="kvx__compare">' + KVX.t1.pro.map(function (p, i) {
      var q = KVX.t2.pro[i];
      return '<div class="kvx__cmp-row"><span class="kvx__cmp-th">' + p.th + '</span>' +
        '<span class="kvx-chip kvx-chip--' + p.a + '">' + p.note + '</span>' +
        '<span class="kvx__cmp-arw">→</span>' +
        '<span class="kvx-chip kvx-chip--' + q.a + '">' + q.note + '</span></div>';
    }).join('') + '</div>');
  }
  function featZettelCard() {
    return featCard('Lernzettel · Bruchterme & Gleichungen',
      '<div class="kvx__zettel">' + KVX.lernzettel.map(function (z) {
        return '<div class="kvx__zettel-item"><b>' + z.h + '</b><p>' + z.b + '</p></div>';
      }).join('') + '</div>');
  }
  function featGradeCard() {
    return '<div class="lab-grade">' +
      '<div class="lab-grade__top"><span>Testklausur · Deutsch</span>' +
      '<span class="lab-grade__delta">' + FEAT_ARROW_UP + ' +0,8</span></div>' +
      '<div class="lab-grade__big">2,4</div>' +
      '<span class="lab-grade__meta">5 Aufgaben · Wunschnote 2,5 · noch 6 Tage</span>' +
      '<div class="lab-grade__rows">' +
        '<div class="lab-grade__row"><span class="d g"></span><span class="l">Wortarten</span><span class="bar"><i class="g" style="width:86%"></i></span><span class="g">1,8</span></div>' +
        '<div class="lab-grade__row"><span class="d y"></span><span class="l">Satzglieder</span><span class="bar"><i class="y" style="width:50%"></i></span><span class="g">3,3</span></div>' +
        '<div class="lab-grade__row"><span class="d r"></span><span class="l">Kommasetzung</span><span class="bar"><i class="r" style="width:30%"></i></span><span class="g">4,1</span></div>' +
      '</div></div>';
  }
  function featGenerateCard() {
    var rows = [
      { th: 'Bruchterme kürzen', a: 'Aufgabe 1 · 6 P.' },
      { th: 'Bruchgleichungen', a: 'Aufgabe 2 · 10 P.' },
      { th: 'Termumformung', a: 'Aufgabe 3 · 8 P.' }
    ];
    return featCard('Testklausur wird erstellt', '<ul class="feat-rows">' + rows.map(function (r) {
      return '<li><span class="feat-rows__k">' + r.th + '</span><span class="feat-rows__v">' + r.a + '</span></li>';
    }).join('') + '</ul><p class="feat-rows__note">Freie Antworten, kein Multiple Choice — 24 Punkte gesamt.</p>');
  }
  function featUploadCard() {
    return featCard('Lösung hochladen',
      '<div class="feat-upload">' +
        '<div class="feat-upload__file"><span class="feat-upload__ico">' + FEAT_FILE + '</span>' +
        '<span class="feat-upload__meta"><b>klausur-loesung.pdf</b><span>3 Seiten · 1,8 MB</span></span>' +
        '<span class="feat-upload__ok">' + LAB_CHECK + '</span></div>' +
        '<div class="feat-upload__bar"><i style="width:100%"></i></div>' +
        '<p class="feat-rows__note">Foto oder PDF — Lesify liest die Handschrift und ordnet jede Antwort ihrer Aufgabe zu.</p>' +
      '</div>');
  }
  function featCorrectionCard() {
    var rows = [
      { th: 'Aufgabe 1 · Bruchterme kürzen', p: '6 / 6', a: 'gruen', note: 'Vollständig gekürzt, Rechenweg sauber notiert.' },
      { th: 'Aufgabe 2 · Bruchgleichungen', p: '4 / 10', a: 'rot', note: 'Definitionsmenge fehlt, dadurch eine Scheinlösung übernommen.' },
      { th: 'Aufgabe 3 · Termumformung', p: '5 / 8', a: 'gelb', note: 'Ansatz richtig, Vorzeichenfehler im zweiten Schritt.' }
    ];
    return featCard('Korrektur — aufgabenweise', '<div class="kvx__cards">' + rows.map(function (r) {
      return '<div class="kvx__card kvx__card--' + r.a + '" style="flex-wrap:wrap">' +
        '<span style="flex:1 1 60%">' + r.th + '</span>' +
        '<span class="kvx-chip kvx-chip--' + r.a + '">' + r.p + '</span>' +
        '<span style="flex:1 1 100%;font-weight:400;color:var(--ink-600);font-size:0.8rem">' + r.note + '</span></div>';
    }).join('') + '</div>');
  }
  function featBarsCard() {
    return featCard('Punkte pro Thema',
      '<div class="lab-bars" style="height:110px;gap:14px;justify-content:center">' +
        '<i class="g" style="height:88%"></i><i class="r" style="height:40%"></i><i class="y" style="height:62%"></i>' +
      '</div>' +
      '<div class="kvx__cards" style="margin-top:16px">' + kvxAmpelCards(KVX.t1.pro) + '</div>');
  }
  function featFilesCard() {
    var files = [
      { n: 'Arbeitsblatt Bruchterme.pdf', s: 'eingelesen' },
      { n: 'Hefteintrag 14.09.jpg', s: 'eingelesen' },
      { n: 'Merksätze Gleichungen.pdf', s: 'eingelesen' }
    ];
    return featCard('Dateien im Thema', '<ul class="feat-rows">' + files.map(function (f) {
      return '<li><span class="feat-rows__k"><span class="feat-upload__ico feat-upload__ico--sm">' + FEAT_FILE + '</span>' + f.n + '</span>' +
        '<span class="kvx-chip kvx-chip--gruen">' + f.s + '</span></li>';
    }).join('') + '</ul><p class="feat-rows__note">Bis 5 MB pro Datei. Jede wird einmal zusammengefasst und steht danach in jedem Chat des Themas bereit.</p>');
  }
  function featSearchCard() {
    var hits = [
      { t: 'Lernzettel · Bruchgleichung lösen', m: 'Erst Definitionsmenge, dann mit dem Hauptnenner …' },
      { t: 'KI-Chat · pq-Formel Schritt für Schritt', m: 'Nimm x² + 6x + 5 = 0 — was ist hier p …' },
      { t: 'Testklausur 1 · Aufgabe 2', m: 'Bruchgleichungen · 4 / 10 Punkte · rot' }
    ];
    return featCard('Suche',
      '<div class="feat-search"><span class="feat-search__ico">' + FEAT_SEARCH + '</span>' +
      '<span class="feat-search__q">bruchgleichung</span></div>' +
      '<ul class="feat-hits">' + hits.map(function (h) {
        return '<li><b>' + h.t + '</b><span>' + h.m + '</span></li>';
      }).join('') + '</ul>');
  }

  var FEATURE_PAGES = {
    'feature-chat': {
      eb: 'AI Chat',
      h: 'Ein KI-Chat, der erklärt — nicht vorsagt.',
      intro: 'Jeder Chat gehört zu einem Fach und einem Thema, kennt dessen Lernzettel und Dateien und bleibt beim Niveau der Jahrgangsstufe. So arbeitet der Lesify-Chat, Schritt für Schritt.',
      steps: [
        { eb: 'Vier Arbeitsweisen', h: 'Ein Chat, vier Modi',
          t: 'Erklären, Hausaufgaben, Üben, Zusammenfassen — dein Kind wählt vor jeder Frage, wie der Chat antworten soll. Der Modus steuert Tonfall und Tiefe, das Thema bleibt gleich.',
          demo: featModes },
        { eb: 'Verstehen', h: 'Erklärt den Weg, nicht die Lösung',
          t: 'Der Chat zeigt den Lösungsweg in Schritten und stellt Rückfragen, statt ein Ergebnis auszuwerfen. Probier die Beispiele aus oder stell eine eigene Frage.',
          list: ['Antworten auf dem Niveau der 8./9. Klasse', 'Rückfragen prüfen, ob es wirklich sitzt', 'Beispiele statt reiner Definitionen'],
          demo: function () { return chatDemoMarkup({ frame: true, size: 'lg' }); } },
        { eb: 'Kontext', h: 'Kennt Lernzettel und Dateien des Themas',
          t: 'Jeder Chat liegt im Thema und greift auf dessen Lernzettel, Arbeitsblätter und abfotografierte Hefteinträge zu. Dein Kind fragt nie im luftleeren Raum — und aus den Antworten wächst der Lernzettel weiter.',
          demo: function () { return chatAppMarkup({ chrome: true, sidebar: true }); } },
        { eb: 'Für Eltern', h: 'Nachvollziehbar, ohne Mitlesen',
          t: 'Das Elternkonto bekommt einen ruhigen Wochenüberblick zu Fortschritt und offenen Themen. Den Wortlaut der Chats sieht nur das Kind.',
          demo: parentReport },
        { eb: 'Sicher', h: 'Beim Fach, beim Thema, beim Stoff',
          t: 'Ein fester Themen-Riegel hält jeden Chat beim Schulstoff. Verarbeitung DSGVO-konform auf Servern in der EU.',
          demo: chatPerkChecks }
      ]
    },
    'feature-klausurvorbereitung': {
      eb: 'Klausurvorbereitung',
      h: 'Der ganze Weg zur Klausur — an einem Ort.',
      intro: 'Testklausur, Lernplan, Lernzettel und die zweite Testklausur greifen ineinander: Lesify misst den Stand, baut den Plan, begleitet die Lernphase und prüft am Ende noch einmal nach.',
      steps: [
        { eb: 'Anlegen', h: 'Klausur eintragen, Themen zuordnen',
          t: 'Fach, Termin und die Themen der Klausur eintragen. Lesify plant ab hier rückwärts vom Klausurtag.',
          demo: featThemenCard },
        { eb: 'Standort', h: 'Erste Testklausur misst den Stand',
          t: 'Eine echte Übungsklausur pro Thema, aufgabenweise korrigiert. Das Ergebnis wird eingefroren und liefert eine Ampel je Thema.',
          demo: featNoteCard },
        { eb: 'Plan', h: 'Der Lernplan entsteht automatisch',
          t: 'Aus der Ampel baut Lesify einen Tagesplan über die Woche vor der Klausur — schwache Themen zuerst, mit den meisten Einheiten.',
          demo: function () { return featCard('Lernplan · 7 Tage', kvxDays(false)); } },
        { eb: 'Lernphase', h: 'Jeder Tag führt in den Chat',
          t: 'Die Lerntage werden abgehakt, jeder Schritt öffnet den passenden KI-Chat im richtigen Thema — erklären, üben, mündlich abfragen.',
          demo: function () { return featCard('Lernphase · Tag 4 von 7', kvxDays(true)); } },
        { eb: 'Kontrolle', h: 'Zweite Testklausur bestätigt den Stand',
          t: 'Kurz vor der Klausur prüft eine zweite Testklausur nach. Der direkte Vergleich zeigt, welche Themen von Gelb oder Rot auf Grün gewandert sind.',
          demo: featCompareCard },
        { eb: 'Überblick', h: 'Alles in einem Cockpit',
          t: 'Countdown, Themen-Ampel, Lernzettel und der nächste Lerntag stehen zusammen. Das Panel läuft den kompletten Ablauf einmal durch.',
          demo: function () { return kvxMock({ chrome: true }); } }
      ]
    },
    'feature-lernplaene': {
      eb: 'Lernpläne',
      h: 'Ein Tagesplan, der rückwärts vom Klausurtag denkt.',
      intro: 'Kein starrer Wochenplan: Lesify verteilt die Themen auf die Tage vor der Klausur, gewichtet nach der Ampel aus der Testklausur, und verlinkt jeden Tag mit dem passenden Chat.',
      steps: [
        { eb: 'Rückwärts geplant', h: 'Sieben Tage bis zum Klausurtag',
          t: 'Der Plan beginnt am Klausurtag und füllt die Tage davor auf. Jeder Tag hat ein klares Thema statt einer vagen To-do-Liste.',
          demo: function () { return featCard('Lernplan · Bruchterme & Gleichungen', kvxDays(false)); } },
        { eb: 'Priorität', h: 'Schwache Themen bekommen mehr Zeit',
          t: 'Rote Themen stehen oben und bekommen die meisten Einheiten, grüne nur eine kurze Auffrischung. Die Gewichtung kommt direkt aus der Testklausur-Ampel.',
          demo: function () { return featAmpelCard('Ampel aus Testklausur 1'); } },
        { eb: 'Direkt lernen', h: 'Ein Klick in den passenden Chat',
          t: 'Jeder Planschritt öffnet den KI-Chat im richtigen Thema mit einem vorformulierten Einstieg — drei Übungsaufgaben, Lösungsweg prüfen, mündlich abfragen.',
          demo: function () { return chatDemoMarkup({ frame: true, size: 'lg' }); } },
        { eb: 'Fortschritt', h: 'Abhaken — und Warnung, wenn es eng wird',
          t: 'Erledigte Tage werden abgehakt, offene Nachtests bleiben sichtbar. Wird die Zeit bis zur Klausur knapp, meldet Lesify das früh genug.',
          demo: function () {
            return featCard('Lernphase · Tag 4 von 7', kvxDays(true) +
              '<p class="feat-warn">Noch 2 offene Nachtests bei 3 verbleibenden Tagen — heute mit Bruchgleichungen starten.</p>');
          } }
      ]
    },
    'feature-testklausuren': {
      eb: 'Testklausuren',
      h: 'Eine echte Übungsklausur — korrigiert wie vom Lehrer.',
      intro: 'Freie Antworten statt Ankreuzen: Lesify erzeugt Aufgaben aus deinen Themen, korrigiert die hochgeladene Lösung aufgabenweise und rechnet eine Note auf der deutschen Skala 1–6 aus.',
      steps: [
        { eb: 'Erzeugen', h: 'Aufgaben aus deinen Themen',
          t: 'Pro Thema eine Aufgabe mit freier Antwort, abgestimmt auf das Niveau der Jahrgangsstufe. Kein Multiple Choice.',
          demo: featGenerateCard },
        { eb: 'Schreiben', h: 'Drucken, in Ruhe lösen, hochladen',
          t: 'Dein Kind bearbeitet die Klausur auf Papier und lädt die Lösung als Foto oder PDF hoch. Lesify erkennt die Handschrift und ordnet jede Antwort ihrer Aufgabe zu.',
          demo: featUploadCard },
        { eb: 'Korrektur', h: 'Aufgabenweise, mit Begründung',
          t: 'Jede Aufgabe bekommt Punkte und eine kurze Erklärung, was gefehlt hat. So ist nachvollziehbar, wie die Note zustande kommt.',
          demo: featCorrectionCard },
        { eb: 'Note', h: 'Eine Note auf der Skala 1–6',
          t: 'Aus den Teilpunkten rechnet Lesify eine Gesamtnote und vergleicht sie mit der Wunschnote. Die Prognose aktualisiert sich mit jedem bestandenen Nachtest.',
          demo: featGradeCard },
        { eb: 'Ampel', h: 'Pro Thema eine Farbe',
          t: 'Grün heißt sitzt, Gelb wackelt, Rot muss noch. Die Ampel steuert direkt den Lernplan und die Nachtests.',
          demo: featBarsCard }
      ]
    },
    'feature-lernzettel': {
      eb: 'Lernzettel',
      h: 'Lernzettel, die aus den Chats entstehen.',
      intro: 'Kein leeres Blatt: Lesify fasst die Lern-Chats und Dateien eines Themas zu einem kompakten Lernzettel zusammen — und der lässt sich danach im Chat weiter anpassen.',
      steps: [
        { eb: 'Automatisch', h: 'Wächst aus den Lern-Chats',
          t: 'Definitionen, Formeln und typische Fehler werden auf Knopfdruck aus den Gesprächen eines Themas zusammengezogen. Neue Chats ergänzen den Zettel.',
          demo: featZettelCard },
        { eb: 'Anpassen', h: 'Im Chat kürzen, ergänzen, umformulieren',
          t: 'Ein Satz zu lang, eine Merkregel fehlt? Dein Kind sagt es dem Chat, und der Lernzettel wird angepasst. Die ersten zehn Änderungen pro Zettel sind inklusive.',
          demo: function () { return chatDemoMarkup({ frame: true, size: 'lg' }); } },
        { eb: 'Kontext', h: 'Dateien und Fotos fließen mit ein',
          t: 'Arbeitsblätter und abfotografierte Hefteinträge werden einmal eingelesen und in die Zusammenfassung einbezogen.',
          demo: featFilesCard },
        { eb: 'Finden', h: 'Alles durchsuchbar',
          t: 'Eine Suche über Fächer, Themen, Chats, Lernzettel, Dateien und Klausuren. Der Wiedereinstieg nach zwei Wochen dauert Sekunden.',
          demo: featSearchCard }
      ]
    }
  };

  function featStepHtml(s, i) {
    var demo = typeof s.demo === 'function' ? s.demo() : (s.demo || '');
    return '<section class="feat-step" data-reveal>' +
      '<div class="feat-step__text">' +
        '<span class="feat-step__n">' + pad2(i) + '</span>' +
        (s.eb ? '<span class="eyebrow">' + s.eb + '</span>' : '') +
        '<h2>' + s.h + '</h2>' +
        '<p>' + s.t + '</p>' +
        (s.list ? featChecks(s.list) : '') +
      '</div>' +
      '<div class="feat-step__demo">' + demo + '</div>' +
    '</section>';
  }

  function buildFeaturePage() {
    var host = document.getElementById('feature-page');
    if (!host) return;
    var key = document.body.getAttribute('data-feature') || '';
    var data = FEATURE_PAGES[key];
    if (!data) return;

    host.innerHTML =
      '<section class="feat-hero">' +
        '<div class="container">' +
          '<span class="eyebrow" data-reveal>' + data.eb + '</span>' +
          '<h1 data-reveal data-reveal-delay="60">' + data.h + '</h1>' +
          '<p data-reveal data-reveal-delay="120">' + data.intro + '</p>' +
        '</div>' +
      '</section>' +
      '<div class="feat-steps"><div class="container">' +
        data.steps.map(featStepHtml).join('') +
      '</div></div>' +
      '<section class="lab-sec lab-sec--tight">' +
        '<div class="container"><div class="cta-band">' +
          '<span class="eyebrow">Loslegen</span>' +
          '<h2>' + data.h + '</h2>' +
          '<p>14 Tage kostenlos testen, danach ab 15,99 € im Monat. Keine Kreditkarte, monatlich kündbar.</p>' +
          '<div class="hero__cta">' +
            '<a class="btn btn-on-dark btn-primary btn-lg" href="/preise/">Kostenlos starten</a>' +
            '<a class="btn btn-on-dark btn-secondary btn-lg" href="/preise/">Preise ansehen</a>' +
          '</div>' +
          '<small>Prototyp mit Demo-Inhalten: die KI-Antworten sind derzeit simulierter Platzhaltertext.</small>' +
        '</div></div>' +
      '</section>';

    /* Interaktive Demos je Schritt-Instanz initialisieren. */
    host.querySelectorAll('.feat-step__demo').forEach(function (d) {
      if (d.querySelector('[data-chat-demo]')) initChatDemo(d);
      if (d.querySelector('[data-kvx]')) kvInit(d);
    });
  }

  /* ---------------------------------------------------------
     Dev-Panel (nur index.html) — schaltet die noch offenen Design-
     Achsen um, wie mountSearchDev in app/assets/js/app.js:
       Chat       : 4 Rahmen der KI-Chat-Section (#chat) über data-chat
                    (localStorage['lesify:chat:v'])
       Chat-Farbe : fb/fw/wc/bc über data-chat-color auf #chat
                    (localStorage['lesify:chatcolor:v'])
     Fest gewählt, kein Umschalter mehr: Hero-Text 1.3 (Trust · Inline),
     Header "4a" (Aufruf in buildNav), Hero-Karte "2b" / Lower-Third im
     Foto (Aufruf in buildHeroStage).
     --------------------------------------------------------- */
  function applyHeroCardVariant(v) {
    document.querySelectorAll('.hv9 [data-hero-slides]').forEach(function (el) {
      el.hidden = el.getAttribute('data-hero-slides') !== v;
    });
    var s = document.querySelector('.hv9');
    if (s) s.setAttribute('data-hero-card', v);
  }
  function applyHeroTextVariant(v) {
    var s = document.querySelector('.hv9');
    if (s) s.setAttribute('data-hero-text', v);
  }

  /* Trust-Leiste (inspiriert von test-circ__row der Testimonial-Section):
     überlappende Avatar-Kreise + Zähler. Wird einmal in .hv9__text
     eingehängt; CSS zeigt sie für die feste Text-Variante 1.3 inline. */
  function ensureHeroTrust() {
    var text = document.querySelector('.hv9 .hv9__text');
    if (!text || text.querySelector('.hv9__trust')) return;
    var inits = ['SB', 'MT', 'LK', 'JW', 'FK'];
    var tones = ['var(--fach-blue)', 'var(--fach-amber)', 'var(--fach-teal)', 'var(--fach-violet)', 'var(--fach-rose)'];
    var avatars = inits.map(function (x, i) {
      return '<span class="hv9__trust-av" style="--t:' + tones[i % tones.length] + '">' + x + '</span>';
    }).join('');
    var el = document.createElement('div');
    el.className = 'hv9__trust';
    el.innerHTML = '<span class="hv9__trust-row">' + avatars + '</span>' +
      '<span class="hv9__trust-txt"><b>10.000+</b> Familien lernen schon mit Lesify</span>';
    var trust = text.querySelector('.lab-trust');
    if (trust && trust.nextSibling) text.insertBefore(el, trust.nextSibling);
    else text.appendChild(el);
  }

  function devRow(label, key, list, active) {
    return '<div class="layout-dev-row"><span>' + label + '</span><div class="layout-dev-seg">' +
      list.map(function (o) {
        return '<button type="button" data-' + key + '="' + o[0] + '" title="' + o[0] + ' · ' + o[1] + '"' +
          (o[0] === active ? ' class="is-on"' : '') + '>' + o[0] + '</button>';
      }).join('') + '</div></div>';
  }

  /* Header, Karte, Hero-Farbe, KI-Chat (v3), TLDR (v16), Preise (v4),
     KV (v5), Struktur/org (v11), Fächer-Kachel-Layout/orgfaecher (v2),
     Preisvergleich/cmp (v1), Parent (v1), FAQ (v1) und CTA (v1) final
     gewählt — Sections mit `fixed` (siehe LAB_SECTIONS) erscheinen nicht
     als Achse. Aktuell keine offenen Achsen, `mountLabDev()` bleibt als
     toter Helfer (siehe DOMContentLoaded). */
  var LAB_DEV_AXES = LAB_API.filter(function (a) { return !a.fixed; }).map(function (a) {
    return { key: a.key, label: a.key, ls: 'lesify:' + a.key + ':v', list: a.list, get: a.get, apply: a.apply };
  });
  var LAB_DEV_MAP = {};
  LAB_DEV_AXES.forEach(function (ax) { LAB_DEV_MAP[ax.key] = ax; });
  var LAB_DEV_SEL = LAB_DEV_AXES.map(function (ax) { return '[data-' + ax.key + ']'; }).join(', ');

  function mountLabDev() {
    if (current !== 'index') return;
    if (!document.getElementById('hero-stage')) return;
    if (document.querySelector('.layout-dev.is-lab')) return;
    var panel = document.createElement('div');
    panel.className = 'layout-dev is-lab';
    try { if (localStorage.getItem('lesify:lab:min') === '1') panel.classList.add('is-min'); } catch (e) {}
    var html = '<button type="button" class="layout-dev-title" data-dev-min>Landing-Lab</button>';
    LAB_DEV_AXES.forEach(function (ax) { html += devRow(ax.label, ax.key, ax.list, ax.get()); });
    panel.innerHTML = html;
    panel.addEventListener('click', function (e) {
      if (e.target.closest('[data-dev-min]')) {
        panel.classList.toggle('is-min');
        try { localStorage.setItem('lesify:lab:min', panel.classList.contains('is-min') ? '1' : '0'); } catch (err) {}
        return;
      }
      if (!LAB_DEV_SEL) return;
      var b = e.target.closest(LAB_DEV_SEL);
      if (!b) return;
      var key = null;
      for (var i = 0; i < LAB_DEV_AXES.length; i++) { if (b.hasAttribute('data-' + LAB_DEV_AXES[i].key)) { key = LAB_DEV_AXES[i].key; break; } }
      if (!key) return;
      var ax = LAB_DEV_MAP[key];
      var v = b.getAttribute('data-' + key);
      try { localStorage.setItem(ax.ls, v); } catch (err) {}
      panel.querySelectorAll('[data-' + key + ']').forEach(function (x) { x.classList.toggle('is-on', x === b); });
      ax.apply(v);
    });
    document.body.appendChild(panel);
  }

  /* Preise-Seite (/preise/) — Farb-Dev-Switch für die Preiskarten +
     Umschalter. Layout bleibt fest v4 (Dark-Feat, wie die Startseite);
     nur die FARBGEBUNG unterscheidet sich hier, weil die Karten bislang
     praktisch dieselben (hellen) Farben wie auf der weißen Startseite
     trugen — auf dem schwarzen Seiten-Hintergrund von /preise/ wirkt das
     unpassend (siehe body[data-page="preise"] #price-section … in
     landing-lab.css, das war bisher die einzige Einfärbung = "v1"
     unten). v2–v6 sind eigene Paletten zur Auswahl, jeweils nur CSS
     (`[data-price-color]` auf <body>) — kein Re-Render nötig, Umschalten
     verliert also nicht den Monatlich/Jährlich- oder Kinderzahl-Stand. */
  var PRICE_COLOR_LIST = [
    ['1', 'Weiß'], ['2', 'Kontur'], ['3', 'Dunkel'], ['4', 'Fach-Akzent'], ['5', 'Glas'], ['6', 'Gold'], ['7', 'Hell (Startseite)']
  ];
  function pricePageColor() {
    try { var v = localStorage.getItem('lesify:pricepage:color'); if (/^[1-7]$/.test(v)) return v; } catch (e) {}
    return '1';
  }
  /* true nur für "7" (Hell/Startseite) auf /preise/ — steuert in buildNav/
     onScroll, ob der Header dauerhaft die dunkle "gescrollte" Pille zeigt
     (siehe applyHeaderVariant-Aufruf dort). Auch von hier lesbar, bevor
     `current` im Modul-Top gesetzt wurde, da `current` zur Aufrufzeit
     (DOMContentLoaded) längst zugewiesen ist. */
  function priceNavIsLight() {
    return current === 'preise' && pricePageColor() === '7';
  }
  function applyPricePageColor(v) {
    document.body.setAttribute('data-price-color', v);
    /* Header live nachziehen, falls der Dev-Switch ohne Reload zwischen
       "7" und den dunklen Paletten wechselt (siehe buildNav/onScroll,
       die beim initialen Laden dieselbe Logik anwenden). */
    var nav = document.getElementById('mkt-nav');
    if (nav && document.body.getAttribute('data-page') === 'preise') {
      var isLight = v === '7';
      applyHeaderVariant(isLight ? '4a' : '5');
    }
  }
  function mountPriceColorDev() {
    if (document.body.getAttribute('data-page') !== 'preise') return;
    applyPricePageColor(pricePageColor());
    if (document.querySelector('.layout-dev.is-pricecolor')) return;
    var panel = document.createElement('div');
    panel.className = 'layout-dev is-pricecolor';
    try { if (localStorage.getItem('lesify:lab:min') === '1') panel.classList.add('is-min'); } catch (e) {}
    panel.innerHTML = '<button type="button" class="layout-dev-title" data-dev-min>Preise-Farben</button>' +
      devRow('Farbe', 'pricecolor', PRICE_COLOR_LIST, pricePageColor());
    panel.addEventListener('click', function (e) {
      if (e.target.closest('[data-dev-min]')) {
        panel.classList.toggle('is-min');
        try { localStorage.setItem('lesify:lab:min', panel.classList.contains('is-min') ? '1' : '0'); } catch (err) {}
        return;
      }
      var b = e.target.closest('[data-pricecolor]'); if (!b) return;
      var v = b.getAttribute('data-pricecolor');
      try { localStorage.setItem('lesify:pricepage:color', v); } catch (err) {}
      panel.querySelectorAll('[data-pricecolor]').forEach(function (x) { x.classList.toggle('is-on', x === b); });
      applyPricePageColor(v);
    });
    document.body.appendChild(panel);
  }

  /* Hero-Stage: fest v2.5 (dunkle Icon-Spotlight-Karte auf freigestelltem
     Mockup); das v1-Foto-Panel bleibt ausgeblendet. */
  function applyHeroStage() {
    var sec = document.querySelector('.hv9');
    if (sec) sec.setAttribute('data-hero-stage', '2');
    var v1 = document.querySelector('.hv9__panel');
    if (v1) v1.hidden = true;
  }

  /* ---------- Smooth-Scroll für #anker (auch "seite.html#anker" auf
     derselben Seite, z. B. Preise/FAQ aus der Nav) ---------- */
  function navOffset() {
    var nav = document.getElementById('mkt-nav');
    return nav ? nav.offsetHeight + 12 : 0;
  }
  function scrollToHash(hash, behavior) {
    if (!hash || hash.length < 2) return false;
    var target;
    try { target = document.querySelector(hash); } catch (e) { return false; }
    if (!target) return false;
    var top = target.getBoundingClientRect().top + window.pageYOffset - navOffset();
    window.scrollTo({ top: top < 0 ? 0 : top, behavior: behavior || 'smooth' });
    return true;
  }
  function currentBasename() {
    return location.pathname;
  }
  /* Liefert den #hash-Teil, wenn href auf ein Ziel auf DIESER Seite zeigt
     (reines "#kv" oder "/#faq" während man schon auf der Startseite
     ist) — sonst null (normale Seiten-Navigation). Seit den sauberen
     URLs (/pagename/ statt pagename.html) ist "Seite" der volle
     location.pathname statt eines Dateinamens. */
  function samePageHash(href) {
    var i = href.indexOf('#');
    if (i === -1) return null;
    var path = href.slice(0, i);
    var hash = href.slice(i);
    if (hash.length < 2) return null;
    if (path === '' || path === currentBasename()) return hash;
    return null;
  }
  function initAnchors() {
    document.querySelectorAll('a[href*="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var hash = samePageHash(a.getAttribute('href'));
        if (hash === null) return; /* Ziel ist eine andere Seite */
        e.preventDefault();
        if (scrollToHash(hash)) history.pushState(null, '', hash);
      });
    });
  }
  /* Sections werden per JS gebaut (buildLabSections) — der native
     Browser-Sprung zu #hash beim Laden trifft dadurch oft die falsche
     Position, weil die Seite zu dem Zeitpunkt noch wächst. Nach
     vollständigem Laden (inkl. Bilder) einmal korrigieren. */
  window.addEventListener('load', function () {
    if (location.hash) scrollToHash(location.hash, 'auto');
  });

  document.addEventListener('DOMContentLoaded', function () {
    buildNav();
    buildFooter();
    buildFeaturePage();
    applyHeroColor('1');
    ensureHeroTrust();
    applyHeroTextVariant('1.3');
    autoStagger();
    applyRevealAttr('6'); /* final gewählt (Zoom), kein Dev-Panel mehr */
    initReveal();
    initPricing();
    initCounters();
    initForms();
    initAnchors();
    buildHeroStage();
    buildHeroStageV2();
    initHeroSlides();
    buildChatSection();
    buildLabSections();
    mountPriceColorDev();
    /* Dev-Tool (2026-09-16 aktiviert, 2026-09-16 final entfernt) — "orgfaecher"
       auf v2 (Ghost) und "cmp" auf v1 (Cards, mit neuem 9-Zeilen-Content)
       final gewählt (siehe LAB_SECTIONS `fixed`), kein Dev-Panel mehr. */
  });
})();
