/* =========================================================
   Lesify — Shared UI behavior
   Vanilla JS, no dependencies. Progressive: every init()
   checks for its DOM before touching it, so one file can be
   included on every page.
   ========================================================= */

(function () {
  'use strict';

  var Icons = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    spark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2z"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5C4 4.67 4.67 4 5.5 4h13c.83 0 1.5.67 1.5 1.5v10c0 .83-.67 1.5-1.5 1.5H9l-4 3.5v-3.5H5.5C4.67 16.5 4 15.83 4 15V5.5Z"/></svg>',
    layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="M3 12l9 5 9-5"/><path d="M3 16l9 5 9-5"/></svg>',
    docCheck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V8L14 3Z"/><path d="M14 3v4.5A1.5 1.5 0 0 0 15.5 9H20"/><path d="m9 14 2 2 4-4"/></svg>',
    folder: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h4l2 2h8a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5v-11Z"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>',
    arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    paperclip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.5l-8.5 8.5a4.5 4.5 0 0 1-6.36-6.36l9-9a3 3 0 0 1 4.24 4.24l-9 9a1.5 1.5 0 0 1-2.12-2.12l8-8"/></svg>',
    upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V8L14 3Z"/><path d="M14 3v4.5A1.5 1.5 0 0 0 15.5 9H20"/></svg>',
    checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 5-5"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="0.6" fill="currentColor"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><line x1="16" y1="3" x2="16" y2="7"/><line x1="8" y1="3" x2="8" y2="7"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
    dots: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M5 20h14"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="11" x2="12" y2="16.5"/><circle cx="12" cy="7.8" r="0.6" fill="currentColor" stroke="none"/></svg>',
    arrowUpRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="8 7 17 7 17 16"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>'
  };

  function qs(sel, ctx) { return (ctx || document).querySelector(sel); }
  function qsa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------------------------------------------------------
     Shared chrome — sidebar + mobile topbar
     Injected into #sidebar-root / #topbar-root so nav markup
     lives in exactly one place across all nine pages.
     --------------------------------------------------------- */

  var NAV_ITEMS = [
    { key: 'dashboard', href: 'dashboard.html', label: 'Dashboard', icon: 'grid' },
    { key: 'chat', href: 'chat.html', label: 'KI Chat', icon: 'chat' },
    { key: 'faecher', href: 'faecher.html', label: 'Fächer', icon: 'layers' },
    { key: 'themen', href: 'themen.html', label: 'Themen', icon: 'target' },
    { key: 'klausuren', href: 'klausuren.html', label: 'Klausuren', icon: 'docCheck' },
    { key: 'dateien', href: 'dateien.html', label: 'Dateien', icon: 'folder' },
    { key: 'suchen', href: 'suche.html', label: 'Suchen', icon: 'search', divider: true },
    { key: 'einstellungen', href: 'einstellungen.html', label: 'Einstellungen', icon: 'settings' }
  ];

  // Eigene Nav für ein Elternkonto mit Familien-Abo — es lernt selbst nicht,
  // sondern verwaltet Kind-Profile. Vier eigenständige Seiten (kein
  // Anker-Sprung in eine gemeinsame Seite mehr, siehe eltern-zugang-plan.md).
  var ELTERN_NAV_ITEMS = [
    { key: 'eltern', href: 'eltern.html', label: 'Übersicht', icon: 'grid' },
    { key: 'eltern-kinder', href: 'eltern-kinder.html', label: 'Kinder & Zugänge', icon: 'layers' },
    { key: 'eltern-abo', href: 'eltern-abo.html', label: 'Abo & Sitze', icon: 'docCheck' },
    { key: 'eltern-daten', href: 'eltern-datenschutz.html', label: 'Datenschutz', icon: 'lock', divider: true },
    { key: 'einstellungen', href: 'einstellungen.html', label: 'Einstellungen', icon: 'settings' }
  ];

  function istElternAnsicht() {
    // data.js (Prototyp): echter Rollen-Check am Store.
    if (typeof Lesify !== 'undefined' && Lesify.istElternteil) return Lesify.istElternteil();
    // api.js: kein synchroner Rollen-Check möglich (renderChrome() baut die
    // Sidebar sofort, ohne auf `GET /user` zu warten) — `auth-gate.js` hat
    // vorher schon sichergestellt, dass nur ein echtes Elternkonto mit
    // Familien-Abo auf einer `eltern-*.html`-Seite landet, also verrät die
    // Seite selbst die Ansicht.
    var hier = (location.pathname.split('/').pop() || '').toLowerCase();
    return hier === 'eltern.html' || hier.indexOf('eltern-') === 0;
  }

  /* Dunkles Design — die Einstellung `darkMode` (nur eingeloggter Bereich).
     Ein Inline-Snippet im <head> jeder Seite setzt data-theme schon vor dem
     ersten Paint (kein Flash); dieser Aufruf zieht nur nach, falls das
     Snippet fehlt oder die Einstellung in einem anderen Tab geändert wurde. */
  // Dunkles Design ist eine reine Geräte-Einstellung (`localStorage`, siehe
  // einstellungen.html) — kein Backend-Feld, gilt für data.js- wie
  // api.js-Seiten gleich. Das Kopf-Boot-Skript setzt das Attribut schon vor
  // dem ersten Render; hier nur zur Sicherheit erneut angewandt (idempotent).
  function applyTheme() {
    var dark = false;
    try { dark = localStorage.getItem('lesify:darkmode') === '1'; } catch (e) { /* noop */ }
    if (dark) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }

  function renderChrome() {
    var sidebarRoot = document.getElementById('sidebar-root');
    var topbarRoot = document.getElementById('topbar-root');
    var current = (document.body.getAttribute('data-page') || '').toLowerCase();
    var eltern = istElternAnsicht();
    var items = eltern ? ELTERN_NAV_ITEMS : NAV_ITEMS;
    var homeHref = eltern ? 'eltern.html' : 'dashboard.html';

    // Profil-Chip als eigene Funktion — api.js liefert Lesify.getUser() async
    // (Promise statt Objekt); erst mit einem leeren Platzhalter rendern, dann
    // den Chip-Slot nachfüllen, sobald die echten Daten da sind. data.js bleibt
    // synchron und unverändert (istAsync greift dort nie).
    function profileChipHtml(user) {
      var chipHref = user.rolle === 'elternteil' ? 'eltern.html' : 'einstellungen.html';
      return '<a href="' + chipHref + '" class="profile-chip">' +
        '<span class="avatar-initials">' + (user.initials || '') + '</span>' +
        '<span class="profile-meta"><span class="profile-name">' + (user.name || '') + '</span><span class="profile-role">' + (user.klasse || '') + '</span></span>' +
      '</a>';
    }

    if (sidebarRoot) {
      var navHtml = items.map(function (item) {
        var active = item.key === current ? ' is-active' : '';
        var divider = item.divider ? '<div class="nav-divider"></div>' : '';
        return divider + '<a href="' + item.href + '" class="nav-item' + active + '" data-nav="' + item.key + '">' +
          '<span class="spark" style="width:18px;height:18px">' + Icons[item.icon] + '</span>' +
          '<span>' + item.label + '</span></a>';
      }).join('');

      var userResult = typeof Lesify !== 'undefined' ? Lesify.getUser() : { name: 'Jannik B.', klasse: '8. Klasse', initials: 'JB' };
      var istAsync = !!(userResult && typeof userResult.then === 'function');

      sidebarRoot.outerHTML =
        '<div class="sidebar-scrim" data-nav-scrim></div>' +
        '<aside class="sidebar">' +
          '<a href="' + homeHref + '" class="brand"><img src="assets/img/logo.png" alt="Lesify Logo"><span class="brand-word">Lesify</span></a>' +
          '<nav class="nav-group">' + navHtml + '</nav>' +
          '<div class="sidebar-foot" data-profile-chip-slot>' + (istAsync ? '' : profileChipHtml(userResult)) + '</div>' +
        '</aside>';

      if (istAsync) {
        userResult.then(function (user) {
          var slot = document.querySelector('[data-profile-chip-slot]');
          if (slot) slot.innerHTML = profileChipHtml(user);
        }).catch(function () {});
      }
    }

    if (topbarRoot) {
      topbarRoot.outerHTML =
        '<header class="topbar-mobile">' +
          '<button class="mobile-menu-btn" data-nav-toggle aria-label="Menü öffnen"><span class="spark" style="width:18px;height:18px">' + Icons.menu + '</span></button>' +
          '<a href="' + homeHref + '" class="mobile-brand"><img src="assets/img/logo.png" alt="Lesify"><span>Lesify</span></a>' +
          '<span class="mobile-spacer"></span>' +
        '</header>';
    }
  }

  /* ---------------------------------------------------------
     Elternmodus-Banner — sichtbar auf JEDER Schüler-Seite, solange
     ein Elternteil sich per „Als Kind ansehen" in ein Kind-Profil
     versetzt hat. Ein Klick bringt es ohne Neu-Login zurück ins
     Elternkonto (Prototyp: `Lesify.zurueckZumElternkonto()`).
     --------------------------------------------------------- */

  function elternBannerHtml(kindName) {
    return '<span class="eltern-banner-txt">' +
        '<span class="spark" style="width:15px;height:15px">' + Icons.lock + '</span>' +
        'Elternmodus — du siehst gerade <strong>' + kindName + '</strong>' +
      '</span>' +
      '<button type="button" class="eltern-banner-btn" data-eltern-zurueck>Zurück zum Elternkonto</button>';
  }
  function mountElternBanner(kindName, onZurueck) {
    var bar = document.createElement('div');
    bar.className = 'eltern-banner';
    bar.innerHTML = elternBannerHtml(kindName);
    document.body.insertBefore(bar, document.body.firstChild);
    document.body.classList.add('has-eltern-banner');
    bar.querySelector('[data-eltern-zurueck]').addEventListener('click', onZurueck);
  }

  function renderElternBanner() {
    if (typeof Lesify === 'undefined') return;
    if (Lesify.elternModus) {
      // data.js (Prototyp) — sync, liefert den Kind-Namen direkt mit.
      var em = Lesify.elternModus();
      if (!em) return;
      mountElternBanner(em.kindName, function () {
        Lesify.zurueckZumElternkonto();
        window.location.href = 'eltern.html';
      });
      return;
    }
    // api.js — echter Kontextwechsel (Phase 11, 2026-09-13): `getUser()`
    // liefert im Elternmodus das Profil des Kindes (eigene Session-Scope).
    if (Lesify.elternModusAktiv && Lesify.elternModusAktiv() && Lesify.getUser) {
      Lesify.getUser().then(function (u) {
        mountElternBanner(u.name, function () {
          Lesify.beendeElternModus();
          window.location.href = 'eltern.html';
        });
      }).catch(function () { /* Token ungültig — auth-gate.js übernimmt den Redirect */ });
    }
  }

  /* ---------------------------------------------------------
     Seiten-Wasserzeichen — großes, blasses Symbol oben rechts auf
     jeder Seite. Statische Seiten bekommen automatisch ihr
     Nav-Symbol (per data-page); Detailseiten mit Fach-Bezug
     (fach.html, thema.html, klausur.html, testklausur.html)
     überschreiben es per LesifyUI.setPageWatermark() sobald sie
     ihr Fach kennen. chat.html liefert sein eigenes #page-watermark
     -Element (eigenes Panel-Layout) — wird dann nur befüllt.
     --------------------------------------------------------- */

  var PAGE_WATERMARKS = {
    eltern: Icons.layers,
    chat: Icons.chat,
    faecher: Icons.layers,
    themen: Icons.target,
    klausuren: Icons.docCheck,
    dateien: Icons.folder,
    suchen: Icons.search,
    einstellungen: Icons.settings
  };

  function renderPageWatermark() {
    var el = document.getElementById('page-watermark');
    if (!el) {
      /* An .main verankern (nicht .main-inner): .main-inner ist
         mittenzentriert (margin:0 auto) und verschiebt sich, wenn
         die Menü-Sidebar ein-/ausklappt — dann würde das
         Wasserzeichen mitwandern. .main reicht immer bis zum
         rechten Viewport-Rand. */
      var host = qs('.main') || qs('.main-inner');
      if (!host) return;
      el = document.createElement('div');
      el.className = 'page-watermark';
      el.id = 'page-watermark';
      el.setAttribute('aria-hidden', 'true');
      host.insertBefore(el, host.firstChild);
    }
    var current = (document.body.getAttribute('data-page') || '').toLowerCase();
    if (current === 'dashboard') {
      el.innerHTML = '<img src="assets/img/lesify-watermark.svg" alt="">';
      var img = qs('img', el);
      if (img) img.addEventListener('error', function () { el.innerHTML = Icons.spark; }, { once: true });
      return;
    }
    el.innerHTML = PAGE_WATERMARKS[current] || '';
  }

  // Fach-spezifische Wasserzeichen (Fach/Thema/Klausur/Testklausur-Seiten) werden in
  // der Fach-Farbe eingefärbt — dieselbe Opacity/Farbigkeit wie .card-watermark.
  function setPageWatermark(svgHtml, color) {
    var el = document.getElementById('page-watermark');
    if (!el) return;
    el.innerHTML = svgHtml || '';
    el.style.color = color || '';
    el.style.opacity = color ? '0.09' : '';
  }

  /* ---------------------------------------------------------
     Card links — [data-href] wrappers that behave like a link
     but may contain real nested <a>/<button> elements (e.g. a
     badge or a "Farbe ändern" control). Real HTML forbids
     interactive-in-interactive nesting, so cards that need an
     inner control use a clickable div + this delegate instead.
     --------------------------------------------------------- */

  function initCardLinks() {
    document.addEventListener('click', function (e) {
      if (e.target.closest('a, button')) return;
      var datei = e.target.closest('[data-datei-id]');
      if (datei) { openDateiModal(datei.getAttribute('data-datei-id')); return; }
      var card = e.target.closest('[data-href]');
      if (!card) return;
      window.location.href = card.getAttribute('data-href');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      if (e.target.closest('a, button')) return;
      var datei = e.target.closest('[data-datei-id]');
      if (datei) { e.preventDefault(); openDateiModal(datei.getAttribute('data-datei-id')); return; }
      var card = e.target.closest('[data-href]');
      if (!card) return;
      e.preventDefault();
      window.location.href = card.getAttribute('data-href');
    });
  }

  /* ---------------------------------------------------------
     Mobile sidebar
     --------------------------------------------------------- */

  function initMobileNav() {
    var toggle = qs('[data-nav-toggle]');
    var scrim = qs('[data-nav-scrim]');
    if (!toggle) return;
    function close() { document.body.classList.remove('nav-open'); }
    toggle.addEventListener('click', function () { document.body.classList.toggle('nav-open'); });
    if (scrim) scrim.addEventListener('click', close);
    qsa('.sidebar .nav-item').forEach(function (item) { item.addEventListener('click', close); });
  }

  /* ---------------------------------------------------------
     Active nav highlight
     --------------------------------------------------------- */

  function initActiveNav() {
    var current = (document.body.getAttribute('data-page') || '').toLowerCase();
    qsa('.nav-item[data-nav]').forEach(function (item) {
      if (item.getAttribute('data-nav') === current) item.classList.add('is-active');
    });
  }

  /* ---------------------------------------------------------
     Generic modal (data-modal-open="id" / data-modal-close)
     --------------------------------------------------------- */

  function openModal(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    var first = qs('input, select, textarea, button.btn-primary', el);
    if (first) setTimeout(function () { first.focus(); }, 60);
  }

  function closeModal(el) {
    var scrim = el.closest ? el.closest('.modal-scrim') : el;
    if (!scrim) return;
    scrim.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  // Dialog-Semantik + Anfangsfokus für JEDES `.modal-scrim` — egal ob als
  // statisches Markup vorhanden oder von einer der vielen `document.
  // createElement('div')`-Stellen (Fach-Farbwähler, Datei-Modal, die
  // Eltern-Seiten-Bestätigungsdialoge, …) zur Laufzeit erzeugt. Zentral hier
  // statt an jeder Erzeugungsstelle einzeln, damit neue Modals das automatisch
  // mitbekommen.
  var modalTitelZaehler = 0;
  function modalA11yHerstellen(scrim) {
    var dialog = scrim.querySelector ? scrim.querySelector('.modal') : null;
    if (!dialog || dialog.hasAttribute('role')) return;
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    var titel = scrim.querySelector('.modal-title');
    if (titel) {
      if (!titel.id) titel.id = 'modal-title-' + (++modalTitelZaehler);
      dialog.setAttribute('aria-labelledby', titel.id);
    }
  }
  function modalFokusHinein(scrim) {
    var ziel = qs(
      'input, select, textarea, button.btn-primary, [data-ok], .modal-close',
      scrim,
    );
    if (ziel) setTimeout(function () { ziel.focus(); }, 70);
  }

  function initModals() {
    qsa('[data-modal-open]').forEach(function (btn) {
      btn.addEventListener('click', function () { openModal(btn.getAttribute('data-modal-open')); });
    });
    qsa('[data-modal-close]').forEach(function (btn) {
      btn.addEventListener('click', function () { closeModal(btn); });
    });
    qsa('.modal-scrim').forEach(function (scrim) {
      modalA11yHerstellen(scrim);
      scrim.addEventListener('click', function (e) { if (e.target === scrim) closeModal(scrim); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') qsa('.modal-scrim.is-open').forEach(closeModal);
    });
    if (typeof MutationObserver !== 'undefined') {
      new MutationObserver(function (mutations) {
        mutations.forEach(function (mut) {
          for (var i = 0; i < mut.addedNodes.length; i++) {
            var node = mut.addedNodes[i];
            if (node.nodeType === 1 && node.classList && node.classList.contains('modal-scrim')) {
              modalA11yHerstellen(node);
              modalFokusHinein(node);
            }
          }
        });
      }).observe(document.body, { childList: true });
    }
  }

  /* ---------------------------------------------------------
     Fach-Farbwähler — ein Modal, das jede Seite mit Fach-Bezug
     per LesifyUI.openFachColorPicker(fachId, onSaved) öffnen kann.
     --------------------------------------------------------- */

  function openFachColorPicker(fachId, onSaved) {
    if (typeof Lesify === 'undefined') return;
    var fach = Lesify.getFach(fachId);
    if (!fach) return;
    var current = fach.farbe;

    var scrim = document.createElement('div');
    scrim.className = 'modal-scrim';
    scrim.innerHTML =
      '<div class="modal" style="max-width:360px">' +
        '<div class="modal-head">' +
          '<div>' +
            '<h3 class="modal-title">Farbe für ' + fach.name + '</h3>' +
            '<p class="modal-sub">Hilft dir, Fächer auf einen Blick zu unterscheiden.</p>' +
          '</div>' +
          '<button class="modal-close" type="button" aria-label="Schließen">' + Icons.x + '</button>' +
        '</div>' +
        '<div class="swatch-picker">' +
          Lesify.FACH_COLORS.map(function (c) {
            var sel = c.key === current ? ' is-selected' : '';
            return '<button type="button" class="swatch-btn' + sel + '" data-color-key="' + c.key + '" style="background:' + c.base + '" aria-label="' + c.name + '" title="' + c.name + '"></button>';
          }).join('') +
        '</div>' +
        '<div class="modal-foot"><button type="button" class="btn btn-primary btn-block" data-save>Speichern</button></div>' +
      '</div>';
    document.body.appendChild(scrim);
    requestAnimationFrame(function () { scrim.classList.add('is-open'); });

    var selected = current;
    qsa('.swatch-btn', scrim).forEach(function (btn) {
      btn.addEventListener('click', function () {
        selected = btn.getAttribute('data-color-key');
        qsa('.swatch-btn', scrim).forEach(function (b) { b.classList.toggle('is-selected', b === btn); });
      });
    });

    function close() {
      scrim.classList.remove('is-open');
      setTimeout(function () { scrim.remove(); }, 240);
    }
    qs('.modal-close', scrim).addEventListener('click', close);
    scrim.addEventListener('click', function (e) { if (e.target === scrim) close(); });
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key !== 'Escape') return;
      document.removeEventListener('keydown', onEsc);
      close();
    });
    qs('[data-save]', scrim).addEventListener('click', function () {
      // data.js aktualisiert synchron; api.js liefert ein Promise (PATCH
      // /faecher/:id) — erst nach dessen Abschluss schließen/neu rendern,
      // sonst zeigt `onSaved` (meist ein re-`draw()`) noch die alte Farbe.
      var ergebnis = Lesify.updateFach(fachId, { farbe: selected });
      if (ergebnis && typeof ergebnis.then === 'function') {
        ergebnis.then(function () { close(); if (onSaved) onSaved(); });
      } else {
        close();
        if (onSaved) onSaved();
      }
    });
  }

  /* ---------------------------------------------------------
     Datei-Viewer — LesifyUI.openDateiModal(dateiId) öffnet eine
     Datei „im Fenster": links eine simulierte Dokumentvorschau
     (im Prototyp gibt es keinen echten Datei-Inhalt), rechts die
     Eckdaten (Fach/Thema, Typ, Größe, Datum, Status) und die
     automatische KI-Zusammenfassung. Wird von jeder klickbaren
     Datei-Karte/-Zeile ausgelöst (data-datei-id, siehe
     initCardLinks) — Dateien-Seite wie Thema-Seite.
     --------------------------------------------------------- */

  function openDateiModal(dateiId) {
    if (typeof Lesify === 'undefined') return;
    var maybe = Lesify.getDatei(dateiId);
    if (maybe && typeof maybe.then === 'function') maybe.then(function (d) { if (d) renderDateiModal(d); });
    else if (maybe) renderDateiModal(maybe);
  }

  /** Bild-/PDF-Vorschau übers echte Backend (`Lesify.dateiInhaltUrl`, signierte
      Storage-URL) — Text-Mockup bleibt Fallback für DOC/Dummy-Daten (data.js
      kennt `dateiInhaltUrl` nicht). */
  function fileIconPreview(typLabel) {
    return '<div class="dv-doc dv-doc-img">' + Icons.file +
      '<span class="dv-doc-imgcap">Bildvorschau · ' + typLabel + '</span></div>';
  }
  function fileTextPreview(d, typLabel) {
    var lead = d.zusammenfassung
      ? '<p class="dv-doc-lead" data-dv-doclead>' + d.zusammenfassung + '</p>'
      : '<p class="dv-doc-lead is-pending" data-dv-doclead>Dieses Dokument wird noch gelesen und zusammengefasst…</p>';
    var lineW = [96, 88, 92, 70, 84, 90, 62];
    return '<div class="dv-doc dv-doc-page">' +
      '<div class="dv-doc-h">' + d.name + '</div>' +
      lead +
      '<div class="dv-doc-lines">' +
        lineW.map(function (w) { return '<span style="width:' + w + '%"></span>'; }).join('') +
      '</div>' +
      '<div class="dv-doc-note">Vorschau für ' + typLabel + '-Dateien ist im Browser nicht möglich — herunterladen, um den Inhalt zu sehen.</div>' +
    '</div>';
  }

  function renderDateiModal(d) {
    var l = Lesify.label(d.themaId);
    var bereit = d.status === 'bereit';
    var typLabel = fileTypeLabel(d.typ);
    var inhaltUrl = typeof Lesify.dateiInhaltUrl === 'function' ? Lesify.dateiInhaltUrl(d.id) : null;

    var preview;
    if (inhaltUrl && d.typ === 'img') {
      preview = '<div class="dv-doc dv-doc-imgreal"><img class="dv-doc-img-el" src="' + inhaltUrl + '" alt="Vorschau"></div>';
    } else if (inhaltUrl && d.typ === 'pdf') {
      preview = '<div class="dv-doc dv-doc-pdfreal"><embed class="dv-doc-pdf-el" src="' + inhaltUrl + '" type="application/pdf"></div>';
    } else if (d.typ === 'img') {
      preview = fileIconPreview(typLabel);
    } else {
      preview = fileTextPreview(d, typLabel);
    }

    var scrim = document.createElement('div');
    scrim.className = 'modal-scrim';
    scrim.innerHTML =
      '<div class="modal dv-modal" style="' + fachColorVars(d.fachId) + '">' +
        '<div class="modal-head">' +
          '<div>' +
            '<h3 class="modal-title">' + d.name + '</h3>' +
            '<p class="modal-sub">' + typLabel + ' · ' + d.groesse + ' · hochgeladen ' + d.updated + '</p>' +
          '</div>' +
          '<button class="modal-close" type="button" aria-label="Schließen">' + Icons.x + '</button>' +
        '</div>' +
        '<div class="dv-grid">' +
          '<div class="dv-preview">' + preview + '</div>' +
          '<div class="dv-meta">' +
            '<div class="dv-meta-row"><span class="dv-meta-k">Fach &amp; Thema</span>' + badge(d.themaId) + '</div>' +
            '<div class="dv-meta-row"><span class="dv-meta-k">Dateityp</span><span class="dv-meta-v">' + typLabel + '</span></div>' +
            '<div class="dv-meta-row"><span class="dv-meta-k">Größe</span><span class="dv-meta-v">' + d.groesse + '</span></div>' +
            '<div class="dv-meta-row"><span class="dv-meta-k">Hochgeladen</span><span class="dv-meta-v">' + d.updated + '</span></div>' +
            '<div class="dv-meta-row"><span class="dv-meta-k">Status</span><span class="dv-meta-v" data-dv-status>' + (bereit ? 'Analysiert &amp; bereit' : 'Wird analysiert…') + '</span></div>' +
            '<div class="dv-summary">' +
              '<span class="dv-meta-k">KI-Zusammenfassung</span>' +
              '<p data-dv-summary>' + (d.zusammenfassung || ('Sobald „' + d.name + '" fertig gelesen ist, erscheint hier die automatische Zusammenfassung.')) + '</p>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="modal-foot">' +
          '<a class="btn btn-secondary" href="thema.html?id=' + d.themaId + '&tab=dateien">Im Thema öffnen</a>' +
          '<button type="button" class="btn btn-primary" data-dv-download>' + Icons.download + ' Herunterladen</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(scrim);
    requestAnimationFrame(function () { scrim.classList.add('is-open'); });
    document.body.style.overflow = 'hidden';

    var imgEl = qs('.dv-doc-img-el', scrim);
    if (imgEl) {
      imgEl.addEventListener('error', function () {
        qs('.dv-preview', scrim).innerHTML = fileIconPreview(typLabel);
      });
    }

    // Datei wird gerade noch verarbeitet: live nachziehen statt Reload zu
    // verlangen, falls sie fertig wird, während das Modal offen ist.
    if (d.status === 'verarbeitung' && typeof Lesify.pollDateiStatus === 'function') {
      Lesify.pollDateiStatus(d.id).then(function (updated) {
        if (!document.body.contains(scrim)) return;
        d = updated;
        bereit = updated.status === 'bereit';
        var statusEl = qs('[data-dv-status]', scrim);
        if (statusEl) statusEl.innerHTML = bereit ? 'Analysiert &amp; bereit' : 'Verarbeitung fehlgeschlagen';
        var summaryEl = qs('[data-dv-summary]', scrim);
        if (summaryEl) summaryEl.textContent = updated.zusammenfassung || ('„' + updated.name + '" konnte nicht zusammengefasst werden.');
        var docLeadEl = qs('[data-dv-doclead]', scrim);
        if (docLeadEl && updated.zusammenfassung) {
          docLeadEl.textContent = updated.zusammenfassung;
          docLeadEl.classList.remove('is-pending');
        }
      });
    }

    function close() {
      scrim.classList.remove('is-open');
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onEsc);
      setTimeout(function () { scrim.remove(); }, 240);
    }
    function onEsc(e) { if (e.key === 'Escape') close(); }
    qs('.modal-close', scrim).addEventListener('click', close);
    scrim.addEventListener('click', function (e) { if (e.target === scrim) close(); });
    document.addEventListener('keydown', onEsc);

    qs('[data-dv-download]', scrim).addEventListener('click', function () {
      if (inhaltUrl) {
        var a2 = document.createElement('a');
        a2.href = inhaltUrl; a2.download = d.name;
        document.body.appendChild(a2); a2.click(); a2.remove();
        toast('„' + d.name + '" wird heruntergeladen…');
        return;
      }
      var doc = [
        d.name, '',
        'Fach: ' + l.fach,
        'Thema: ' + l.thema,
        'Dateityp: ' + typLabel,
        'Größe: ' + d.groesse,
        'Hochgeladen: ' + d.updated,
        'Status: ' + (bereit ? 'Analysiert & bereit' : 'Wird analysiert…'),
        '', 'KI-Zusammenfassung', '------------------',
        d.zusammenfassung || 'Noch keine Zusammenfassung verfügbar.'
      ].join('\n');
      var filename = Lesify.slugify(d.name.replace(/\.[^.]+$/, '')) + '.txt';
      // `Lesify.downloadText` gibt es nur in data.js — api.js baut den Blob
      // lokal, da dieses Dokument ohnehin rein aus bereits geladenen Feldern
      // zusammengesetzt wird (kein Server-Roundtrip nötig).
      if (typeof Lesify.downloadText === 'function') {
        Lesify.downloadText(filename, doc);
      } else {
        var blob = new Blob([doc], { type: 'text/plain' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      }
      toast('„' + d.name + '" wird heruntergeladen…');
    });
  }

  /* ---------------------------------------------------------
     Toasts
     --------------------------------------------------------- */

  function ensureToastStack() {
    var stack = qs('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      // Screenreader-Ansage ohne Fokusklau: role="status" + aria-live="polite"
      // lassen jeden neu angehängten Toast automatisch vorgelesen werden.
      stack.setAttribute('role', 'status');
      stack.setAttribute('aria-live', 'polite');
      document.body.appendChild(stack);
    }
    return stack;
  }

  function toast(message) {
    var stack = ensureToastStack();
    var el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = '<span class="spark" style="width:15px;height:15px;color:#fff">' + Icons.spark + '</span><span>' + message + '</span>';
    stack.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-visible'); });
    setTimeout(function () {
      el.classList.remove('is-visible');
      setTimeout(function () { el.remove(); }, 260);
    }, 3200);
  }

  /* ---------------------------------------------------------
     Tabs (data-tabs wrapper, data-tab-btn, data-tab-panel)
     --------------------------------------------------------- */

  // Delegiert auf document statt Listener an einzelne Buttons zu hängen —
  // Tabs/Panels werden von den Seiten erst NACH diesem init() ins DOM
  // geschrieben (eigenes DOMContentLoaded läuft nach app.js), direkte
  // Listener würden also ins Leere zeigen.
  function initTabs() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-tab-btn]');
      if (!btn) return;
      var wrap = btn.closest('[data-tabs]');
      if (!wrap) return;
      var target = btn.getAttribute('data-tab-btn');
      qsa('[data-tab-btn]', wrap).forEach(function (b) { b.classList.toggle('is-active', b === btn); });
      qsa('[data-tab-panel]', wrap).forEach(function (p) { p.classList.toggle('is-active', p.getAttribute('data-tab-panel') === target); });
    });
  }

  /* ---------------------------------------------------------
     Filter chips (data-filter-group -> data-filter-item, target cards with data-filter-value)
     --------------------------------------------------------- */

  function initFilters() {
    document.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-filter-value]');
      if (!chip) return;
      var group = chip.closest('[data-filter-group]');
      if (!group) return;
      var targetSel = group.getAttribute('data-filter-group');
      var chips = qsa('[data-filter-value]', group);
      var items = qsa(targetSel);
      var val = chip.getAttribute('data-filter-value');

      if (val === '*') {
        // "Alle" ist exklusiv: setzt alle Fach-Pills zurück.
        chips.forEach(function (c) { c.classList.toggle('is-active', c === chip); });
      } else {
        // Fach-Pills sind mehrfach wählbar (z. B. Mathe + Englisch + Geschichte).
        chip.classList.toggle('is-active');
        var anyFach = chips.some(function (c) {
          return c.getAttribute('data-filter-value') !== '*' && c.classList.contains('is-active');
        });
        chips.forEach(function (c) {
          if (c.getAttribute('data-filter-value') === '*') c.classList.toggle('is-active', !anyFach);
        });
      }

      var active = chips
        .filter(function (c) { return c.classList.contains('is-active'); })
        .map(function (c) { return c.getAttribute('data-filter-value'); });
      var showAll = active.indexOf('*') !== -1 || active.length === 0;
      items.forEach(function (item) {
        var match = showAll || active.indexOf(item.getAttribute('data-filter')) !== -1;
        item.style.display = match ? '' : 'none';
      });
      // Abschnitts-Überschriften (z. B. „Bereits geschrieben") ausblenden, wenn
      // unter dem aktiven Filter keine Karte mehr darunter folgt.
      qsa('.klausur-list-divider', document).forEach(function (div) {
        var sichtbar = false, n = div.nextElementSibling;
        while (n && !n.classList.contains('klausur-list-divider')) {
          if (n.style.display !== 'none') { sichtbar = true; break; }
          n = n.nextElementSibling;
        }
        div.style.display = sichtbar ? '' : 'none';
      });
    });
  }

  /* ---------------------------------------------------------
     Option cards (single or multi select visual checkbox)
     --------------------------------------------------------- */

  function initOptionCards() {
    qsa('.option-card').forEach(function (card) {
      var input = qs('input', card);
      if (!input) return;
      function sync() { card.classList.toggle('is-selected', input.checked); }
      card.addEventListener('click', function (e) {
        if (e.target.tagName === 'INPUT') return;
        if (input.type === 'radio') {
          qsa('input[name="' + input.name + '"]').forEach(function (radio) {
            radio.checked = (radio === input);
            radio.closest('.option-card').classList.toggle('is-selected', radio === input);
          });
        } else {
          input.checked = !input.checked;
          sync();
        }
      });
      input.addEventListener('change', sync);
      sync();
    });
  }

  /* ---------------------------------------------------------
     Render helpers — small HTML-string builders shared by
     every aggregate/listing page.
     --------------------------------------------------------- */

  var MONTHS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  var WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

  function formatDatum(iso) {
    var parts = iso.split('-');
    var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return d.getDate() + '. ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  function countdown(iso) {
    var parts = iso.split('-');
    var target = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var diff = Math.round((target - today) / 86400000);
    if (diff === 0) return 'Heute';
    if (diff === 1) return 'Morgen';
    if (diff > 1) return 'in ' + diff + ' Tagen';
    return 'vor ' + Math.abs(diff) + ' Tagen';
  }

  function fachColorVars(fachId) {
    if (typeof Lesify === 'undefined') return '';
    var f = Lesify.getFach(fachId);
    if (!f) return '';
    var c = Lesify.getFachColor(f.farbe);
    // Im dunklen Design tragen `c.ink`/`c.bg` (dunkler Text auf hellem Pastell)
    // nicht — dann eine dunkle Fläche aus der Fachfarbe + heller Text. `c.base`
    // bleibt als Akzent (Rahmen, Punkt, Avatar) in beiden Designs tragfähig.
    if (document.documentElement.getAttribute('data-theme') === 'dark') {
      return '--fach-color:' + c.base +
        ';--fach-ink:#e6ebef' +
        ';--fach-bg:color-mix(in srgb, ' + c.base + ' 20%, #1b2126);';
    }
    return '--fach-color:' + c.base + ';--fach-ink:' + c.ink + ';--fach-bg:' + c.bg + ';';
  }

  function fachColorStyle(fachId) {
    var vars = fachColorVars(fachId);
    return vars ? ' style="' + vars + '"' : '';
  }

  // Filter-Pills für die Listenseiten (Themen/Klausuren/Dateien).
  // "Alle" behält den Standard-Chip-Look; die Fach-Pills sind mehrfach
  // wählbar und bekommen im aktiven Zustand den Fach-Pill-Look
  // (Rahmen/Text in Fachfarbe, transparente Fachfarbe als Fläche —
  // siehe .chip--fach.is-active in style.css).
  function fachFilterChips() {
    if (typeof Lesify === 'undefined') return '';
    // api.js: Lesify.faecher() ist async (Promise) — sync-Snapshot aus dem
    // Cache nehmen (braucht ein vorheriges `await Lesify.faecher()` auf der
    // Seite, wie jeder andere Cache-Lookup hier).
    var alle = Lesify._faecherCache ? Lesify._faecherCache() : Lesify.faecher();
    return '<button class="chip is-active" data-filter-value="*">Alle</button>' +
      alle.map(function (f) {
        return '<button class="chip chip--fach" data-filter-value="' + f.id + '" style="' + fachColorVars(f.id) + '">' + f.name + '</button>';
      }).join('');
  }

  function truncate(str, n) {
    str = str || '';
    return str.length > n ? str.slice(0, n).replace(/\s+\S*$/, '') + '…' : str;
  }

  /* ---------------------------------------------------------
     Karten-Wasserzeichen — großes, blasses Fach-SVG in der
     Fach-Farbe, dekorativ in der Kartenecke. Nur wenn das Fach
     ein vordefiniertes Icon hat (siehe FACH_PRESETS in data.js);
     eigene Fächer ohne Icon bleiben ohne Wasserzeichen.
     --------------------------------------------------------- */

  function cardWatermark(fachId) {
    if (typeof Lesify === 'undefined') return '';
    var f = Lesify.getFach(fachId);
    if (!f) return '';
    var svg = Lesify.getFachIcon(fachId);
    if (!svg) return '';
    // Farbe kommt aus der --fach-color-Variable der Karte (siehe fachColorVars),
    // damit der Hover-Zustand das Wasserzeichen auf den neutralen Ton umstellen kann.
    return '<span class="card-watermark" aria-hidden="true">' + svg + '</span>';
  }

  /* Fach-Avatar — Icon aus der Preset-Bibliothek, sonst Anfangsbuchstabe. */
  function fachAvatar(fach, size) {
    if (!fach) return '';
    var col = Lesify.getFachColor(fach.farbe);
    var svg = Lesify.getFachIconSvg ? Lesify.getFachIconSvg(fach.icon) : null;
    var s = size || 44;
    var inner = svg ? '<span class="spark" style="width:' + Math.round(s * 0.52) + 'px;height:' + Math.round(s * 0.52) + 'px">' + svg + '</span>' : '<span>' + fach.initial + '</span>';
    return '<span class="fach-avatar" style="width:' + s + 'px;height:' + s + 'px;background:' + col.base + '">' + inner + '</span>';
  }

  function badge(themaId) {
    if (typeof Lesify === 'undefined') return '';
    var l = Lesify.label(themaId);
    return '<a class="badge"' + fachColorStyle(l.fachId) + ' href="thema.html?id=' + themaId + '" title="' + l.fach + ' · ' + l.thema + '"><span class="dot"></span><span class="badge-label">' + l.fach + '<span class="sep">·</span>' + l.thema + '</span></a>';
  }

  function fachBadge(fachId) {
    if (typeof Lesify === 'undefined') return '';
    var f = Lesify.getFach(fachId);
    var name = f ? f.name : '—';
    return '<a class="badge"' + fachColorStyle(fachId) + ' href="fach.html?id=' + fachId + '" title="' + name + '"><span class="dot"></span><span class="badge-label">' + name + '</span></a>';
  }

  var TESTKLAUSUR_STATUS_LABEL = {
    erstellt: 'Aufgaben bereit',
    geloest: 'Analyse ausstehend',
    analysiert: 'Ausgewertet'
  };

  function testklausurStatusChip(t) {
    var label = TESTKLAUSUR_STATUS_LABEL[t.status] || t.status;
    if (t.status === 'analysiert' && t.ergebnis) label += ' · Note ' + t.ergebnis.note.toFixed(1);
    var cls = t.status === 'analysiert' ? ' is-active' : '';
    return '<span class="chip' + cls + '">' + label + '</span>';
  }

  var AMPEL_LABEL = { gruen: 'Läuft gut', gelb: 'Noch üben', rot: 'Durchgefallen' };
  function ampelDot(ampel) { return '<span class="ampel-dot ampel-' + ampel + '"></span>'; }
  function ampelChip(ampel) {
    return '<span class="ampel-chip ampel-chip-' + ampel + '">' + ampelDot(ampel) + AMPEL_LABEL[ampel] + '</span>';
  }
  function noteChip(note) {
    return '<span class="note-chip">Note <strong>' + note.toFixed(1) + '</strong><span class="text-muted"> · ' + Lesify.noteLabel(note) + '</span></span>';
  }

  var FILE_LABEL = { pdf: 'PDF', doc: 'DOC', img: 'IMG' };
  function fileTypeLabel(typ) { return FILE_LABEL[typ] || typ.toUpperCase(); }

  function fileStatusChip(status) {
    if (status === 'verarbeitung') return '<span class="chip"><span class="skeleton" style="width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:6px;vertical-align:middle"></span>Wird analysiert…</span>';
    return '<span class="chip is-active">Bereit</span>';
  }

  /* ---------------------------------------------------------
     Datei-Karte — ein globales Design für Grid- und Listenansicht.
     Zeigt eine gekürzte Zusammenfassung statt Logo/Typ/„Bereit"-Pill.
     --------------------------------------------------------- */

  function dateiSummarySnippet(d, n) {
    if (d.zusammenfassung) return '<span class="datei-summary">' + truncate(d.zusammenfassung, n) + '</span>';
    return '<span class="datei-summary is-pending"><span class="skeleton" style="width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:6px;vertical-align:middle"></span>Wird gelesen und zusammengefasst…</span>';
  }

  function dateiCard(d) {
    return '<div class="card is-hoverable has-watermark datei-card" data-datei-id="' + d.id + '" data-filter="' + d.fachId + '" tabindex="0" role="link" style="padding:20px;' + fachColorVars(d.fachId) + '">' +
      cardWatermark(d.fachId) +
      '<div class="datei-card-name">' + d.name + '</div>' +
      '<p class="datei-card-sub">' + dateiSummarySnippet(d, 120) + '</p>' +
      '<div class="flex justify-between items-center datei-card-foot">' + badge(d.themaId) + '<span class="text-xs text-muted">' + d.groesse + ' · ' + d.updated + '</span></div>' +
    '</div>';
  }

  function dateiRow(d) {
    return '<div data-datei-id="' + d.id + '" data-filter="' + d.fachId + '" tabindex="0" role="link" style="display:flex;align-items:center;gap:15px;padding:14px 20px">' +
      '<span style="flex:1;min-width:0">' +
        '<span style="display:block;font-size:0.87rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:3px">' + d.name + '</span>' +
        '<span class="text-xs text-muted" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + dateiSummarySnippet(d, 90) + '</span>' +
      '</span>' +
      badge(d.themaId) +
      '<span class="text-xs text-muted mono" style="flex-shrink:0;width:70px;text-align:right">' + d.groesse + '</span>' +
      '<span class="text-xs text-muted" style="flex-shrink:0;width:110px;text-align:right">' + d.updated + '</span>' +
    '</div>';
  }

  /* ---------------------------------------------------------
     Testklausur-Note — große, farbige Anzeige (Ampel-Ton) auf
     Listen-/Übersichtskarten. Keine fortlaufende „Vorbereitungsnote"
     mehr: gezeigt wird die eingefrorene Note der zuletzt
     abgeschlossenen Testklausur (Testklausur 2, sobald analysiert,
     sonst Testklausur 1) — siehe Lesify.klausurNote().
     --------------------------------------------------------- */

  function testNoteBox(note, testNr, size) {
    var ampel = Lesify.noteAmpel(note);
    var cls = 'vb-note-box vb-note-' + ampel + (size === 'lg' ? ' vb-note-box-lg' : '');
    return '<div class="' + cls + '">' +
      '<span class="vb-note-num">' + note.toFixed(1) + '</span>' +
      '<span class="vb-note-meta"><span class="vb-note-cap">Testklausur ' + testNr + '</span><span class="vb-note-lbl">' + Lesify.noteLabel(note) + '</span></span>' +
    '</div>';
  }

  // Nimmt entweder eine Klausur-ID (data.js — sync Testklausur-Liste vorhanden)
  // oder das volle Klausur-Objekt (api.js — `note` kommt mit GET /klausuren
  // bereits eingebettet, ein flacher Testklausur-Index existiert dort nicht).
  function klausurNoteBox(klausurOderId) {
    // api.js liefert `note` bereits mit GET /klausuren eingebettet (kein
    // flacher Testklausur-Index wie im data.js-Prototyp verfügbar) — daran
    // erkennbar, dass das übergebene Objekt ein `note`-Feld trägt (auch wenn
    // `null`, weil noch keine Testklausur analysiert ist).
    if (klausurOderId && typeof klausurOderId === 'object' && 'note' in klausurOderId) {
      return klausurOderId.note
        ? testNoteBox(klausurOderId.note.note, klausurOderId.note.testNr)
        : '<span class="chip">Testklausur läuft</span>';
    }
    var klausurId = typeof klausurOderId === 'object' ? klausurOderId.id : klausurOderId;
    var tks = Lesify.testklausurenForKlausur(klausurId);
    if (!tks.length) return '<span class="chip">Keine Testklausur</span>';
    var kn = Lesify.klausurNote(klausurId);
    if (!kn) return testklausurStatusChip(tks[tks.length - 1]);
    return testNoteBox(kn.note, kn.testNr);
  }

  /* ---------------------------------------------------------
     Klausur-Karte — ein globales Design für Dashboard, Fach-,
     Thema- und Klausuren-Übersicht.
     --------------------------------------------------------- */

  function klausurCard(k) {
    var vergangen = Lesify.klausurVergangen(k);
    // Bereits geschriebene Klausuren zeigen keine Note — Lesify erfasst das
    // Klausur-Endergebnis bewusst nicht. Der „Geschrieben"-Flag genügt.
    var foot = vergangen ? '' : klausurNoteBox(k);
    return '<div class="card is-hoverable has-watermark klausur-card' + (vergangen ? ' klausur-card--erledigt' : '') + '" data-href="klausur.html?id=' + k.id + '" data-filter="' + k.fachId + '" tabindex="0" role="link" style="' + fachColorVars(k.fachId) + '">' +
      cardWatermark(k.fachId) +
      (vergangen ? '<span class="klausur-card-flag">' + Icons.check + 'Geschrieben</span>' : '') +
      '<h3 class="klausur-card-title">' + k.titel + '</h3>' +
      '<div class="klausur-card-top">' +
        '<div class="flex gap-2" style="flex-wrap:wrap">' + k.themaIds.map(badge).join('') + '</div>' +
        '<span class="klausur-card-date mono">' + formatDatum(k.datum) + ' · ' + countdown(k.datum) + '</span>' +
      '</div>' +
      (foot ? '<div class="klausur-card-foot">' + foot + '</div>' : '') +
    '</div>';
  }

  // Gemeinsame Klausur-Liste für Klausuren-, Fach- und Thema-Seite: anstehende
  // Klausuren zuerst (nächster Termin oben), darunter die bereits geschriebenen
  // (neueste zuerst) unter einer Abschnitts-Überschrift.
  function klausurListe(klausuren) {
    var anstehend = [], vergangen = [];
    klausuren.forEach(function (k) { (Lesify.klausurVergangen(k) ? vergangen : anstehend).push(k); });
    anstehend.sort(function (a, b) { return a.datum.localeCompare(b.datum); });
    vergangen.sort(function (a, b) { return b.datum.localeCompare(a.datum); });
    var html = anstehend.map(klausurCard).join('');
    if (vergangen.length) {
      html += '<div class="klausur-list-divider">Bereits geschrieben</div>' + vergangen.map(klausurCard).join('');
    }
    return html;
  }

  /* =========================================================
     7-Tage-Lernplan — eigene Seite (lernplan.html), 1:1 zur Klausur,
     läuft von klausur.datum − 7 Tage bis zur Klausur. Eine Sektion pro
     Tag (feste Reihenfolge 1–7). Alles Berechnete kommt aus
     Lesify.lernplanStatus(lernplanId) — hier wird nur gerendert.
     klausur.html / testklausur.html zeigen nur einen Teaser dorthin.
     Nur Ink-Skala + Ampel-Farben, keine zusätzliche Akzentfarbe.
     ========================================================= */

  function round1(n) { return Math.round(n * 10) / 10; }
  function fmtNote(n) { return round1(n).toFixed(1); }

  function apTageBis(iso) {
    var parts = iso.split('-');
    var target = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
  }
  function apCountdownText(cd) {
    if (cd == null) return 'Kein Klausurtermin';
    if (cd < 0) return 'Termin vorbei';
    if (cd === 0) return 'Klausur heute';
    if (cd === 1) return 'Noch 1 Tag';
    return 'Noch ' + cd + ' Tage';
  }

  /* --- Eingefrorenes KI-Feedback pro Thema (aus der Testklausur-Analyse) --- */
  function lpVerdict(t, themaId) {
    var e = t && t.ergebnis && t.ergebnis.proThema.find(function (x) { return x.themaId === themaId; });
    return e ? e.erklaerung : '';
  }

  /* --- stark / wackelig / schwach als Ampel-Chip (reine Anzeige, Lesify.tierLabel) --- */
  function tierChip(ampel) {
    return '<span class="ampel-chip ampel-chip-' + ampel + '">' + ampelDot(ampel) +
      (typeof Lesify !== 'undefined' ? Lesify.tierLabel(ampel) : ampel) + '</span>';
  }

  /* --- Die 7 Lerntage: Titel + Kurzbeschreibung (Deutsch, verbatim aus dem Konzept) --- */
  var LP_TAGE = [
    { titel: 'Testklausur 1', beschreibung: 'Diagnostisch. Sortiert deine Themen in stark, wackelig und schwach.' },
    { titel: 'Schwachstellen verstehen', beschreibung: 'Erklärung anhand deiner tatsächlich falsch gelösten Aufgabe, plus Beispiel und Verständnis-Check.' },
    { titel: 'Schwachstellen üben', beschreibung: 'Beispielaufgaben selbstständig lösen, Lösungen checken. Der Lernzettel startet.' },
    { titel: 'Schwachstellen festigen', beschreibung: 'Feynman-Prinzip: den Stoff jetzt selbst erklären. Der Lernzettel wächst.' },
    { titel: 'Testklausur 2', beschreibung: 'Re-Diagnose. Was hat sich verbessert, was ist noch schwach?' },
    { titel: 'Fokus auf die Lücken aus Testklausur 2', beschreibung: 'Hartnäckige Lücken gezielt angehen + die ursprünglichen Schwachstellen auffrischen.' },
    { titel: 'Selbsttest mit dem Lernzettel', beschreibung: 'Nur noch testen, was sitzt — mit dem Lernzettel. Leicht, kein neuer Stoff.' }
  ];

  /* --- KI-Chat-Deep-Link: öffnet chat.html im richtigen Fach/Thema/Modus mit
         vorbelegtem, NICHT gesendetem Prompt. --- */
  function lpChatHref(fachId, themaId, mode, text) {
    return 'chat.html?fach=' + encodeURIComponent(fachId) + '&thema=' + encodeURIComponent(themaId) +
      '&mode=' + mode + '&prompt=' + encodeURIComponent(text);
  }
  /* --- Kontinuität: für einen Aufgaben-Punkt an Tag 2/3/4/6 auf den schon
         bestehenden Chat zu (Tag, Modus, Thema) verweisen, falls die chatMap des
         Lernplans einen kennt — sonst wie sonst ein frischer Deep-Link. lp/lptag
         gehen mit, damit chat.html den entstehenden/fortgesetzten Chat in die
         chatMap zurückmelden kann. Tag 7 (einzelner Selbsttest-Punkt) bleibt
         bewusst ein normaler Deep-Link ohne Kontinuität. --- */
  function lpItemChatHref(s, tag, it) {
    var plain = lpChatHref(it.fachId, it.themaId, it.mode, it.prompt);
    if ([2, 3, 4, 6].indexOf(tag) === -1) return plain;
    var lpId = s.lernplan && s.lernplan.id;
    if (!lpId || typeof Lesify.getLernplanChatId !== 'function') return plain;
    var lpQuery = '&lp=' + encodeURIComponent(lpId) + '&lptag=' + tag;
    var chatId = Lesify.getLernplanChatId(lpId, tag, it.mode, it.themaId);
    if (chatId && Lesify.getChat(chatId)) {
      return 'chat.html?chat=' + encodeURIComponent(chatId) +
        '&prompt=' + encodeURIComponent(it.prompt) + lpQuery;
    }
    return plain + lpQuery;
  }
  /* --- Klassenstufe (für die Schwierigkeit der generierten Aufgaben). Fach-Klasse
         geht vor, sonst die im Profil hinterlegte. --- */
  function lpKlasse(s) {
    var f = (s.testklausur1 && s.testklausur1.fachId) ? Lesify.getFach(s.testklausur1.fachId) : null;
    var u = (typeof Lesify.getUser === 'function') ? Lesify.getUser() : null;
    return (f && f.klasse) || (u && u.klasse) || '';
  }
  function lpNiveau(s) {
    var kl = lpKlasse(s);
    return kl ? ' Orientiere Schwierigkeit und Umfang an der ' + kl + '.' : '';
  }
  function themaName(id) { return Lesify.label(id).thema; }
  function themaListe(ids) {
    var namen = ids.map(themaName);
    if (namen.length <= 1) return namen.join('');
    return namen.slice(0, -1).join(', ') + ' und ' + namen[namen.length - 1];
  }

  /* --- Markdown-Blöcke (# / ##) → HTML, wie in lernzettel.html. Für Lernzettel. --- */
  function lpMdBlocks(content, limit) {
    var blocks = String(content || '').split('\n\n');
    if (limit) blocks = blocks.slice(0, limit);
    return mdToHtml(blocks.join('\n\n'), { headingShift: 0 });
  }

  /* =========================================================
     Die 7 Tage-Karten. Jede liest ihren Zustand aus s = lernplanStatus.
     ========================================================= */

  function lpDayState(s, n) {
    if (s.aktuellerTag === n) return 'aktuell';
    var tag = s['tag' + n];
    return (tag && tag.erledigt) ? 'erledigt' : 'offen';
  }
  function lpDayStatusChip(state) {
    if (state === 'erledigt') return '<span class="ampel-chip ampel-chip-gruen">' + Icons.check + ' Erledigt</span>';
    if (state === 'aktuell') return '<span class="chip is-active">Heute dran</span>';
    return '<span class="chip">Offen</span>';
  }
  function lpNichtsZuTun(text) {
    return '<p class="ap-nt-none">Nichts zu tun — ' + text + '</p>';
  }
  function lpDoneButton(n) {
    return '<button type="button" class="btn btn-secondary btn-sm" data-lp-done="' + n + '">Tag ' + n + ' abschließen</button>';
  }
  function lpWartetAufTk1() {
    return '<p class="ap-nt-none">Wird nach Testklausur 1 geplant — dann stehen hier deine schwächsten Themen.</p>';
  }

  /* --- Konkrete Aufgabe + eingefrorene Diagnose aus Testklausur 1 zu einem Thema.
         Beides existiert schon (aufgaben[].frage, ergebnis.proThema[].erklaerung);
         fehlt es (sollte nicht vorkommen), kommt {frage:null, erklaerung:null} zurück. --- */
  function lpAufgabeUndErklaerung(s, themaId) {
    var tk = s.testklausur1 || {};
    var aufgabe = (tk.aufgaben || []).find(function (a) { return a.themaId === themaId; });
    var erg = tk.ergebnis ? tk.ergebnis.proThema.find(function (p) { return p.themaId === themaId; }) : null;
    return { frage: aufgabe ? aufgabe.frage : null, erklaerung: erg ? erg.erklaerung : null };
  }

  /* --- Aufgabenliste eines Lerntags: geordnete [{key,label,mode,prompt,themaId,fachId}].
         Die key-Reihenfolge MUSS mit aufgabenKeys() in data.js übereinstimmen — daraus
         berechnet lernplanStatus, ob der Tag (alle Haken gesetzt) erledigt ist. --- */
  function lpTagAufgaben(s, n) {
    var fach = s.testklausur1 ? s.testklausur1.fachId : null;
    var tag = s['tag' + n] || {};
    var fokus = tag.fokusThemen || [];
    var kurz = tag.kurzThemen || [];
    var niv = lpNiveau(s);
    var items = [];
    if (n === 2) {
      fokus.forEach(function (id) {
        var ae = lpAufgabeUndErklaerung(s, id);
        var fehlerText = ae.frage
          ? 'Ich habe bei Testklausur 1 diese Aufgabe zu ' + themaName(id) + ' nicht richtig gelöst: „' + ae.frage + '". ' +
            (ae.erklaerung ? 'Diagnose: ' + ae.erklaerung + ' ' : '') +
            'Erklär mir ' + themaName(id) + ' nochmal von Grund auf und geh dabei gezielt auf diesen Fehler ein. Ich darf danach Nachfragen stellen.' + niv
          : 'Erklär mir ' + themaName(id) + ' nochmal von Grund auf. Ich darf danach Nachfragen stellen.' + niv;
        items.push({ key: 'fehler:' + id, themaId: id, mode: 'erklaeren', label: 'Fehler klären: ' + themaName(id), prompt: fehlerText });
        items.push({ key: 'beispiel:' + id, themaId: id, mode: 'erklaeren', label: 'Beispiel dazu: ' + themaName(id),
          prompt: 'Gib mir ein Alltagsbeispiel oder eine Analogie zu ' + themaName(id) + ', die den Kern greifbar macht.' + niv });
        items.push({ key: 'check:' + id, themaId: id, mode: 'ueben', label: 'Verständnis-Check: ' + themaName(id),
          prompt: 'Stell mir 3 kurze Verständnisfragen zu ' + themaName(id) + ', um zu prüfen, ob die Erklärung gerade angekommen ist.' + niv });
      });
      if (kurz.length) items.push({ key: 'kurz', themaId: kurz[0], mode: 'erklaeren', label: 'Kurz-Check: ' + themaListe(kurz),
        prompt: 'Geh diese Themen kurz durch, für jedes reicht die wichtigste Regel plus ein Beispiel: ' + themaListe(kurz) + '.' + niv });
    } else if (n === 3) {
      var anzahl = s.tag1.intensitaet === 'tief' ? 5 : 3;
      fokus.forEach(function (id) {
        items.push({ key: 'abfragen:' + id, themaId: id, mode: 'ueben', label: 'Abfragen: ' + themaName(id),
          prompt: 'Gib mir ' + anzahl + ' Übungsaufgaben zu ' + themaName(id) + ', erst ohne Lösung. Danach frag mich die Lösungswege mündlich ab und sag mir nach jeder Antwort, ob sie stimmt.' + niv });
      });
      if (fokus.length >= 2) items.push({ key: 'gemischt', themaId: fokus[0], mode: 'ueben', label: 'Gemischt abfragen',
        prompt: 'Frag mich abwechselnd, gemischt, Fragen zu ' + themaListe(fokus) + ' — nicht der Reihe nach, sondern bunt durcheinander.' + niv });
      if (fokus.length) items.push({ key: 'loesungen', themaId: fokus[0], mode: 'ueben', label: 'Lösungen checken',
        prompt: 'Ich habe die Beispielaufgaben zu ' + themaListe(fokus) + ' selbstständig gelöst. Prüf meine Lösungswege, zeig mir, was noch falsch war und kläre die Lücke, bevor ich weitermache.' + niv });
      if (kurz.length) items.push({ key: 'kurzabfragen', themaId: kurz[0], mode: 'ueben', label: 'Kurz abfragen: ' + themaListe(kurz),
        prompt: 'Stell mir gemischt 1–2 Fragen zu jedem dieser Themen: ' + themaListe(kurz) + '.' + niv });
    } else if (n === 4) {
      fokus.forEach(function (id) {
        items.push({ key: 'feynman:' + id, themaId: id, mode: 'erklaeren', label: 'Feynman: ' + themaName(id),
          prompt: 'Erklär mir jetzt ' + themaName(id) + ' in eigenen Worten, so einfach wie möglich, so wie du es die letzten Tage gelernt hast. Sag mir, ob meine Erklärung stimmt.' + niv });
      });
      if (fokus.length) items.push({ key: 'wiederholung', themaId: fokus[0], mode: 'ueben', label: 'Wiederholung Tag 2',
        prompt: 'Frag mich kurz 3 Fragen zu dem, was wir an Tag 2 zu ' + themaListe(fokus) + ' geklärt haben, um zu checken, ob es noch sitzt.' + niv });
      if (s.tag1.intensitaet === 'tief') items.push({ key: 'transfer', themaId: fokus[0], mode: 'ueben', label: 'Transferaufgabe',
        prompt: 'Gib mir eine neue Aufgabe zu ' + themaName(fokus[0]) + ', die wir so noch nicht besprochen haben, damit ich zeigen kann, dass ich es wirklich verstanden habe.' + niv });
    } else if (n === 6) {
      (s.tag6.stubborn || []).forEach(function (id) {
        items.push({ key: 'luecke:' + id, themaId: id, mode: 'erklaeren', label: 'Lücke schließen: ' + themaName(id),
          prompt: 'Das sitzt bei ' + themaName(id) + ' immer noch nicht ganz — lass es uns gezielt angehen: erklär mir zuerst, was ich schon verstehe, dann üben wir die Lücke.' + niv });
      });
      (s.tag6.aufgefrischt || []).forEach(function (id) {
        items.push({ key: 'frisch:' + id, themaId: id, mode: 'ueben', label: 'Auffrischen: ' + themaName(id),
          prompt: 'Frag mich kurz ein paar Fragen zu ' + themaName(id) + ' zum Auffrischen — das saß schon mal, soll aber nicht wieder abrutschen.' + niv });
      });
    } else if (n === 7) {
      var anker = s.tag1.schwacheThemen[0] || (s.klausur && s.klausur.themaIds[0]) || (s.testklausur1 && s.testklausur1.themaIds[0]);
      var f7 = (s.testklausur1 && s.testklausur1.fachId) || (s.klausur && s.klausur.fachId);
      if (anker && f7) items.push({ key: 'selbsttest', themaId: anker, fachId: f7, mode: 'ueben', label: 'Selbsttest mit dem Lernzettel',
        prompt: 'Frag mich anhand meines Lernzettels ab — kurz und gemischt, kein neuer Stoff.' + niv });
    }
    items.forEach(function (it) { if (!it.fachId) it.fachId = fach; });
    return items;
  }

  /* --- Die abhakbare Tages-Checkliste. Jede Zeile hat ZWEI klar getrennte Ziele:
         (1) links der kleine, beschriftete Erledigt-Haken `<label.lp-cl-check>`
         (data-lp-check/-day → Lesify.setLernplanCheck); (2) durch eine Trennlinie
         abgesetzt der Aktions-Button `<a.lp-cl-open>` mit „öffnen →" — öffnet den
         vorbereiteten KI-Chat. Alle Haken gesetzt = Tag erledigt. --- */
  function lpChecklist(s, n, items) {
    if (!items.length) return '';
    var checks = (s['tag' + n] && s['tag' + n].checks) || {};
    var done = items.filter(function (it) { return checks[it.key] === true; }).length;
    var total = items.length;
    var rows = items.map(function (it) {
      var on = checks[it.key] === true;
      return '<li class="lp-cl-item' + (on ? ' is-done' : '') + '">' +
        '<label class="lp-cl-check" title="&#8222;' + it.label + '&#8220; als erledigt markieren">' +
          '<input type="checkbox"' + (on ? ' checked' : '') + ' aria-label="&#8222;' + it.label + '&#8220; als erledigt markieren"' +
            ' data-lp-check="' + it.key + '" data-lp-day="' + n + '">' +
          '<span class="lp-cl-box" aria-hidden="true">' + Icons.check + '</span>' +
          '<span class="lp-cl-checktxt">erledigt</span>' +
        '</label>' +
        '<a class="lp-cl-open" href="' + lpItemChatHref(s, n, it) + '">' +
          '<span class="lp-cl-open-ico" aria-hidden="true">' + Icons.chat + '</span>' +
          '<span class="lp-cl-label">' + it.label + '</span>' +
          '<span class="lp-cl-cta">öffnen<span class="lp-cl-cta-arr" aria-hidden="true">' + Icons.arrowRight + '</span></span>' +
        '</a>' +
      '</li>';
    }).join('');
    return '<div class="lp-cl">' +
      '<div class="lp-cl-head">' +
        '<span class="lp-cl-count">' + done + '<span>&thinsp;/&thinsp;' + total + ' erledigt</span></span>' +
        '<div class="lp-cl-bar"><span style="transform:scaleX(' + (total ? (done / total).toFixed(3) : 0) + ')"></span></div>' +
      '</div>' +
      '<ul class="lp-cl-list">' + rows + '</ul>' +
    '</div>';
  }

  /* --- Fußzeile eines Lerntags: optionale Aktion (Lernzettel …) + manueller
         „Tag abschließen"-Button (Override, setzt alle Haken). --- */
  function lpDayFooter(s, n, extra) {
    var bits = [];
    if (extra) bits.push(extra);
    if (!s['tag' + n].erledigt) bits.push(lpDoneButton(n));
    if (!bits.length) return '';
    return '<div class="flex gap-2" style="flex-wrap:wrap;margin-top:14px">' + bits.join('') + '</div>';
  }

  /* --- Tag 1: Testklausur 1 (Diagnose) --- */
  function lpTag1Body(s) {
    var tk1 = s.testklausur1;
    if (!tk1) return '<p class="ap-nt-none">Noch keine Testklausur angelegt.</p>';
    if (tk1.status === 'erstellt') {
      return '<p class="ap-topic-verdict">Aufgaben stehen bereit — herunterladen, lösen und die Lösung hochladen.</p>' +
        '<a class="btn btn-primary btn-sm" href="testklausur.html?id=' + tk1.id + '">Testklausur 1 öffnen</a>';
    }
    if (tk1.status === 'geloest') {
      return '<p class="ap-topic-verdict">Lösung hochgeladen — bereit zur Analyse.</p>' +
        '<a class="btn btn-primary btn-sm" href="testklausur.html?id=' + tk1.id + '">Analyse starten</a>';
    }
    // analysiert
    var chips = s.tag1.proThema.map(function (p) {
      return '<div class="ap-topic ap-topic-' + p.ampel + '">' +
        '<div class="ap-topic-h">' + badge(p.themaId) + tierChip(p.ampel) + noteChip(p.note) +
          '<span class="ap-topic-pct">' + p.prozent + '%</span></div>' +
        '<p class="ap-topic-verdict">' + (p.ampel === 'gruen' ? 'Sitzt — nichts weiter zu tun.' : lpVerdict(tk1, p.themaId)) + '</p>' +
      '</div>';
    }).join('');
    return '<p class="ap-topic-verdict">Ausgewertet — deine Themen sind in stark / wackelig / schwach sortiert.</p>' +
      '<div class="ap-topics">' + chips + '</div>' +
      '<div style="margin-top:12px"><a class="section-link" href="testklausur.html?id=' + tk1.id + '">Ganze Auswertung ansehen ' + Icons.arrowRight + '</a></div>';
  }

  /* --- Tag 2 = Schritt 1 „Verstehen anhand des Fehlers": Erklärung bezogen auf die
         tatsächlich falsch gelöste Aufgabe + Alltagsbeispiel + Verständnis-Check,
         bei 4+ schwachen Themen zusätzlich ein gebündelter Kurz-Check. Als
         abhakbare Checkliste — alle Haken = Tag erledigt. --- */
  function lpTag2Body(s) {
    if (!s.tag1.erledigt) return lpWartetAufTk1();
    if (!s.tag2.fokusThemen.length && !s.tag2.kurzThemen.length) return lpNichtsZuTun('nach Testklausur 1 saß schon alles.');
    return '<p class="ap-topic-verdict">Bau das Verständnis der schwächsten Themen neu auf — ausgehend von deinem tatsächlichen Fehler in Testklausur 1. Hak jeden Schritt ab, wenn du ihn im Chat erledigt hast.</p>' +
      lpChecklist(s, 2, lpTagAufgaben(s, 2)) +
      lpDayFooter(s, 2);
  }

  /* --- Tag 3 = Schritt 2 „Beispielaufgaben selbstständig lösen": Abfrage-Schritte
         + Korrektur-Checkpoint (+ Kurz-Abfrage bei 4+ Themen). Der Lernzettel
         startet und deckt alle schwachen Themen ab (Fokus + Kurz). --- */
  function lpTag3Body(s) {
    if (!s.tag1.erledigt) return lpWartetAufTk1();
    if (!s.tag3.fokusThemen.length && !s.tag3.kurzThemen.length) return lpNichtsZuTun('es gibt keine schwachen Themen zu üben.');
    var spickThemen = s.tag3.fokusThemen.concat(s.tag3.kurzThemen);
    var spickBtn = s.lernplan.lernzettel
      ? '<span class="chip">Lernzettel läuft schon</span>'
      : '<button type="button" class="btn btn-secondary btn-sm" data-lp-lernzettel="' + spickThemen.join(',') + '">Lernzettel starten</button>';
    return '<p class="ap-topic-verdict">Beispielaufgaben selbstständig lösen, dann die Lösungswege checken lassen. Danach startet dein Lernzettel.</p>' +
      lpChecklist(s, 3, lpTagAufgaben(s, 3)) +
      lpDayFooter(s, 3, spickBtn);
  }

  /* --- Tag 4 = Schritt 3 „Feynman-Prinzip als Konsolidierung": den Stoff jetzt
         selbst erklären, Tag-2-Inhalt wiederholen, bei genau einem schwachen Thema
         zusätzlich eine Transferaufgabe. Nur Fokus-Themen. --- */
  function lpTag4Body(s) {
    if (!s.tag1.erledigt) return lpWartetAufTk1();
    if (!s.tag4.fokusThemen.length) return lpNichtsZuTun('es gibt keine schwachen Themen zu festigen.');
    var addBtn = '<button type="button" class="btn btn-secondary btn-sm" data-lp-lernzettel="' + s.tag4.fokusThemen.join(',') + '">Zum Lernzettel hinzufügen</button>';
    return '<p class="ap-topic-verdict">Erklär den Stoff jetzt selbst — das zeigt, ob er wirklich sitzt. Der Lernzettel wächst.</p>' +
      lpChecklist(s, 4, lpTagAufgaben(s, 4)) +
      lpDayFooter(s, 4, addBtn);
  }

  /* --- Tag 5: Testklausur 2 (Re-Diagnose) --- */
  function lpTag5Body(s) {
    if (!s.tag1.erledigt) return '<p class="ap-nt-none">Erst nach Testklausur 1 — dann zeigt sich, ob eine Re-Diagnose nötig ist.</p>';
    if (!s.tag5.noetig) return lpNichtsZuTun('alle Themen saßen schon nach Testklausur 1.');
    var k = s.klausur;
    var hint = (k && k.datum) ? apCountdownText(apTageBis(k.datum)) : '';
    if (!s.testklausur2) {
      return '<p class="ap-topic-verdict">Zeit für die Re-Diagnose — nur die an Tag 1 schwachen und wackeligen Themen.' +
        (hint ? ' ' + hint + ' bis zur Klausur.' : '') + '</p>' +
        '<button type="button" class="btn btn-primary btn-sm" data-lp-start-tk2>Testklausur 2 starten</button>';
    }
    if (s.testklausur2.status !== 'analysiert') {
      var txt = s.testklausur2.status === 'geloest' ? 'Lösung hochgeladen — bereit zur Analyse.' : 'Aufgaben stehen bereit — herunterladen, lösen, hochladen.';
      return '<p class="ap-topic-verdict">' + txt + '</p>' +
        '<a class="btn btn-primary btn-sm" href="testklausur.html?id=' + s.testklausur2.id + '">Testklausur 2 öffnen</a>';
    }
    // analysiert → Tag 1 → Tag 5 Vergleich
    var rank = { gruen: 0, gelb: 1, rot: 2 };
    var rows = s.testklausur2.vorbereitung.proThema.map(function (p) {
      var vor = s.tag1.proThema.find(function (x) { return x.themaId === p.themaId; });
      var vorAmpel = vor ? vor.ampel : 'gelb';
      var verlauf = p.ampel === 'gruen' ? 'verbessert'
        : (rank[p.ampel] < rank[vorAmpel] ? 'verbessert' : (rank[p.ampel] === rank[vorAmpel] ? 'gleich' : 'noch offen'));
      return '<div class="ap-topic ap-topic-' + p.ampel + '">' +
        '<div class="ap-topic-h">' + badge(p.themaId) +
          tierChip(vorAmpel) + '<span aria-hidden="true">&rarr;</span>' + tierChip(p.ampel) +
          '<span class="ap-topic-pct">' + verlauf + '</span></div>' +
      '</div>';
    }).join('');
    return '<p class="ap-topic-verdict">Re-Diagnose ausgewertet — Vergleich Testklausur 1 → Testklausur 2:</p>' +
      '<div class="ap-topics">' + rows + '</div>';
  }

  /* --- Tag 6: Fokus auf die Lücken aus Testklausur 2 --- */
  function lpTag6Body(s) {
    if (!s.tag1.erledigt) return '<p class="ap-nt-none">Erst nach Testklausur 1.</p>';
    if (!s.tag5.noetig) return lpNichtsZuTun('ohne Testklausur 2 gibt es hier nichts.');
    if (!s.testklausur2 || s.testklausur2.status !== 'analysiert') {
      return '<p class="ap-nt-none">Erst verfügbar, wenn Testklausur 2 ausgewertet ist.</p>';
    }
    if (!s.tag6.stubborn.length && !s.tag6.aufgefrischt.length) {
      return lpNichtsZuTun('Testklausur 2 war überall stark.') +
        (s.tag6.erledigt ? '' : '<div style="margin-top:12px">' + lpDoneButton(6) + '</div>');
    }
    var addBtn = s.tag6.stubborn.length
      ? '<button type="button" class="btn btn-secondary btn-sm" data-lp-lernzettel="' + s.tag6.stubborn.join(',') + '">Zum Lernzettel hinzufügen</button>'
      : '';
    return '<p class="ap-topic-verdict">Hartnäckige Lücken gezielt angehen — und die ursprünglichen Schwachstellen auffrischen.</p>' +
      lpChecklist(s, 6, lpTagAufgaben(s, 6)) +
      lpDayFooter(s, 6, addBtn);
  }

  /* --- Tag 7: Selbsttest mit dem Lernzettel (eine abhakbare Aufgabe). --- */
  function lpTag7Body(s, lernplanId) {
    if (!s.tag1.erledigt) return '<p class="ap-nt-none">Der leichte Abschlusstag — kommt, wenn der Rest des Plans steht.</p>';
    var lp = s.lernplan;
    var pdfPfad = '/lernplaene/' + lernplanId + '/lernzettel/dokument';
    var spickBlock = lp.lernzettel
      ? '<div class="lp-lz-card">' +
          '<div class="lp-lz-head">' +
            '<span class="lp-lz-title">Dein Lernzettel</span>' +
            '<button type="button" class="btn btn-secondary btn-sm" data-lp-lz-download="' + pdfPfad + '" data-lp-lz-name="lernzettel-' + Lesify.slugify((s.klausur && s.klausur.titel) || 'lernplan') + '">' + Icons.download + ' Als PDF herunterladen</button>' +
          '</div>' +
          '<div class="pdf-slot lp-pdf-mini" data-lp-pdf="' + pdfPfad + '"></div>' +
          '<div class="lp-lz-foot"><a class="section-link" href="lernplan-lernzettel.html?lernplan=' + lernplanId + '">Ganzen Lernzettel öffnen ' + Icons.arrowRight + '</a></div>' +
        '</div>'
      : '<p class="ap-nt-none">Noch kein Lernzettel — der Selbsttest geht trotzdem, dann eben frei.</p>';
    var summary = s.tag7.erledigt
      ? '<p class="ap-topic-verdict" style="margin-top:14px">Lernplan abgeschlossen. Du bist vorbereitet.</p>'
      : '';
    return '<p class="ap-topic-verdict">Heute nur noch testen, was sitzt — leicht, kein neuer Stoff.</p>' +
      spickBlock +
      lpChecklist(s, 7, lpTagAufgaben(s, 7)) +
      (s.tag7.erledigt ? summary : '<div style="margin-top:14px"><button type="button" class="btn btn-primary btn-sm" data-lp-done="7">Lernplan abschließen</button></div>');
  }

  var LP_DAY_BODY = [lpTag1Body, lpTag2Body, lpTag3Body, lpTag4Body, lpTag5Body, lpTag6Body, lpTag7Body];

  /* Gemeinsamer Seitenkopf. */
  function lpHead(s) {
    var k = s.klausur;
    var countdown = (k && k.datum) ? apTageBis(k.datum) : null;
    var eng = countdown != null && countdown >= 0 && countdown <= 3;
    return '<div class="page-head lp-head">' +
        '<div>' + (k ? fachBadge(k.fachId) : '') +
          '<h1 class="page-title" style="margin-top:14px">' + (k ? k.titel : 'Lernplan') + '</h1>' +
          '<p class="page-sub"><span class="flex items-center gap-2" style="display:inline-flex">' +
            '<span class="spark" style="width:14px;height:14px;color:var(--ink-400)">' + Icons.calendar + '</span>' +
            (k ? (formatDatum(k.datum) + ' · ') : '') +
            '<span' + (eng ? ' class="lp-countdown-eng"' : '') + '>' + apCountdownText(countdown) + '</span>' +
          '</span></p>' +
        '</div>' +
      '</div>';
  }
  function lpDayBody(s, n, lernplanId) { return LP_DAY_BODY[n - 1](s, lernplanId); }

  // Ausgewählter Tag in der Split-Ansicht. Per [data-lp-focus] gesetzt,
  // bei Lernplan-Wechsel zurückgesetzt.
  var lpFocusTag = null, lpLastId = null;
  function lpResolvedFocus(s) {
    var t = lpFocusTag;
    if (!t || t < 1 || t > 7) t = (s.aktuellerTag === 'fertig') ? 7 : s.aktuellerTag;
    return t;
  }

  /* Fachfarben-Akzent-Variante für die Lernplan-Ansicht — final auf
     „Kräftig" (lp-fc--4) festgelegt, kein Dev-Switcher mehr. */
  function lpFcClass() { return 'lp-fc--4'; }

  /* Nur das rechte Panel der Split-Ansicht (aktueller/fokussierter Tag) —
     exakt wie auf lernplan.html. Wird auf klausur.html mit einer eigenen
     horizontalen Kopfleiste kombiniert (R.lernplanSplitMain). */
  function lpSplitMain(s, n, lernplanId) {
    var meta = LP_TAGE[n - 1] || { titel: 'Tag ' + n, beschreibung: '' };
    return '<div class="lp-split-main" id="lp-tag-' + n + '">' +
      '<div class="lp-split-mhead">' +
        '<span class="lp-focus-day">Tag ' + n + ' · ' + meta.titel + '</span>' + lpDayStatusChip(lpDayState(s, n)) +
      '</div>' +
      '<p class="lp-focus-desc">' + meta.beschreibung + '</p>' +
      '<div class="lp-focus-body">' + lpDayBody(s, n, lernplanId) + '</div>' +
    '</div>';
  }

  /* Fokus-Tag der Split-Ansicht bei Lernplan-Wechsel zurücksetzen. */
  function lpSyncFocus(lernplanId) {
    if (lernplanId !== lpLastId) { lpLastId = lernplanId; lpFocusTag = null; }
  }
  /* Aktuell in der Split-Ansicht angezeigter Tag (1–7) — für externe
     Kopfleisten (klausur.html), damit sie den aktiven Step markieren können. */
  function lernplanFocusTag(lernplanId) {
    var s = Lesify.lernplanStatus(lernplanId);
    if (!s) return 1;
    lpSyncFocus(lernplanId);
    return lpResolvedFocus(s);
  }
  /* Voll ausgebautes Tag-Panel (lp-split-main) zur Einbettung auf anderen
     Seiten. Zusammen mit R.wireLernplan voll interaktiv (Haken, Tag-Wechsel). */
  function lernplanSplitMain(lernplanId) {
    var s = Lesify.lernplanStatus(lernplanId);
    if (!s) return '';
    lpSyncFocus(lernplanId);
    return lpSplitMain(s, lpResolvedFocus(s), lernplanId);
  }

  /* --- Split-Layout: Schritt-Navigation links (aside), aktiver Tag rechts. --- */
  function lpVariantSplit(s, lernplanId) {
    var n = lpResolvedFocus(s);
    var doneTotal = 0;
    for (var i = 1; i <= 7; i++) if (s['tag' + i].erledigt) doneTotal++;
    var navSteps = '';
    for (var m = 1; m <= 7; m++) {
      var st = lpDayState(s, m);
      navSteps += '<button type="button" class="lp-nav-step lp-nav-' + st + (m === n ? ' is-active' : '') + '" data-lp-focus="' + m + '">' +
        '<span class="lp-nav-num">' + (st === 'erledigt' ? Icons.check : m) + '</span>' +
        '<span class="lp-nav-txt"><span class="lp-nav-t">Tag ' + m + '</span><span class="lp-nav-d">' + LP_TAGE[m - 1].titel + '</span></span>' +
      '</button>';
    }
    var aside = '<aside class="lp-split-nav">' +
      '<div class="lp-split-meta">' +
        '<span class="lp-split-count">' + doneTotal + '<span> / 7 Tagen</span></span>' +
        '<div class="lp-split-bar"><span style="transform:scaleX(' + (doneTotal / 7).toFixed(3) + ')"></span></div>' +
      '</div>' +
      '<div class="lp-split-steps">' + navSteps + '</div>' +
    '</aside>';
    var main = lpSplitMain(s, n, lernplanId);
    // Fach-Farbvariablen auf die ganze Seite → die lp-fc--N-Regeln setzen daraus
    // die Akzente (Rahmen, aktive Navi, Fortschritt, Kopfband …).
    var fcVars = s.klausur ? fachColorVars(s.klausur.fachId) : '';
    return '<div class="lp-page ' + lpFcClass() + '"' + (fcVars ? ' style="' + fcVars + '"' : '') + '>' +
      lpHead(s) + '<div class="lp-split">' + aside + main + '</div>' +
    '</div>';
  }

  /* Vollständige Lernplan-Seite (lernplan.html) — festes Split-Layout,
     liest alles aus Lesify.lernplanStatus. */
  function lernplanSeite(lernplanId) {
    var s = Lesify.lernplanStatus(lernplanId);
    if (!s) return '<p class="text-sm text-muted">Dieser Lernplan wurde nicht gefunden.</p>';
    lpSyncFocus(lernplanId);
    return lpVariantSplit(s, lernplanId);
  }

  /* Kompakter Teaser/Status auf klausur.html / testklausur.html. */
  function lernplanTeaser(lernplanId) {
    var s = Lesify.lernplanStatus(lernplanId);
    if (!s) return '';
    var fertig = s.aktuellerTag === 'fertig';
    var meta = fertig ? null : LP_TAGE[s.aktuellerTag - 1];
    var k = s.klausur;
    var cd = (k && k.datum) ? apTageBis(k.datum) : null;
    var weak = s.tag1.schwacheThemen.length;
    var bits = [];
    if (s.tag1.erledigt) bits.push(weak ? (weak === 1 ? '1 Thema offen' : weak + ' Themen offen') : 'alle Themen stark');
    if (cd != null) bits.push(apCountdownText(cd));
    var title = fertig ? 'Lernplan abgeschlossen' : ('Lernplan · Tag ' + s.aktuellerTag + ' von 7');
    var sub = (fertig ? 'Alle 7 Tage durch.' : meta.titel) + (bits.length ? ' — ' + bits.join(' · ') : '');
    return '<a class="card ap-teaser is-hoverable" href="lernplan.html?id=' + lernplanId + '">' +
      '<span class="ap-teaser-ico" aria-hidden="true">' + Icons.calendar + '</span>' +
      '<span class="ap-teaser-body">' +
        '<span class="ap-teaser-title">' + title + '</span>' +
        '<span class="ap-teaser-sub">' + sub + '</span>' +
      '</span>' +
      '<span class="ap-teaser-go" aria-hidden="true">' + Icons.arrowRight + '</span>' +
    '</a>';
  }

  /* Titel + Kurzbeschreibung eines Lerntags (1–7) — für kompakte Lernplan-
     Ansichten außerhalb von lernplan.html (z. B. klausur.html). */
  function lernplanTagMeta(n) { return LP_TAGE[n - 1] || { titel: 'Tag ' + n, beschreibung: '' }; }

  /* Nächste konkrete Aufgabe des Lernplans — für Shortcut-/Teaser-Buttons auf
     klausur.html. Liefert {tag, titel, label, href, art} oder null (Plan fertig).
     art: 'chat' (vorbereiteter KI-Chat) | 'testklausur' (Tag 1/5) | 'plan'. */
  function lernplanNaechsteAufgabe(lernplanId) {
    var s = Lesify.lernplanStatus(lernplanId);
    if (!s || s.aktuellerTag === 'fertig') return null;
    var tag = s.aktuellerTag;
    var meta = LP_TAGE[tag - 1] || { titel: 'Tag ' + tag };
    if (tag === 1 || tag === 5) {
      var tk = tag === 1 ? s.testklausur1 : s.testklausur2;
      var href = tk ? ('testklausur.html?id=' + tk.id) : ('lernplan.html?id=' + lernplanId);
      var verb = !tk ? 'Testklausur 2 starten'
        : tk.status === 'analysiert' ? 'Auswertung ansehen'
        : tk.status === 'geloest' ? 'Analyse starten' : 'Testklausur öffnen';
      return { tag: tag, titel: meta.titel, label: verb, href: href, art: 'testklausur' };
    }
    var items = lpTagAufgaben(s, tag);
    var checks = (s['tag' + tag] && s['tag' + tag].checks) || {};
    var next = items.filter(function (it) { return checks[it.key] !== true; })[0] || items[0];
    if (!next) return { tag: tag, titel: meta.titel, label: 'Zum Lernplan', href: 'lernplan.html?id=' + lernplanId, art: 'plan' };
    return { tag: tag, titel: meta.titel, label: next.label, href: lpItemChatHref(s, tag, next), art: 'chat' };
  }

  /* Lernzettel-Dokument (read-only) für lernplan-lernzettel.html. */
  function lernzettelSeite(lernplanId) {
    var lp = Lesify.getLernplan(lernplanId);
    if (lp && typeof lp.then === 'function') {
      // api.js: getLernplan() ist async — sync aus dem Cache lesen (braucht
      // ein vorheriges `await Lesify.getLernplan(...)` auf der Seite).
      var s = Lesify.lernplanStatus(lernplanId);
      lp = s ? s.lernplan : null;
    }
    if (!lp) return '<p class="text-sm text-muted">Lernplan nicht gefunden.</p>';
    if (!lp.lernzettel) {
      return '<div class="empty-state"><div class="es-icon">' + Icons.book + '</div>' +
        '<h4>Noch kein Lernzettel</h4>' +
        '<p>Der entsteht automatisch ab Tag 3 deines Lernplans.</p>' +
        '<a class="btn btn-secondary" href="lernplan.html?id=' + lernplanId + '">Zum Lernplan</a></div>';
    }
    return '<div class="pdf-slot" data-pdf-path="/lernplaene/' + lernplanId + '/lernzettel/dokument"></div>';
  }

  function wireLernplan(root, lernplanId, onChange) {
    // `await` auf einem synchronen Rückgabewert (data.js) läuft einen
    // Mikrotask später einfach durch — bei Klick-/Change-Events unmerklich.
    // Unter api.js aktualisiert `Lesify.getLernplan()` dabei zusätzlich den
    // Cache, aus dem `lernplanStatus()` synchron liest (siehe api.js).
    async function refresh() {
      await Lesify.getLernplan(lernplanId);
      if (onChange) onChange();
    }

    // Tag 7: kleine PDF-Vorschau des Lernzettels + Download-Button.
    qsa('[data-lp-pdf]', root).forEach(function (slot) {
      pdfVorschau(slot, slot.getAttribute('data-lp-pdf')).catch(function () {});
    });
    qsa('[data-lp-lz-download]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        pdfDownload(btn.getAttribute('data-lp-lz-download'), btn.getAttribute('data-lp-lz-name'))
          .catch(function (err) { toast(Lesify.fehlerText(err)); });
      });
    });

    // Manuell „Tag abschließen" = alle Checklisten-Punkte des Tages setzen.
    qsa('[data-lp-done]', root).forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var n = parseInt(btn.getAttribute('data-lp-done'), 10);
        await Lesify.setLernplanTagChecks(lernplanId, n, true);
        toast(n === 7 ? 'Lernplan abgeschlossen.' : ('Tag ' + n + ' abgeschlossen.'));
        await refresh();
      });
    });
    // Einzelne Checklisten-Punkte abhaken. Sind danach alle gesetzt, gilt der Tag
    // als erledigt (lernplanStatus) — Abwählen öffnet ihn wieder.
    qsa('[data-lp-check]', root).forEach(function (cb) {
      cb.addEventListener('change', async function () {
        var n = parseInt(cb.getAttribute('data-lp-day'), 10);
        await Lesify.setLernplanCheck(lernplanId, n, cb.getAttribute('data-lp-check'), cb.checked);
        await Lesify.getLernplan(lernplanId);
        var st = Lesify.lernplanStatus(lernplanId);
        if (cb.checked && st && st['tag' + n] && st['tag' + n].erledigt) {
          toast(n === 7 ? 'Lernplan abgeschlossen.' : ('Tag ' + n + ' abgehakt — alles erledigt.'));
        }
        if (onChange) onChange();
      });
    });
    qsa('[data-lp-lernzettel]', root).forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var ids = btn.getAttribute('data-lp-lernzettel').split(',').filter(Boolean);
        var lpVorher = await Lesify.getLernplan(lernplanId);
        var vorher = lpVorher.lernzettel;
        await Lesify.aktualisiereLernzettel(lernplanId, ids);
        toast(vorher ? 'Zum Lernzettel hinzugefügt.' : 'Lernzettel gestartet.');
        await refresh();
      });
    });
    qsa('[data-lp-start-tk2]', root).forEach(function (btn) {
      btn.addEventListener('click', async function () {
        btn.disabled = true;
        btn.innerHTML = '<span class="skeleton" style="width:14px;height:14px;border-radius:50%;display:inline-block"></span> Wird erstellt…';
        try {
          var lp = await Lesify.starteTestklausur2(lernplanId);
          window.location.href = 'testklausur.html?id=' + lp.testklausur2Id;
        } catch (err) {
          btn.disabled = false;
          btn.textContent = 'Testklausur 2 starten';
          toast(Lesify.fehlerText ? Lesify.fehlerText(err) : 'Testklausur 2 konnte nicht gestartet werden.');
        }
      });
    });
    // Split-Ansicht: angezeigten Tag umschalten.
    qsa('[data-lp-focus]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        lpFocusTag = parseInt(btn.getAttribute('data-lp-focus'), 10);
        refresh();
      });
    });
  }

  function usageRingSvg(ratio, cls) {
    var r = 15.5, c = 2 * Math.PI * r;
    var offset = c * (1 - ratio);
    return '<svg viewBox="0 0 36 36" class="usage-ring ' + cls + '">' +
      '<circle cx="18" cy="18" r="' + r + '" class="usage-ring-track"/>' +
      '<circle cx="18" cy="18" r="' + r + '" class="usage-ring-value" stroke-dasharray="' + c + '" stroke-dashoffset="' + offset + '"/>' +
    '</svg>';
  }

  function usageRatioClass(ratio) {
    if (ratio >= 0.66) return 'is-rot';
    if (ratio >= 0.33) return 'is-gelb';
    return 'is-gruen';
  }

  function usageRatioOf(data) {
    return data.limit == null ? 0 : clampRatio(data.used / data.limit);
  }

  function usageWidget() {
    if (typeof Lesify === 'undefined') return '';
    var u = Lesify.usage();
    var overallRatio = Math.max(
      usageRatioOf(u.nachrichten), usageRatioOf(u.dateien),
      usageRatioOf(u.lernzettel), usageRatioOf(u.testklausuren)
    );
    return '<div class="usage-widget">' +
      '<button class="usage-trigger" type="button" aria-label="Nutzung anzeigen">' + usageRingSvg(overallRatio, usageRatioClass(overallRatio)) + '</button>' +
      '<div class="usage-popover">' +
        '<div class="usage-popover-title">Monatliche Nutzung · ' + (u.planName || '') + '</div>' +
        usageRow('Nachrichten', u.nachrichten) +
        usageRow('Content-Aufnahmen', u.dateien) +
        usageRow('Lernzettel', u.lernzettel) +
        usageRow('Klausurvorbereitungen', u.testklausuren) +
        '<div class="usage-reset">Setzt sich zurück am ' + formatDatum(u.resetDatum) + '</div>' +
      '</div>' +
    '</div>';
  }

  function usageRow(label, data) {
    var unlimited = data.limit == null;
    var ratio = usageRatioOf(data);
    var count = unlimited ? (data.used + ' / ∞') : (data.used + ' / ' + data.limit);
    return '<div class="usage-row">' +
      '<div class="usage-row-head"><span>' + label + '</span><span class="mono">' + count + '</span></div>' +
      '<div class="usage-bar"><div class="usage-bar-fill ' + (unlimited ? 'is-gruen' : usageRatioClass(ratio)) + '" style="transform:scaleX(' + ratio + ')"></div></div>' +
    '</div>';
  }
  function clampRatio(n) { return Math.max(0, Math.min(1, n)); }

  /* ---------------------------------------------------------
     Thema-Karte — ein globales Design für Themen- und Fach-Übersicht,
     ohne Mastery-%-Anzeige.
     --------------------------------------------------------- */

  function themaCard(t, opts) {
    opts = opts || {};
    // api.js liefert Chats/Lernzettel/Dateien-Zähler (+ wo berechnet:
    // Klausuren) bereits mit GET /themen bzw. /faecher/:id/themen
    // eingebettet — kein flacher Index wie im Prototyp.
    // `testklausuren` gibt es unter api.js nirgends embedded (kein flacher
    // Index möglich), bleibt 0.
    var c = ('anzahlChats' in t)
      ? { chats: t.anzahlChats, lernzettel: t.anzahlLernzettel, dateien: t.anzahlDateien,
          klausuren: t.anzahlKlausuren || 0, testklausuren: 0 }
      : Lesify.countsForThema(t.id);
    var keys = opts.countKeys || ['chats', 'lernzettel', 'dateien', 'klausuren'];
    var labels = { chats: 'Chats', lernzettel: 'Lernzettel', dateien: 'Dateien', klausuren: 'Klausuren' };
    var countsHtml = keys.map(function (k) { return '<span>' + c[k] + ' ' + labels[k] + '</span>'; }).join('');
    var topHtml = opts.showFachBadge === false ? '' : '<div class="thema-card-top">' + fachBadge(t.fachId) + '</div>';
    var filterAttr = opts.filter === false ? '' : ' data-filter="' + t.fachId + '"';
    return '<div class="card is-hoverable has-watermark thema-card" data-href="thema.html?id=' + t.id + '"' + filterAttr + ' tabindex="0" role="link" style="padding:22px;' + fachColorVars(t.fachId) + '">' +
      cardWatermark(t.fachId) +
      topHtml +
      '<h3 class="thema-card-title">' + t.name + '</h3>' +
      '<p class="thema-card-desc">' + t.beschreibung + '</p>' +
      '<div class="flex gap-3 text-xs text-muted thema-card-foot">' + countsHtml + '</div>' +
    '</div>';
  }

  var Render = {
    badge: badge, fachBadge: fachBadge, formatDatum: formatDatum, countdown: countdown,
    testklausurStatusChip: testklausurStatusChip, ampelDot: ampelDot, ampelChip: ampelChip, noteChip: noteChip,
    fileTypeLabel: fileTypeLabel, fileStatusChip: fileStatusChip, usageWidget: usageWidget,
    cardWatermark: cardWatermark, fachAvatar: fachAvatar, truncate: truncate, fachColorVars: fachColorVars, fachFilterChips: fachFilterChips,
    dateiCard: dateiCard, dateiRow: dateiRow, dateiSummarySnippet: dateiSummarySnippet,
    testNoteBox: testNoteBox, klausurNoteBox: klausurNoteBox, klausurCard: klausurCard, klausurListe: klausurListe,
    themaCard: themaCard, tierChip: tierChip,
    lernplanSeite: lernplanSeite, lernplanTeaser: lernplanTeaser, lernplanNaechsteAufgabe: lernplanNaechsteAufgabe,
    lernplanTagMeta: lernplanTagMeta, lernplanSplitMain: lernplanSplitMain, lernplanFocusTag: lernplanFocusTag,
    lernzettelSeite: lernzettelSeite, wireLernplan: wireLernplan
  };

  /* ---------------------------------------------------------
     Such-Ergebnis-Darstellung — gemeinsam für die Dropdown-
     Schnellsuche (dashboard.html) und die volle Ergebnisseite
     (suche.html). Design final auf „Kachel" gewählt (2026-09-14,
     vorher 5 Varianten per Dev-Switch) — beide Stellen rendern jetzt
     bewusst identisch (kein `card`/`divide-list`-Rahmen auf der vollen
     Seite mehr, damit sie nicht anders aussieht als die Dropdown-
     Schnellsuche). Der Such-Kern (searchAll) bleibt unberührt; hier
     wird nur gerendert. Fach-Einfärbung über --fach-color/-ink/-bg
     pro Zeile.
     --------------------------------------------------------- */

  // `GET /suche` (api.js) liefert Gruppen-Icon-Keys, die zu den Entity-Namen
  // passen (fach/thema/chat/lernzettel/datei/klausur/testklausur) statt zu
  // den tatsächlichen `Icons`-Schlüsseln — hier auf die echten SVGs gemappt.
  var SEARCH_ICON_MAP = {
    fach: 'layers', thema: 'target', chat: 'chat', lernzettel: 'book',
    datei: 'file', klausur: 'docCheck', testklausur: 'target'
  };
  function searchRow(item, groupIcon, compact) {
    var iconKey = SEARCH_ICON_MAP[groupIcon] || groupIcon;
    var vars = item.fachId ? fachColorVars(item.fachId) : '';
    return '<a class="search-row' + (compact ? ' is-compact' : '') + '" href="' + item.href + '"' +
        (vars ? ' style="' + vars + '"' : '') + '>' +
      '<span class="search-ico">' + (Icons[iconKey] || Icons.search) + '</span>' +
      '<span class="search-row-body">' +
        (item.fachName ? '<span class="search-row-fach">' + item.fachName + '</span>' : '') +
        '<span class="search-row-title">' + item.title + '</span>' +
        (item.sub ? '<span class="search-row-sub">' + item.sub + '</span>' : '') +
      '</span>' +
      '<span class="search-row-go" aria-hidden="true">' + Icons.arrowRight + '</span>' +
    '</a>';
  }

  // Volle Ergebnisseite (suche.html) — nach Typ gruppiert.
  function searchResultsHtml(groups) {
    var body = groups.map(function (g) {
      return '<section class="search-group">' +
        '<div class="section-head"><span class="section-title">' + g.label +
          '<span class="search-count">' + g.items.length + '</span></span></div>' +
        '<div class="search-group-list">' +
          g.items.map(function (it) { return searchRow(it, g.icon, false); }).join('') +
        '</div>' +
      '</section>';
    }).join('');
    return '<div class="search-scope">' + body + '</div>';
  }

  // Kompakte Dropdown-Schnellsuche (dashboard.html) — max. 6 Treffer + Fußzeile.
  function searchDropdownHtml(groups, q) {
    var html = '<div class="search-scope is-dropdown">';
    var shown = 0;
    groups.forEach(function (g) {
      if (shown >= 6) return;
      var slice = g.items.slice(0, 6 - shown);
      if (!slice.length) return;
      html += '<div class="search-dd-label">' + g.label + '</div>';
      slice.forEach(function (it) { shown++; html += searchRow(it, g.icon, true); });
    });
    html += '<a class="search-dd-footer" href="suche.html?q=' + encodeURIComponent(q) + '">' +
      'Alle Ergebnisse ansehen ' + Icons.arrowRight + '</a>';
    return html + '</div>';
  }

  /* ---------------------------------------------------------
     Usage popover — hover on desktop (CSS), tap-toggle on touch
     --------------------------------------------------------- */

  function initUsageWidget() {
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('.usage-trigger');
      if (!trigger) {
        qsa('.usage-widget.is-open').forEach(function (w) { w.classList.remove('is-open'); });
        return;
      }
      e.stopPropagation();
      var widget = trigger.closest('.usage-widget');
      var wasOpen = widget.classList.contains('is-open');
      qsa('.usage-widget.is-open').forEach(function (w) { w.classList.remove('is-open'); });
      if (!wasOpen) widget.classList.add('is-open');
    });
  }

  /* ---------------------------------------------------------
     Kompakte Menü-Sidebar — fest aktiv (Icon-Streifen, klappt bei
     Hover auf). CSS-Regeln in style.css unter html.nav-compact.
     --------------------------------------------------------- */

  function initNavCompact() {
    document.documentElement.classList.add('nav-compact');
  }

  /* ---------------------------------------------------------
     Hover-Zustand der Menü-Sidebar (nur relevant bei html.nav-compact)
     Steuert html.nav-hovered:
       · beim Laden gesetzt → Sidebar startet aufgeklappt
       · bleibt gesetzt, solange der Zeiger über der Sidebar ist
       · klappt erst ein, wenn der Zeiger nachweislich woanders ist
     Damit bleibt die Sidebar nach einem Nav-Klick offen (das echte
     :hover greift nach dem Seitenwechsel erst beim ersten Mausmove).
     --------------------------------------------------------- */

  function initNavHover() {
    var sb = document.querySelector('.sidebar');
    if (!sb) return;
    var doc = document.documentElement;
    function set(open) { doc.classList.toggle('nav-hovered', open); }

    sb.addEventListener('mouseenter', function () { set(true); });
    sb.addEventListener('mouseleave', function () { set(false); });

    set(true); // Standard: offen
    var settle = function (e) {
      if (sb.contains(e.target)) return;
      set(false);
      document.removeEventListener('mousemove', settle, true);
      document.removeEventListener('mouseover', settle, true);
    };
    document.addEventListener('mousemove', settle, true);
    document.addEventListener('mouseover', settle, true);
  }

  /* ---------------------------------------------------------
     Boot
     --------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    applyTheme();
    initNavCompact();
    renderChrome();
    renderElternBanner();
    initNavHover();
    renderPageWatermark();
    initCardLinks();
    initMobileNav();
    initActiveNav();
    initModals();
    initTabs();
    initFilters();
    initOptionCards();
    initUsageWidget();
  });

  /* =========================================================
     Markdown → HTML (KI-Antworten, Lernzettel). Escaped ZUERST, dann
     formatiert — Nutzer-/KI-Text kann so kein HTML einschleusen.
     Unterstützt: #-Überschriften, **fett**, *kursiv*, ~~durch~~, `code`,
     ``` Codeblöcke, Aufzählungen (Strich, Stern, Punkt), nummerierte Listen, > Zitate, --- Trenner,
     | Tabellen | und Zeilenumbrüche.
     ========================================================= */
  function mdEscape(t) {
    return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function mdInline(t) {
    var codes = [];
    t = mdEscape(t).replace(/`([^`\n]+)`/g, function (_, c) { codes.push(c); return '@@MDC' + (codes.length - 1) + '@@'; });
    t = t.replace(/\*\*(?=\S)([^\n]+?)(?<=\S)\*\*/g, '<strong>$1</strong>')
      .replace(/~~(?=\S)([^\n]+?)(?<=\S)~~/g, '<del>$1</del>')
      .replace(/(^|[^*\w])\*(?=[^\s*])([^*\n]+?)(?<=[^\s*])\*(?![*\w])/g, '$1<em>$2</em>');
    return t.replace(/@@MDC(\d+)@@/g, function (_, i) { return '<code>' + codes[+i] + '</code>'; });
  }
  function mdToHtml(text, opts) {
    var shift = opts && opts.headingShift != null ? opts.headingShift : 1; // Chat: # → h2; Lernzettel: 0
    var lines = String(text == null ? '' : text).replace(/\r\n?/g, '\n').split('\n');
    var out = [], i = 0, m;
    var isTableSep = function (l) { return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l); };
    var cells = function (l) { return l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(function (c) { return c.trim(); }); };
    var tableAt = function (k) { return lines[k].indexOf('|') !== -1 && k + 1 < lines.length && isTableSep(lines[k + 1]); };
    var isBlockStart = function (l) {
      return /^\s*(#{1,4}\s|>\s?|[-*•]\s+|\d+[.)]\s+|```|(-{3,}|\*{3,})\s*$)/.test(l);
    };
    while (i < lines.length) {
      var l = lines[i];
      if (!l.trim()) { i++; continue; }
      if (/^\s*```/.test(l)) {
        var buf = []; i++;
        while (i < lines.length && !/^\s*```/.test(lines[i])) buf.push(lines[i++]);
        i++;
        out.push('<pre><code>' + mdEscape(buf.join('\n')) + '</code></pre>');
      } else if ((m = /^(#{1,4})\s+(.*)$/.exec(l))) {
        var lvl = Math.min(m[1].length + shift, 4);
        out.push('<h' + lvl + '>' + mdInline(m[2]) + '</h' + lvl + '>'); i++;
      } else if (/^\s*(-{3,}|\*{3,})\s*$/.test(l)) {
        out.push('<hr>'); i++;
      } else if (tableAt(i)) {
        var head = cells(l); i += 2;
        var rows = [];
        while (i < lines.length && lines[i].trim() && lines[i].indexOf('|') !== -1) rows.push(cells(lines[i++]));
        out.push('<div class="md-table-wrap"><table><thead><tr>' + head.map(function (c) { return '<th>' + mdInline(c) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          rows.map(function (r) { return '<tr>' + head.map(function (_, k) { return '<td>' + mdInline(r[k] || '') + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>');
      } else if (/^\s*>\s?/.test(l)) {
        var q = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) q.push(lines[i++].replace(/^\s*>\s?/, ''));
        out.push('<blockquote>' + mdInline(q.join('\n')).replace(/\n/g, '<br>') + '</blockquote>');
      } else if (/^\s*[-*•]\s+/.test(l)) {
        var ul = [];
        while (i < lines.length && /^\s*[-*•]\s+/.test(lines[i])) {
          var item = lines[i++].replace(/^\s*[-*•]\s+/, ''), task = /^\[([ xX])\]\s+/.exec(item);
          if (task) item = item.slice(task[0].length);
          ul.push('<li' + (task ? ' class="md-task"' : '') + '>' + (task ? (task[1] === ' ' ? '☐ ' : '☑ ') : '') + mdInline(item) + '</li>');
        }
        out.push('<ul>' + ul.join('') + '</ul>');
      } else if (/^\s*\d+[.)]\s+/.test(l)) {
        var ol = [], start = parseInt(l, 10);
        while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) ol.push('<li>' + mdInline(lines[i++].replace(/^\s*\d+[.)]\s+/, '')) + '</li>');
        out.push('<ol' + (start > 1 ? ' start="' + start + '"' : '') + '>' + ol.join('') + '</ol>');
      } else {
        var para = [l]; i++;
        while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i]) && !tableAt(i)) para.push(lines[i++]);
        out.push('<p>' + mdInline(para.join('\n')).replace(/\n/g, '<br>') + '</p>');
      }
    }
    return out.join('');
  }

  /* PDF-Vorschau/-Download (Lernzettel, Testklausur): das PDF liegt hinter
     dem Auth-Header, darum per fetch → Blob → Object-URL. */
  // PDF.js (cdnjs) rendert die Seiten auf Canvas: läuft überall gleich — auch dort,
  // wo ein <iframe> mit PDF leer bleibt (In-App-Browser, iOS: nur Seite 1).
  var PDFJS_VER = '3.11.174';
  var pdfjsPromise = null;
  function ladePdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (pdfjsPromise) return pdfjsPromise;
    pdfjsPromise = new Promise(function (resolve, reject) {
      var sc = document.createElement('script');
      sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + PDFJS_VER + '/pdf.min.js';
      sc.onload = function () {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/' + PDFJS_VER + '/pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      sc.onerror = function () { pdfjsPromise = null; reject(new Error('PDF.js nicht ladbar')); };
      document.head.appendChild(sc);
    });
    return pdfjsPromise;
  }

  function pdfVorschau(el, pfad) {
    el.innerHTML = '<div class="pdf-loading">PDF wird erstellt …</div>';
    return Lesify.pdfBlob(pfad).then(function (blob) {
      return ladePdfJs().then(function (lib) {
        return blob.arrayBuffer().then(function (buf) { return lib.getDocument({ data: buf }).promise; });
      }).then(function (pdf) {
        var pages = document.createElement('div');
        pages.className = 'pdf-pages';
        el.innerHTML = '';
        el.appendChild(pages);
        var token = (el._pdfToken = (el._pdfToken || 0) + 1);
        function zeichne() {
          var my = ++token; el._pdfToken = my;
          var breite = Math.max(240, pages.clientWidth - 32);
          var dpr = window.devicePixelRatio || 1;
          var jobs = [];
          for (var i = 1; i <= pdf.numPages; i++) jobs.push(i);
          jobs.reduce(function (kette, n) {
            return kette.then(function () {
              if (el._pdfToken !== my) return null;
              return pdf.getPage(n).then(function (page) {
                var vp0 = page.getViewport({ scale: 1 });
                var scale = breite / vp0.width;
                var vp = page.getViewport({ scale: scale * dpr });
                var canvas = document.createElement('canvas');
                canvas.className = 'pdf-page';
                canvas.width = Math.floor(vp.width); canvas.height = Math.floor(vp.height);
                canvas.style.width = Math.floor(breite) + 'px';
                canvas.style.height = Math.floor(vp0.height * scale) + 'px';
                return page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise.then(function () {
                  if (el._pdfToken !== my) return;
                  if (n === 1) pages.innerHTML = '';
                  pages.appendChild(canvas);
                });
              });
            });
          }, Promise.resolve());
        }
        zeichne();
        if (!el._pdfResize) {
          var last = pages.clientWidth, t;
          el._pdfResize = true;
          window.addEventListener('resize', function () {
            clearTimeout(t);
            t = setTimeout(function () {
              var pg = el.querySelector('.pdf-pages');
              if (pg && Math.abs(pg.clientWidth - last) > 8) { last = pg.clientWidth; pg.innerHTML = ''; zeichne(); }
            }, 250);
          });
        }
      }).catch(function () {
        // Fallback: eingebetteter Browser-PDF-Viewer
        if (el._pdfUrl) URL.revokeObjectURL(el._pdfUrl);
        el._pdfUrl = URL.createObjectURL(blob);
        el.innerHTML = '<iframe class="pdf-frame" title="PDF-Vorschau" src="' + el._pdfUrl + '"></iframe>';
      });
    }).catch(function (err) {
      el.innerHTML = '<div class="pdf-loading">Die Vorschau konnte nicht geladen werden. Über „Als PDF herunterladen" bekommst du das Dokument trotzdem.</div>';
      throw err;
    });
  }
  function pdfDownload(pfad, dateiname) {
    return Lesify.pdfBlob(pfad + (pfad.indexOf('?') < 0 ? '?' : '&') + 'download=1').then(function (blob) {
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url; a.download = dateiname + '.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    });
  }

  window.LesifyUI = { fachColorVars: fachColorVars, pdfVorschau: pdfVorschau, pdfDownload: pdfDownload, mdToHtml: mdToHtml, mdEscape: mdEscape, toast: toast, openModal: openModal, closeModal: closeModal, Icons: Icons, Render: Render, searchResultsHtml: searchResultsHtml, searchDropdownHtml: searchDropdownHtml, qs: qs, qsa: qsa, openFachColorPicker: openFachColorPicker, openDateiModal: openDateiModal, setPageWatermark: setPageWatermark };
})();
