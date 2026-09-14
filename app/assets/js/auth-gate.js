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
  var SCHUELER_START = 'dashboard.html';

  function raus() {
    var ziel = encodeURIComponent(location.pathname.split('/').pop() || '');
    location.replace(LOGIN + (ziel ? '?weiter=' + ziel : ''));
  }

  if (!window.Lesify.istAngemeldet()) {
    raus();
    return;
  }

  // Rollen-/Familie-Weiche: Ein Elternkonto MIT Familien-Abo (Kind-Profile
  // vorhanden) gehört in den Eltern-Bereich; ein Solo-Elternkonto
  // (rolle=elternteil, art=einzel) verhält sich wie ein Schüler-Account.
  // Ein Schüler-Account hat auf keiner `eltern-*.html`-Seite etwas verloren.
  function weiche(user) {
    var hier = (location.pathname.split('/').pop() || '').toLowerCase();
    var aufElternSeite = hier === ELTERN_SEITE || hier.indexOf('eltern-') === 0;
    if (user && user.rolle === 'elternteil') {
      window.Lesify.kinder().then(function (kinder) {
        var familienAbo = Array.isArray(kinder) && kinder.length > 0;
        if (familienAbo && !aufElternSeite) location.replace(ELTERN_SEITE);
        if (!familienAbo && aufElternSeite) location.replace(SCHUELER_START);
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
