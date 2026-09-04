/* =========================================================
   Lesify — Marketing / Website
   Vanilla JS, kein Build. Baut Navigation + Footer, steuert
   Scroll-Reveals, Mobile-Menü, Preis-Umschalter und die
   Demo-Formulare (kein Backend — siehe Konzept-texts/backend-planning.md §5).
   ========================================================= */
(function () {
  'use strict';

  var ICON = {
    mark: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c1 3.5.4 9.4-2.6 12.2C7.1 16.5 4.6 15.6 3.5 12.7c2.9 5 8.3 3.9 9.4-1.2C13.6 7.9 13 4 12 2Z"/><path d="M20.5 8c1 3.5.4 9.4-2.6 12.2-2.3 2.3-4.8 1.4-5.9-1.5 2.9 5 8.3 3.9 9.4-1.2C22 13.9 21.5 10 20.5 8Z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
  };

  var NAV_LINKS = [
    { href: 'funktionen.html', label: 'Funktionen', page: 'funktionen' },
    { href: 'vergleich.html', label: 'Vergleich', page: 'vergleich' },
    { href: 'preise.html', label: 'Preise', page: 'preise' },
    { href: 'faq.html', label: 'FAQ', page: 'faq' }
  ];

  var FOOTER = [
    { title: 'Produkt', links: [
      { href: 'funktionen.html', label: 'Funktionen' },
      { href: 'preise.html', label: 'Preise' },
      { href: 'vergleich.html', label: 'Vergleich zur Nachhilfe' },
      { href: 'faq.html', label: 'Häufige Fragen' }
    ]},
    { title: 'Unternehmen', links: [
      { href: 'ueber-uns.html', label: 'Über uns' },
      { href: 'kontakt.html', label: 'Kontakt' },
      { href: 'login.html', label: 'Anmelden' }
    ]},
    { title: 'Rechtliches', links: [
      { href: 'impressum.html', label: 'Impressum' },
      { href: 'datenschutz.html', label: 'Datenschutz' },
      { href: 'agb.html', label: 'AGB' }
    ]}
  ];

  var current = document.body.getAttribute('data-page') || '';
  var navMode = document.body.getAttribute('data-nav') || 'full';

  /* ---------- Navigation ---------- */
  function buildNav() {
    var host = document.getElementById('mkt-nav');
    if (!host) return;

    var brand =
      '<a class="brand" href="index.html" aria-label="Lesify — Startseite">' +
        '<span class="brand__mark">' + ICON.mark + '</span>' +
        '<span class="brand__word">Lesify</span>' +
      '</a>';

    if (navMode === 'minimal') {
      host.className = 'mkt-nav mkt-nav--minimal';
      host.innerHTML =
        '<div class="mkt-nav__inner">' + brand +
          '<a class="mkt-nav__back" href="index.html">' + ICON.back + ' Zur Website</a>' +
        '</div>';
      return;
    }

    host.className = 'mkt-nav';
    var links = NAV_LINKS.map(function (l) {
      return '<a href="' + l.href + '"' + (l.page === current ? ' class="is-active"' : '') + '>' + l.label + '</a>';
    }).join('');

    host.innerHTML =
      '<div class="mkt-nav__inner">' +
        brand +
        '<nav class="mkt-nav__links">' + links + '</nav>' +
        '<div class="mkt-nav__actions">' +
          '<a class="btn btn-ghost" href="login.html">Anmelden</a>' +
          '<a class="btn btn-primary" href="registrieren.html">Kostenlos starten</a>' +
          '<button class="nav-toggle" type="button" aria-label="Menü öffnen" aria-expanded="false">' + ICON.menu + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="mkt-nav__sheet" id="nav-sheet">' +
        NAV_LINKS.map(function (l) { return '<a href="' + l.href + '">' + l.label + '</a>'; }).join('') +
        '<div class="sheet-actions">' +
          '<a class="btn btn-secondary btn-block" href="login.html">Anmelden</a>' +
          '<a class="btn btn-primary btn-block" href="registrieren.html">Kostenlos starten</a>' +
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

    var onScroll = function () { host.classList.toggle('is-scrolled', window.scrollY > 12); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
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
            '<a class="brand" href="index.html">' +
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

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
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

  /* ---------- Smooth-Scroll für #anker ---------- */
  function initAnchors() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    buildNav();
    buildFooter();
    autoStagger();
    initReveal();
    initPricing();
    initCounters();
    initForms();
    initAnchors();
  });
})();
