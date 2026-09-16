/* =========================================================
   Lesify — Auth-Gate (Phase 11)
   ---------------------------------------------------------
   In jede eingeloggte Seite VOR `app.js` einbinden, sobald sie auf
   `api.js` statt `data.js` läuft. Ohne gültige Session → Redirect auf
   die Marketing-Login-Seite. Prüft die Session einmal serverseitig
   (`GET /auth/me`), damit ein abgelaufenes Token nicht „eingeloggt"
   aussieht.
   ========================================================= */
(function () {
  'use strict';
  if (!window.Lesify || !window.Lesify.me) return; // data.js-Modus: nichts tun

  var LOGIN = '/login/';
  var ELTERN_SEITE = 'eltern.html';
  var ELTERN_KINDER_SEITE = 'eltern-kinder.html';
  var SCHUELER_START = 'dashboard.html';

  function raus() {
    var ziel = encodeURIComponent(location.pathname.split('/').pop() || '');
    location.replace(LOGIN + (ziel ? '?weiter=' + ziel : ''));
  }

  if (!window.Lesify.istAngemeldet()) {
    raus();
    return;
  }

  // Rollen-Weiche: JEDES Elternkonto (rolle=elternteil) gehört in den
  // Eltern-Bereich — auch bei nur 1 Sitz (Einzelplatz). Seit 2026-09-16
  // (siehe UMSETZUNGSPLAN.md „Eltern-only Signup") legt die öffentliche
  // Registrierung nur noch Elternkonten an; das Konto selbst ist NIE der
  // Lernaccount, Kind-Profile entstehen immer separat danach. Ohne
  // Kind-Profil → eltern-kinder.html (erstes Kind anlegen), mit welchen →
  // eltern.html (Übersicht). Ein Schüler-Account (rolle=schueler, z. B. ein
  // per Einladung eingeloggtes Kind) hat auf keiner `eltern-*.html`-Seite
  // etwas verloren.
  function weiche(user) {
    var hier = (location.pathname.split('/').pop() || '').toLowerCase();
    var aufElternSeite = hier === ELTERN_SEITE || hier.indexOf('eltern-') === 0;
    if (user && user.rolle === 'elternteil') {
      if (aufElternSeite) return;
      window.Lesify.kinder().then(function (kinder) {
        var hatKinder = Array.isArray(kinder) && kinder.length > 0;
        location.replace(hatKinder ? ELTERN_SEITE : ELTERN_KINDER_SEITE);
      }).catch(function () {});
    } else if (aufElternSeite) {
      location.replace(SCHUELER_START);
    }
  }

  window.Lesify.me().then(function (r) {
    weiche(r && r.user);
  }).catch(function (err) {
    // Nur bei einer wirklich ungültigen Session (401/`nicht_angemeldet`)
    // ausloggen. Alles andere — Netzwerkfehler, 429 (Rate-Limit), 5xx — ist
    // kein Auth-Problem; sonst fliegt man bei jedem Hoppel auf dem Weg
    // zwischen zwei Seiten aus einer noch gültigen Session raus.
    if (err && err.status === 401) raus();
  });
})();
