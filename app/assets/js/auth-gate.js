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

  /* ---------- Abo-Zustand (2026-09-23, api/src/lib/aboZugriff.ts) ----------
     Kind-Profile: `gesperrt` (Abo pausiert/abgelaufen) → Sperrbildschirm,
     `eingeschraenkt` (Zahlung offen) → Banner + einmal pro Sitzung ein Popup.
     Elternkonten werden nie gesperrt, sehen aber im Eltern-Bereich ein Banner. */
  function datum(iso) {
    try { return new Date(iso).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' }); }
    catch (e) { return ''; }
  }
  function bannerEinfuegen(html, gelb) {
    function rein() {
      var main = document.querySelector('.main-inner');
      if (!main) return false;
      if (main.querySelector('.abo-hinweis')) return true;
      var el = document.createElement('div');
      el.className = 'abo-hinweis' + (gelb ? ' abo-hinweis--gelb' : '');
      el.setAttribute('role', 'status');
      el.innerHTML = '<div>' + html + '</div>';
      main.insertBefore(el, main.firstChild);
      return true;
    }
    // Seiten rendern ihren Inhalt asynchron neu (innerHTML) — Banner danach
    // wieder einsetzen, solange die Seite offen ist.
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', rein); else rein();
    var main = document.querySelector('.main-inner');
    if (main && window.MutationObserver) new MutationObserver(rein).observe(main, { childList: true });
  }
  function sperrbildschirm(grund) {
    var titel = grund === 'pausiert' ? 'Lesify macht gerade Pause' : 'Dein Lesify-Zugang ist abgelaufen';
    var text = grund === 'pausiert'
      ? 'Deine Eltern haben das Abo pausiert. Sobald es wieder läuft, kannst du direkt weitermachen — alle deine Fächer, Chats und Lernzettel bleiben gespeichert.'
      : 'Das Abo deiner Familie ist beendet. Sprich mit deinen Eltern, wenn du weiterlernen möchtest — deine Inhalte bleiben vorerst gespeichert.';
    function zeigen() {
      var el = document.createElement('div');
      el.className = 'abo-sperre';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-labelledby', 'abo-sperre-titel');
      el.innerHTML = '<div class="abo-sperre__karte"><h1 id="abo-sperre-titel">' + titel + '</h1><p>' + text + '</p>' +
        '<button type="button" class="btn btn-primary">Abmelden</button></div>';
      document.body.appendChild(el);
      document.body.style.overflow = 'hidden';
      el.querySelector('button').addEventListener('click', function () {
        window.Lesify.logout().then(function () { location.replace(LOGIN); });
      });
      el.querySelector('button').focus();
    }
    if (document.body) zeigen(); else document.addEventListener('DOMContentLoaded', zeigen);
  }
  function zahlungOffenPopup(loeschungAm) {
    var KEY = 'lesify:zahlung-offen-gesehen';
    try { if (sessionStorage.getItem(KEY)) return; sessionStorage.setItem(KEY, '1'); } catch (e) {}
    function zeigen() {
      var scrim = document.createElement('div');
      scrim.className = 'modal-scrim';
      scrim.innerHTML = '<div class="modal" style="max-width:420px"><div class="modal-head"><div>' +
        '<h3 class="modal-title">Beim Abo ist eine Zahlung offen</h3></div></div>' +
        '<div class="modal-body"><p class="text-sm" style="margin:0;color:var(--ink-700);line-height:1.6">' +
        'Du kannst dir alles weiter ansehen, aber gerade nichts Neues anlegen — also keine Chats, Lernzettel, Testklausuren oder Uploads. ' +
        'Sag bitte deinen Eltern Bescheid.' + (loeschungAm ? ' Wird die Zahlung bis zum ' + datum(loeschungAm) + ' nicht erledigt, werden deine Inhalte gelöscht.' : '') +
        '</p></div><div class="modal-foot"><button class="btn btn-primary" type="button">Verstanden</button></div></div>';
      document.body.appendChild(scrim);
      requestAnimationFrame(function () { scrim.classList.add('is-open'); });
      scrim.querySelector('button').addEventListener('click', function () {
        scrim.classList.remove('is-open'); setTimeout(function () { scrim.remove(); }, 200);
      });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', zeigen); else zeigen();
  }
  function kindZustand(z) {
    if (!z || z.zugriff === 'voll') return;
    if (z.zugriff === 'gesperrt') return sperrbildschirm(z.grund);
    bannerEinfuegen('<b>Zahlung offen — nur Ansehen möglich</b>Neue Chats, Lernzettel, Testklausuren und Uploads sind gesperrt, bis deine Eltern die Zahlung erledigt haben.' +
      (z.loeschungAm ? ' Sonst werden deine Inhalte am ' + datum(z.loeschungAm) + ' gelöscht.' : ''));
    zahlungOffenPopup(z.loeschungAm);
  }
  function elternZustand() {
    var hier = (location.pathname.split('/').pop() || '').toLowerCase();
    if (hier === 'eltern-abo.html' || !window.Lesify.getAbo) return; // dort steht es ausführlich
    window.Lesify.getAbo().then(function (abo) {
      var abgelaufen = abo.status === 'gekuendigt' && new Date(abo.aktuellerZeitraumEnde) <= new Date();
      if (abo.status === 'zahlung_offen') {
        bannerEinfuegen('<b>Zahlung fehlgeschlagen</b>Deine Kinder können gerade nur ansehen, nichts Neues anlegen.' +
          (abo.loeschungAm ? ' Ohne Zahlung bis zum ' + datum(abo.loeschungAm) + ' werden die Kind-Profile samt Inhalten gelöscht.' : '') +
          ' <a href="eltern-abo.html">Zahlungsmethode aktualisieren</a>');
      } else if (abo.status === 'pausiert') {
        bannerEinfuegen('<b>Sommerpause aktiv</b>Deine Kinder haben gerade keinen Zugriff auf die App. <a href="eltern-abo.html">Abo reaktivieren</a>', true);
      } else if (abgelaufen) {
        bannerEinfuegen('<b>Abo beendet</b>Deine Kinder haben keinen Zugriff mehr auf die App. <a href="/preise/">Neu abschließen</a>');
      }
    }).catch(function () {});
  }

  window.Lesify.me().then(function (r) {
    weiche(r && r.user);
    if (r && r.user && r.user.rolle === 'elternteil') elternZustand();
    else kindZustand(r && r.zugriff);
  }).catch(function (err) {
    // Nur bei einer wirklich ungültigen Session (401/`nicht_angemeldet`)
    // ausloggen. Alles andere — Netzwerkfehler, 429 (Rate-Limit), 5xx — ist
    // kein Auth-Problem; sonst fliegt man bei jedem Hoppel auf dem Weg
    // zwischen zwei Seiten aus einer noch gültigen Session raus.
    if (err && err.status === 401) raus();
  });
})();
