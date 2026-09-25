/* =========================================================
   Lesify — Fehler-Tracking im Browser (Sentry, EU-Region)
   ---------------------------------------------------------
   Eine Datei für Website UND App: die App-Seiten laden sie über api.js
   (`/assets/js/fehler-tracking.js`, gleiche Domain lesify.de), die Kasse
   über checkout/index.html. Ohne DSN passiert gar nichts.

   DSN eintragen: Sentry → Projekt „lesify-web" → Settings → Client Keys
   (DSN). Der Browser-DSN ist öffentlich (steht ohnehin im Quelltext) —
   kein Geheimnis, anders als Server-Keys.

   Datenschutz: keine Eingaben, keine Texte, keine Header/Cookies — nur
   Fehlertyp, Stacktrace, Seite. IP-Speicherung in Sentry abschalten
   (Project Settings → Security & Privacy → „Prevent Storing of IP Addresses").
   ========================================================= */
(function () {
  'use strict';
  var DSN = 'https://f5ed64ea587e0393c17a91181e0115b5@o4512146262196224.ingest.de.sentry.io/4512146288934992'; // Projekt lesify-web (EU)
  if (!DSN || window.__lesifySentry) return;
  window.__lesifySentry = true;
  if (!/(^|\.)lesify\.de$/.test(location.hostname)) return; // lokal nie senden

  var s = document.createElement('script');
  s.src = 'https://browser.sentry-cdn.com/11.0.0/bundle.min.js';
  s.integrity = 'sha384-cTwnmuJw67fRv/Ws36NuepJXTeiXQoGMQhNG7I4FFULN+r3iQuVQewCbuMzb/3Us';
  s.crossOrigin = 'anonymous';
  s.onload = function () {
    if (!window.Sentry) return;
    window.Sentry.init({
      dsn: DSN,
      environment: 'production',
      tracesSampleRate: 0,
      // Nur Navigation + Netzwerk-Breadcrumbs, ohne Query-Parameter —
      // keine Klick-Texte, keine Tastatureingaben, keine Konsolenausgaben.
      beforeBreadcrumb: function (b) {
        if (b.category !== 'navigation' && b.category !== 'fetch' && b.category !== 'xhr') return null;
        if (b.data && typeof b.data.url === 'string') b.data.url = b.data.url.split('?')[0];
        if (b.data && typeof b.data.to === 'string') b.data.to = b.data.to.split('?')[0];
        if (b.data && typeof b.data.from === 'string') b.data.from = b.data.from.split('?')[0];
        return b;
      },
      beforeSend: function (event) {
        if (event.request) {
          delete event.request.headers;
          delete event.request.cookies;
          if (event.request.url) event.request.url = event.request.url.split('?')[0];
        }
        delete event.user;
        return event;
      }
    });
  };
  document.head.appendChild(s);
})();
