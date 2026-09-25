/* =========================================================
   Lesify — checkout-erfolg/
   Nach Redirect-Zahlungsarten (PayPal, …) ist das die erste Stelle, an der
   geprüft werden kann, ob das Zahlungsmittel schon eine Testphase hatte
   (Entscheidung 2026-09-23: Testphase einmal je Zahlungsmittel). Für Karten
   hat die Kasse das schon vorher erledigt — der Aufruf ist idempotent.
   Zusätzlich: Text anpassen, wenn das Abo ohne Testphase abgeschlossen wurde.
   ========================================================= */
(function () {
  'use strict';

  var PROD_API_BASE = 'https://lesify-production.up.railway.app';
  var istProdHost = /(^|\.)lesify\.de$|\.(pages|workers)\.dev$/.test(location.hostname); // *.pages.dev/*.workers.dev = Cloudflare-Testdomain
  var API_BASE = (
    window.LESIFY_API_BASE || (istProdHost ? PROD_API_BASE : 'http://localhost:3000')
  ).replace(/\/$/, '');
  var token = '';
  try { token = localStorage.getItem('lesify:token') || ''; } catch (e) {}
  if (!token) return;
  var auth = { Authorization: 'Bearer ' + token };
  var $ = function (id) { return document.getElementById(id); };

  // Auswahl (plan/interval/tier/seats) ohne Stripes Redirect-Parameter.
  function kasseOhneTestphase() {
    var p = new URLSearchParams(location.search);
    ['setup_intent', 'setup_intent_client_secret', 'payment_intent', 'payment_intent_client_secret', 'redirect_status']
      .forEach(function (k) { p.delete(k); });
    p.set('ohne_testphase', '1');
    return '/checkout/?' + p.toString();
  }

  fetch(API_BASE + '/abo/testphase-pruefen', { method: 'POST', headers: auth })
    .then(function (r) {
      if (r.status === 409) {
        $('erfolg-titel').textContent = 'Testphase nicht möglich';
        $('erfolg-text').textContent = 'Mit diesem Zahlungsmittel wurde bereits eine kostenlose Testphase genutzt — eine zweite ist nicht möglich. Es wurde nichts abgebucht und kein Abo abgeschlossen.';
        $('erfolg-aktionen').innerHTML =
          '<a class="btn btn-primary btn-block btn-lg" href="' + kasseOhneTestphase() + '">Ohne Testphase abschließen</a>' +
          '<a class="btn btn-secondary btn-block" href="/">Zur Startseite</a>';
        var icon = document.querySelector('.co-erfolg-icon');
        if (icon) icon.style.display = 'none';
        return;
      }
      return fetch(API_BASE + '/abo', { headers: auth })
        .then(function (res) { return res.ok ? res.json() : null; })
        .then(function (abo) {
          if (abo && !abo.trialEndetAm) {
            $('erfolg-text').textContent = 'Dein Abo läuft ab sofort. Kündigen kannst du in den Kontoeinstellungen: monatliche Pakete monatlich, jährliche Pakete jährlich.';
          }
        });
    })
    .catch(function () { /* Netzwerkfehler: Erfolgsseite bleibt wie sie ist, Webhook prüft nach */ });
})();
