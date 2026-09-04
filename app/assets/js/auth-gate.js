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

  var LOGIN = '../marketing/login.html';

  function raus() {
    var ziel = encodeURIComponent(location.pathname.split('/').pop() || '');
    location.replace(LOGIN + (ziel ? '?weiter=' + ziel : ''));
  }

  if (!window.Lesify.istAngemeldet()) {
    raus();
    return;
  }
  window.Lesify.me().catch(function () {
    raus();
  });
})();
