/* =========================================================
   Lesify — API-Client (Phase 11)
   ---------------------------------------------------------
   Ersetzt perspektivisch `data.js`: gleiche Funktionsnamen wie
   `Lesify.*` / `LesifyUI.search`, aber **asynchron** (Promises) statt
   synchron. Beim Umstellen einer Seite:
     - `<script src="assets/js/data.js">` → `<script src="assets/js/api.js">`
     - jeden `Lesify.xyz(...)`-Aufruf `await`en (bzw. `.then(...)`)
     - `assets/js/auth-gate.js` einbinden (Redirect ohne Session)

   Reine Formeln (`prozentZuNote`, `noteAmpel`, `lernplanStatus`, …) liefert
   der Server mit den jeweiligen Ressourcen mit; die wenigen rein lokalen
   Helfer (`slugify`, `uid`, `getFachColor`, `label`) sind unten gespiegelt.

   Konfiguration: `window.LESIFY_API_BASE` (Default: http://localhost:3000).
   Session-Token liegt in `localStorage['lesify:token']`.
   ========================================================= */
(function () {
  'use strict';

  var BASE = (window.LESIFY_API_BASE || 'http://localhost:3000').replace(/\/$/, '');
  var TOKEN_KEY = 'lesify:token';

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch (e) {
      return '';
    }
  }
  function setToken(t) {
    try {
      if (t) localStorage.setItem(TOKEN_KEY, t);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      /* privater Modus */
    }
  }

  /** Normalisierter Fehler — die UI zeigt ihn als Popup/Toast (Phase 11). */
  function ApiError(status, code, details) {
    this.name = 'ApiError';
    this.status = status;
    this.code = code || 'serverfehler';
    this.details = details || null;
    this.message = code || 'serverfehler';
  }
  ApiError.prototype = Object.create(Error.prototype);

  /** Menschlicher Text je bekanntem Fehlercode (Guard-Popups etc.). */
  var FEHLER_TEXT = {
    nicht_angemeldet: 'Bitte melde dich neu an.',
    limit_erreicht: 'Dein Monatskontingent für diese Funktion ist aufgebraucht.',
    validierung: 'Die Eingabe ist unvollständig oder ungültig.',
    nicht_gefunden: 'Nicht gefunden.',
    abo_vorhanden: 'Es besteht bereits ein Abo.',
    datei_zu_gross: 'Die Datei ist größer als 5 MB.',
    dateityp_nicht_unterstuetzt: 'Dieser Dateityp wird nicht unterstützt (PDF, Word, Bild).',
    nicht_schulrelevant: 'Die KI hilft nur bei schulischen Themen.',
    anfrage_zu_gross: 'Die Anfrage ist zu lang — bitte kürzen.',
    spam_erkannt: 'Zu viele gleiche Anfragen kurz hintereinander.',
    rate_limit: 'Zu viele Anfragen — kurz warten und erneut versuchen.',
  };
  function fehlerText(err) {
    return (err && FEHLER_TEXT[err.code]) || 'Es ist ein Fehler aufgetreten.';
  }

  function request(method, pfad, body, opts) {
    opts = opts || {};
    var headers = { Accept: 'application/json' };
    var tok = getToken();
    if (tok) headers.Authorization = 'Bearer ' + tok;
    var init = { method: method, headers: headers };
    if (body !== undefined && body !== null) {
      if (typeof FormData !== 'undefined' && body instanceof FormData) {
        init.body = body;
      } else {
        headers['Content-Type'] = 'application/json';
        init.body = JSON.stringify(body);
      }
    }
    return fetch(BASE + pfad, init).then(function (res) {
      if (res.status === 204) return null;
      return res.text().then(function (txt) {
        var data = null;
        try {
          data = txt ? JSON.parse(txt) : null;
        } catch (e) {
          data = null;
        }
        if (!res.ok) {
          var code = (data && data.fehler) || 'serverfehler';
          if (res.status === 401) setToken('');
          if (res.status === 429 && code === 'serverfehler') code = 'rate_limit';
          throw new ApiError(res.status, code, data && data.details);
        }
        return data;
      });
    });
  }

  var GET = function (p, opts) {
    return request('GET', p, null, opts);
  };
  var POST = function (p, b, opts) {
    return request('POST', p, b, opts);
  };
  var PATCH = function (p, b) {
    return request('PATCH', p, b);
  };
  var DELETE = function (p) {
    return request('DELETE', p);
  };
  var qs = function (o) {
    var parts = [];
    for (var k in o)
      if (o[k] !== undefined && o[k] !== null && o[k] !== '')
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(o[k]));
    return parts.length ? '?' + parts.join('&') : '';
  };

  /* ---------- rein lokale Helfer (aus data.js gespiegelt) ---------- */
  function slugify(s) {
    return String(s || '')
      .toLowerCase()
      .replace(/[äöüß]/g, function (c) {
        return { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }[c];
      })
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  var _uidN = 0;
  function uid(prefix) {
    _uidN += 1;
    return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + _uidN;
  }

  var Lesify = {
    /* Auth / Session -------------------------------------------------- */
    registrieren: function (d) {
      return POST('/auth/registrieren', d);
    },
    login: function (email, passwort, angemeldetBleiben) {
      return POST('/auth/login', {
        email: email,
        passwort: passwort,
        angemeldetBleiben: !!angemeldetBleiben,
      }).then(function (r) {
        if (r && r.token) setToken(r.token);
        return r;
      });
    },
    logout: function () {
      return POST('/auth/logout', {})
        .catch(function () {})
        .then(function () {
          setToken('');
        });
    },
    me: function () {
      return GET('/auth/me');
    },
    istAngemeldet: function () {
      return !!getToken();
    },
    emailBestaetigen: function (token) {
      return POST('/auth/email-bestaetigen', { token: token });
    },
    passwortVergessen: function (email) {
      return POST('/auth/passwort-vergessen', { email: email });
    },
    passwortZuruecksetzen: function (token, neuesPasswort) {
      return POST('/auth/passwort-zuruecksetzen', { token: token, neuesPasswort: neuesPasswort });
    },

    /* Fächer & Themen ---------------------------------------------- */
    faecher: function () {
      return GET('/faecher');
    },
    getFach: function (id) {
      return GET('/faecher/' + id);
    },
    addFach: function (d) {
      return POST('/faecher', d);
    },
    updateFach: function (id, patch) {
      return PATCH('/faecher/' + id, patch);
    },
    themenFuerFach: function (fachId) {
      return GET('/faecher/' + fachId + '/themen');
    },
    themen: function () {
      return GET('/themen');
    },
    getThema: function (id) {
      return GET('/themen/' + id);
    },
    addThema: function (d) {
      return POST('/themen', d);
    },

    /* Chats -------------------------------------------------------- */
    chats: function (fachId) {
      return GET('/chats' + qs({ fachId: fachId }));
    },
    getChat: function (id) {
      return GET('/chats/' + id);
    },
    addChat: function (d) {
      return POST('/chats', d);
    },
    appendChatMessages: function (chatId, text, extra) {
      var body = { text: text };
      if (extra && extra.anhangDateiId) body.anhangDateiId = extra.anhangDateiId;
      if (extra && extra.lernplanKontext) body.lernplanKontext = extra.lernplanKontext;
      return POST('/chats/' + chatId + '/nachrichten', body);
    },

    /* Lernzettel ------------------------------------------------- */
    getLernzettel: function (id) {
      return GET('/lernzettel/' + id);
    },
    addLernzettel: function (themaId) {
      return POST('/themen/' + themaId + '/lernzettel', {});
    },
    addLernzettelRevision: function (id, text) {
      return POST('/lernzettel/' + id + '/revisionen', { text: text });
    },

    /* Dateien --------------------------------------------------- */
    dateien: function (themaId) {
      return GET('/dateien' + qs({ themaId: themaId }));
    },
    getDatei: function (id) {
      return GET('/dateien/' + id);
    },
    /** Direkt navigierbare URL (`<a href>`/`<img src>`) — Token als `?token=`, da kein Authorization-Header möglich ist. */
    dateiInhaltUrl: function (id) {
      return BASE + '/dateien/' + id + '/inhalt?token=' + encodeURIComponent(getToken());
    },
    uploadDatei: function (themaId, file) {
      var fd = new FormData();
      fd.append('datei', file);
      return POST('/themen/' + themaId + '/dateien', fd);
    },
    /** Pollt `GET /dateien/:id`, bis Status `bereit`/`fehler` oder Timeout (~60 s). */
    pollDateiStatus: function (id, onUpdate) {
      var startZeit = Date.now();
      return new Promise(function (resolve, reject) {
        function tick(wartezeit) {
          GET('/dateien/' + id).then(function (d) {
            if (onUpdate) onUpdate(d);
            if (d.status === 'bereit' || d.status === 'fehler') return resolve(d);
            if (Date.now() - startZeit > 60000) return resolve(d);
            setTimeout(function () {
              tick(Math.min(wartezeit * 1.5, 6000));
            }, wartezeit);
          }, reject);
        }
        tick(1000);
      });
    },

    /* Klausuren & Lernplan ------------------------------------- */
    klausuren: function () {
      return GET('/klausuren');
    },
    getKlausur: function (id) {
      return GET('/klausuren/' + id);
    },
    addKlausur: function (d) {
      return POST('/klausuren', d);
    },
    getLernplan: function (id) {
      return GET('/lernplaene/' + id);
    },
    getLernplanFuerKlausur: function (klausurId) {
      return GET('/klausuren/' + klausurId + '/lernplan');
    },
    lernplanStatus: function (id) {
      return GET('/lernplaene/' + id).then(function (lp) {
        return lp && lp.status ? lp.status : lp;
      });
    },
    setLernplanCheck: function (id, tag, key, checked) {
      return PATCH('/lernplaene/' + id + '/checklist', { tag: tag, key: key, checked: checked });
    },
    setLernplanTagChecks: function (id, tag, checked) {
      return PATCH('/lernplaene/' + id + '/checklist', { tag: tag, checked: checked });
    },
    setLernplanChatId: function (id, tag, modus, themaId, chatId) {
      return PATCH('/lernplaene/' + id, {
        tag: tag,
        modus: modus,
        themaId: themaId,
        chatId: chatId,
      });
    },
    aktualisiereLernzettel: function (id, themaIds) {
      return POST('/lernplaene/' + id + '/lernzettel', { themaIds: themaIds });
    },
    lernzettelDokumentUrl: function (id) {
      return BASE + '/lernplaene/' + id + '/lernzettel/dokument';
    },
    starteTestklausur2: function (lernplanId) {
      return POST('/lernplaene/' + lernplanId + '/testklausur2', {});
    },

    /* Testklausuren ------------------------------------------- */
    getTestklausur: function (id) {
      return GET('/testklausuren/' + id);
    },
    addTestklausur: function (d) {
      return POST('/testklausuren', d);
    },
    analysiereTestklausur: function (id) {
      return POST('/testklausuren/' + id + '/analyse', {});
    },
    loeseTestklausur: function (id, geloesteDateiId) {
      return POST('/testklausuren/' + id + '/loesung', { geloesteDateiId: geloesteDateiId });
    },
    testklausurDokumentUrl: function (id) {
      return BASE + '/testklausuren/' + id + '/dokument';
    },

    /* Usage / Abo ------------------------------------------- */
    usage: function () {
      return GET('/usage');
    },
    getAbo: function () {
      return GET('/abo');
    },
    abschliessenAbo: function (d) {
      return POST('/abo', d);
    },
    aendernAbo: function (patch) {
      return PATCH('/abo', patch);
    },
    kuendigenAbo: function () {
      return POST('/abo/kuendigen', {});
    },
    pausierenAbo: function () {
      return POST('/abo/pausieren', {});
    },
    kinder: function () {
      return GET('/abo/kinder');
    },
    addKind: function (d) {
      return POST('/abo/kinder', d);
    },
    removeKind: function (id) {
      return DELETE('/abo/kinder/' + id);
    },
    /** E-Mail am Kind-Profil setzen; Antwort enthält (dev) `resetToken`. */
    kinderEinladung: function (id, email) {
      return POST('/abo/kinder/' + id + '/einladung', { email: email });
    },
    /** Kontext-Wechsel: eigene Session fürs Kind-Profil → `{token, kindId}`. */
    kinderSitzung: function (id) {
      return POST('/abo/kinder/' + id + '/sitzung', {});
    },
    /** Aggregierte Wochenkennzahlen je Kind — kein Chat-Wortlaut. */
    kinderZusammenfassung: function (id) {
      return GET('/abo/kinder/' + id + '/zusammenfassung');
    },

    /* Profil & Einstellungen ------------------------------- */
    getUser: function () {
      return GET('/user');
    },
    updateUser: function (patch) {
      return PATCH('/user', patch);
    },
    getSettings: function () {
      return GET('/user/einstellungen');
    },
    updateSettings: function (patch) {
      return PATCH('/user/einstellungen', patch);
    },

    /* Suche & Kontakt ------------------------------------- */
    suche: function (q) {
      return GET('/suche' + qs({ q: q }));
    },
    kontakt: function (d) {
      return POST('/kontakt', d);
    },

    /* lokale Helfer -------------------------------------- */
    slugify: slugify,
    uid: uid,
    fehlerText: fehlerText,
    ApiError: ApiError,
    _setToken: setToken,
    _getToken: getToken,
    _base: BASE,
  };

  window.Lesify = Lesify;
  window.LesifyAPI = Lesify; // eindeutiger Name, falls data.js parallel geladen ist
})();
