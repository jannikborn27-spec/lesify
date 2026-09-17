/* =========================================================
   Lesify — Auth-/Kontakt-Formulare (Phase 11 Cut-over)
   ---------------------------------------------------------
   Verdrahtet die Marketing-Formulare/-Seiten an die echte API:
   login/, registrieren/, passwort-vergessen/, passwort-zuruecksetzen/,
   email-bestaetigen/, kontakt/ (siehe UMSETZUNGSPLAN.md Phase 11
   "Marketing-Formulare verdrahten" + Phase 10 "E-Mail-Versand").
   Eigenständig statt `assets/js/api.js` zu laden
   (gleicher Ansatz wie `checkout.js`) — die Marketing-Seite bleibt
   ein unabhängiger statischer Prototyp.

   Konfiguration: `window.LESIFY_API_BASE` (Default: auf lesify.de/www.lesify.de
   die produktive Railway-API, sonst http://localhost:3000 für lokale Dev-Server).
   Session-Token liegt in `localStorage['lesify:token']` (gleicher
   Schlüssel wie `app/assets/js/api.js`, damit ein Login hier direkt
   in der App gilt).
   ========================================================= */
(function () {
  'use strict';

  var PROD_API_BASE = 'https://lesify-production.up.railway.app';
  var istProdHost = /(^|\.)lesify\.de$/.test(location.hostname);
  var API_BASE = (
    window.LESIFY_API_BASE || (istProdHost ? PROD_API_BASE : 'http://localhost:3000')
  ).replace(/\/$/, '');
  var TOKEN_KEY = 'lesify:token';

  function getToken() {
    try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
  }
  function setToken(t) {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) { /* privater Modus */ }
  }

  var FEHLER_TEXT = {
    email_vergeben: 'Für diese E-Mail-Adresse besteht bereits ein Konto.',
    anmeldedaten_falsch: 'E-Mail oder Passwort ist falsch.',
    validierung: 'Bitte alle Felder korrekt ausfüllen.',
    token_ungueltig: 'Dieser Link ist ungültig oder abgelaufen. Bitte einen neuen anfordern.',
    rate_limit: 'Zu viele Versuche — bitte kurz warten und erneut probieren.',
  };
  function fehlerText(code) {
    return FEHLER_TEXT[code] || 'Es ist ein Fehler aufgetreten. Bitte später erneut versuchen.';
  }

  function call(method, pfad, body, token) {
    var headers = { Accept: 'application/json', 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    return fetch(API_BASE + pfad, { method: method, headers: headers, body: JSON.stringify(body) }).then(
      function (res) {
        return res.text().then(function (txt) {
          var data = null;
          try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = null; }
          if (!res.ok) {
            var code = (data && data.fehler) || (res.status === 429 ? 'rate_limit' : 'serverfehler');
            var err = new Error(code);
            err.code = code;
            throw err;
          }
          return data;
        });
      },
      function () {
        var err = new Error('netzwerkfehler');
        err.code = 'netzwerkfehler';
        throw err;
      },
    );
  }
  var post = function (pfad, body, token) { return call('POST', pfad, body, token); };
  var get = function (pfad, token) {
    return fetch(API_BASE + pfad, { headers: { Accept: 'application/json', Authorization: 'Bearer ' + token } }).then(
      function (res) { return res.ok ? res.json() : Promise.reject(new Error('fehlgeschlagen')); },
    );
  };

  function showMsg(el, text, kind) {
    if (!el) return;
    el.textContent = text;
    el.className = 'co-message is-visible' + (kind ? ' co-message--' + kind : '');
  }

  function setBusy(btn, busy, busyLabel) {
    if (!btn) return;
    if (busy) {
      btn.dataset.idleLabel = btn.dataset.idleLabel || btn.textContent;
      btn.textContent = busyLabel || 'Einen Moment …';
      btn.disabled = true;
    } else {
      if (btn.dataset.idleLabel) btn.textContent = btn.dataset.idleLabel;
      btn.disabled = false;
    }
  }

  function ensureMsgEl(form) {
    var el = form.querySelector('.co-message');
    if (el) return el;
    el = document.createElement('p');
    el.className = 'co-message';
    el.setAttribute('role', 'status');
    form.insertBefore(el, form.querySelector('button[type="submit"]'));
    return el;
  }

  /** Rollen-/Familien-Weiche wie `app/assets/js/auth-gate.js` — plus `?weiter=`. */
  function zielNachLogin(user, token) {
    var weiter = new URLSearchParams(location.search).get('weiter');
    if (weiter && /^[a-z0-9_-]+\.html$/i.test(weiter)) return Promise.resolve('/app/' + weiter);
    if (user && user.rolle === 'elternteil') {
      return get('/abo/kinder', token)
        .then(function (kinder) {
          return Array.isArray(kinder) && kinder.length > 0 ? '/app/eltern.html' : '/app/eltern-kinder.html';
        })
        .catch(function () { return '/app/eltern-kinder.html'; });
    }
    return Promise.resolve('/app/dashboard.html');
  }

  /* ---------- login/ ---------- */
  function initLogin() {
    var form = document.querySelector('.auth-card form');
    if (!form) return;
    form.removeAttribute('data-demo');
    var msg = ensureMsgEl(form);
    var btn = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      showMsg(msg, '', '');
      setBusy(btn, true, 'Anmelden …');
      post('/auth/login', {
        email: form.email.value.trim(),
        passwort: form.pw.value,
        angemeldetBleiben: !!form.stay.checked,
      })
        .then(function (r) {
          setToken(r.token);
          return zielNachLogin(r.user, r.token);
        })
        .then(function (ziel) { location.href = ziel; })
        .catch(function (err) {
          setBusy(btn, false);
          showMsg(msg, fehlerText(err.code), 'error');
        });
    });
  }

  /* ---------- registrieren/ ---------- */
  function initRegistrieren() {
    var form = document.querySelector('.auth-card form');
    if (!form) return;
    form.removeAttribute('data-demo');
    var msg = ensureMsgEl(form);
    var btn = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      showMsg(msg, '', '');
      setBusy(btn, true, 'Konto wird angelegt …');
      var email = form.email.value.trim();
      var passwort = form.pw.value;
      post('/auth/registrieren', {
        name: form.name.value.trim(),
        email: email,
        passwort: passwort,
        einwilligung: true,
      })
        .then(function () {
          // Registrierung liefert bewusst kein Token (Phase 3) — direkt
          // anmelden, damit die Kasse (checkout/) ein Konto hat.
          return post('/auth/login', { email: email, passwort: passwort, angemeldetBleiben: true });
        })
        .then(function (r) {
          setToken(r.token);
          // Trägt die volle Tarifwahl aus der Preise-Seite/Kasse (inkl.
          // Familien-Paket tier/seats) über die Registrierung hinweg zurück
          // zur Kasse — sonst verliert man wie beim ursprünglichen Kasse-Link-
          // Bug (siehe UMSETZUNGSPLAN.md „Geld") die Auswahl beim Umweg über
          // die Registrierung.
          var weiter = new URLSearchParams(location.search);
          var ziel = '/checkout/';
          var qs = ['plan', 'interval', 'tier', 'seats'].reduce(function (acc, key) {
            var v = weiter.get(key);
            if (v) acc.push(key + '=' + encodeURIComponent(v));
            return acc;
          }, []);
          if (qs.length) ziel += '?' + qs.join('&');
          location.href = ziel;
        })
        .catch(function (err) {
          setBusy(btn, false);
          showMsg(msg, fehlerText(err.code), 'error');
        });
    });
  }

  /* ---------- passwort-vergessen/ ---------- */
  function initPasswortVergessen() {
    var form = document.querySelector('.auth-card form');
    if (!form) return;
    form.removeAttribute('data-demo');
    var msg = ensureMsgEl(form);
    var btn = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      showMsg(msg, '', '');
      setBusy(btn, true, 'Wird gesendet …');
      post('/auth/passwort-vergessen', { email: form.email.value.trim() })
        .then(function (r) {
          setBusy(btn, false);
          // Aus Datenschutzgründen antwortet der Server immer gleich, egal ob
          // die E-Mail existiert. Solange kein Mailversand angebunden ist
          // (Phase 10, zurückgestellt), gibt Dev den Token direkt zurück.
          if (r && r.resetToken) {
            var link = '/passwort-zuruecksetzen/?token=' + encodeURIComponent(r.resetToken);
            msg.innerHTML =
              'Link verschickt (Dev-Modus, kein Mailversand konfiguriert): ' +
              '<a href="' + link + '">Passwort jetzt zurücksetzen</a>';
            msg.className = 'co-message is-visible co-message--info';
          } else {
            showMsg(msg, 'Falls ein Konto zu dieser E-Mail existiert, wurde ein Link zum Zurücksetzen verschickt.', 'success');
          }
          form.reset();
        })
        .catch(function (err) {
          setBusy(btn, false);
          showMsg(msg, fehlerText(err.code), 'error');
        });
    });
  }

  /* ---------- passwort-zuruecksetzen/ ---------- */
  function initPasswortZuruecksetzen() {
    var form = document.querySelector('.auth-card form');
    if (!form) return;
    var msg = ensureMsgEl(form);
    var btn = form.querySelector('button[type="submit"]');
    var token = new URLSearchParams(location.search).get('token') || '';
    if (!token) {
      showMsg(msg, 'Kein gültiger Reset-Link. Bitte über „Passwort vergessen" einen neuen anfordern.', 'error');
      form.querySelectorAll('input, button').forEach(function (el) { el.disabled = true; });
      return;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      showMsg(msg, '', '');
      if (form.pw.value !== form.pw2.value) {
        showMsg(msg, 'Die beiden Passwörter stimmen nicht überein.', 'error');
        return;
      }
      setBusy(btn, true, 'Wird gespeichert …');
      post('/auth/passwort-zuruecksetzen', { token: token, neuesPasswort: form.pw.value })
        .then(function () {
          showMsg(msg, 'Passwort gespeichert. Du wirst zur Anmeldung weitergeleitet …', 'success');
          setTimeout(function () { location.href = '/login/'; }, 1500);
        })
        .catch(function (err) {
          setBusy(btn, false);
          showMsg(msg, fehlerText(err.code), 'error');
        });
    });
  }

  /* ---------- email-bestaetigen/ ---------- */
  function initEmailBestaetigen() {
    var msg = document.querySelector('.co-message');
    if (!msg) return;
    var token = new URLSearchParams(location.search).get('token') || '';
    if (!token) {
      showMsg(msg, 'Kein gültiger Bestätigungslink. Bitte den Link aus der E-Mail erneut öffnen.', 'error');
      return;
    }
    post('/auth/email-bestaetigen', { token: token })
      .then(function () {
        showMsg(msg, 'E-Mail-Adresse bestätigt. Du kannst dich jetzt anmelden.', 'success');
      })
      .catch(function (err) {
        showMsg(msg, fehlerText(err.code), 'error');
      });
  }

  /* ---------- kontakt/ ---------- */
  function initKontakt() {
    var form = document.querySelector('.contact-form');
    if (!form) return;
    form.removeAttribute('data-demo');
    var msg = ensureMsgEl(form);
    var btn = form.querySelector('button[type="submit"]');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      showMsg(msg, '', '');
      setBusy(btn, true, 'Wird gesendet …');
      post('/kontakt', {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        thema: form.topic.value,
        nachricht: form.message.value.trim(),
        website: form.website ? form.website.value : '',
      })
        .then(function () {
          setBusy(btn, false);
          showMsg(msg, 'Danke, Ihre Nachricht ist angekommen. Wir melden uns in der Regel innerhalb eines Werktags.', 'success');
          form.reset();
        })
        .catch(function (err) {
          setBusy(btn, false);
          showMsg(msg, fehlerText(err.code), 'error');
        });
    });
  }

  var PAGE_INIT = {
    login: initLogin,
    registrieren: initRegistrieren,
    'passwort-vergessen': initPasswortVergessen,
    'passwort-zuruecksetzen': initPasswortZuruecksetzen,
    'email-bestaetigen': initEmailBestaetigen,
    kontakt: initKontakt,
  };

  document.addEventListener('DOMContentLoaded', function () {
    var init = PAGE_INIT[document.body.getAttribute('data-page')];
    if (init) init();
  });
})();
