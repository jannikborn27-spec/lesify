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

   Konfiguration: `window.LESIFY_API_BASE` (Default: auf lesify.de/www.lesify.de
   die produktive Railway-API, sonst http://localhost:3000 für lokale Dev-Server).
   Session-Token liegt in `localStorage['lesify:token']`.
   ========================================================= */
(function () {
  'use strict';

  var PROD_API_BASE = 'https://lesify-production.up.railway.app';
  var istProdHost = /(^|\.)lesify\.de$/.test(location.hostname);
  var BASE = (window.LESIFY_API_BASE || (istProdHost ? PROD_API_BASE : 'http://localhost:3000')).replace(
    /\/$/,
    '',
  );
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
    missbrauch_gesperrt: 'Die KI-Funktionen sind für dich kurz gesperrt — bitte später erneut versuchen.',
    ki_nicht_verfuegbar: 'Die KI ist gerade nicht erreichbar — bitte gleich noch einmal versuchen. Es wurde nichts von deinem Kontingent abgezogen.',
    rate_limit: 'Zu viele Anfragen — kurz warten und erneut versuchen.',
    passwort_falsch: 'Falsches Passwort.',
    abo_nicht_reaktivierbar: 'Das Abo ist bereits aktiv.',
    sitze_ausgeschoepft: 'Alle Plätze sind belegt.',
    kein_familienabo: 'Dafür ist ein Familien-Abo nötig.',
    abo_gesperrt: 'Dein Zugang ist gerade pausiert — sprich mit deinen Eltern.',
    zahlung_offen: 'Gerade kannst du nichts Neues anlegen: Beim Abo ist eine Zahlung offen. Sag deinen Eltern Bescheid.',
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

  /**
   * POST mit Server-Sent-Events-Antwort (Chat-Streaming): ruft `onDelta(text)`
   * für jedes Textstück und löst mit dem `fertig`-Ereignis auf — dasselbe
   * Objekt wie die normale JSON-Antwort. Fehler vor dem Stream (Guards,
   * Limits) kommen als JSON und werden wie bei `request` zu `ApiError`.
   */
  function streamRequest(pfad, body, onDelta) {
    var headers = { Accept: 'text/event-stream', 'Content-Type': 'application/json' };
    var tok = getToken();
    if (tok) headers.Authorization = 'Bearer ' + tok;
    return fetch(BASE + pfad, { method: 'POST', headers: headers, body: JSON.stringify(body) }).then(function (res) {
      var typ = res.headers.get('content-type') || '';
      if (!res.ok || typ.indexOf('text/event-stream') === -1 || !res.body) {
        return res.text().then(function (txt) {
          var data = null;
          try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = null; }
          if (!res.ok) {
            var code = (data && data.fehler) || 'serverfehler';
            if (res.status === 401) setToken('');
            if (res.status === 429 && code === 'serverfehler') code = 'rate_limit';
            throw new ApiError(res.status, code, data && data.details);
          }
          return data;
        });
      }
      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var puffer = '';
      var ergebnis = null;
      function verarbeite(block) {
        if (block.indexOf('data: ') !== 0) return;
        var ev = JSON.parse(block.slice(6));
        if (ev.typ === 'delta') onDelta(ev.text);
        else if (ev.typ === 'fertig') { delete ev.typ; ergebnis = ev; }
        else if (ev.typ === 'fehler') throw new ApiError(ev.fehler === 'ki_nicht_verfuegbar' ? 503 : 500, ev.fehler);
      }
      function lesen() {
        return reader.read().then(function (r) {
          if (r.value) puffer += decoder.decode(r.value, { stream: true });
          var teile = puffer.split('\n\n');
          puffer = teile.pop();
          teile.forEach(verarbeite);
          if (!r.done) return lesen();
          if (puffer) verarbeite(puffer);
          if (!ergebnis) throw new ApiError(0, 'serverfehler');
          return ergebnis;
        });
      }
      return lesen();
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

  /* ---------- Notenlogik (reine Formeln, 1:1 aus data.js/shared/src/noten.ts) ---------- */
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function prozentZuNote(prozent) {
    var note = 6 - (clamp(prozent, 0, 100) / 100) * 5;
    return Math.round(note * 10) / 10;
  }
  var AMPEL_GRUEN_MAX_NOTE = 2.5;
  function noteLabel(note) {
    if (note <= 1.5) return 'sehr gut';
    if (note <= 2.5) return 'gut';
    if (note <= 3.5) return 'befriedigend';
    if (note <= 4.5) return 'ausreichend';
    if (note <= 5.5) return 'mangelhaft';
    return 'ungenügend';
  }
  function noteAmpel(note) {
    if (note <= AMPEL_GRUEN_MAX_NOTE) return 'gruen';
    if (note <= 4.0) return 'gelb';
    return 'rot';
  }
  var TIER_LABEL = { gruen: 'stark', gelb: 'wackelig', rot: 'schwach' };
  function tierLabel(ampel) { return TIER_LABEL[ampel] || ampel; }

  // Eine Klausur gilt als „bereits geschrieben", sobald ihr Datum vor dem
  // heutigen Tag liegt — reine Datumsableitung, kein eigenes Statusfeld.
  function klausurVergangen(k) {
    if (!k || !k.datum) return false;
    var p = String(k.datum).split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    var heute = new Date();
    heute.setHours(0, 0, 0, 0);
    return d < heute;
  }

  /* ---------- Fach-Farben/-Icons (reine Design-Tokens, 1:1 aus data.js) ---------- */
  var FACH_COLORS = [
    { key: 'blue', name: 'Blau', base: '#007dae', ink: '#00699c', bg: '#e5f5fd' },
    { key: 'rose', name: 'Rosé', base: '#c4334f', ink: '#b6143f', bg: '#ffebec' },
    { key: 'amber', name: 'Amber', base: '#c26f00', ink: '#913b00', bg: '#ffeedd' },
    { key: 'teal', name: 'Türkis', base: '#009176', ink: '#006e54', bg: '#e5f6f1' },
    { key: 'terracotta', name: 'Terrakotta', base: '#985535', ink: '#89401c', bg: '#fdeee8' },
    { key: 'violet', name: 'Violett', base: '#654db6', ink: '#5031a1', bg: '#f1efff' },
    { key: 'pink', name: 'Pink', base: '#b84999', ink: '#931a77', bg: '#feecf7' },
    { key: 'graphit', name: 'Graphit', base: '#516676', ink: '#101214', bg: '#edf1f3' }
  ];
  function getFachColor(key) {
    var found = null;
    for (var i = 0; i < FACH_COLORS.length; i++) { if (FACH_COLORS[i].key === key) { found = FACH_COLORS[i]; break; } }
    return found || FACH_COLORS[FACH_COLORS.length - 1];
  }
  /** Kind-Profile haben kein eigenes Farbfeld im Backend (anders als
      `Fach.farbe`) — rein kosmetischer Avatar-Ton, deterministisch aus der
      Kind-ID gewählt, damit er über Reloads stabil bleibt. */
  function getKindColor(kindId) {
    var h = 0, s = String(kindId || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return FACH_COLORS[Math.abs(h) % FACH_COLORS.length];
  }
  var FACH_ICONS = {
    mathematik: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 7h15"/><path d="M8.5 7v11"/><path d="M15 7v9a2 2 0 0 0 3.5 1.3"/></svg>',
    deutsch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 2.5v19"/><path d="M10.5 9h6M10.5 12h6M10.5 15h6"/></svg>',
    englisch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M3 6l18 12M21 6 3 18M12 6v12M3 12h18"/></svg>',
    franzoesisch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M9 6v12M15 6v12"/></svg>',
    spanisch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="1.5"/><path d="M3 9h18M3 15h18"/></svg>',
    latein: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M4 21V10.5M8 21V10.5M12 21V10.5M16 21V10.5M20 21V10.5"/><path d="M2.5 10.5h19L12 3Z"/></svg>',
    biologie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3c0 5 8 5 8 9s-8 4-8 9"/><path d="M16 3c0 5-8 5-8 9s8 4 8 9"/><path d="M9 5.5h6M9.5 18.5h5M8.5 12h7"/></svg>',
    chemie: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3h4"/><path d="M10.5 3v6.2L5.7 18a2 2 0 0 0 1.8 2.9h9a2 2 0 0 0 1.8-2.9L13.5 9.2V3"/><path d="M8 15.5h8"/></svg>',
    physik: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/></svg>',
    geschichte: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 21V5h4v3h2V5h4v3h2V5h4v16Z"/><path d="M10.5 21v-5a1.5 1.5 0 0 1 3 0v5"/></svg>',
    erdkunde: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2Z"/><path d="M9 4v14M15 6v14"/></svg>',
    politik: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18"/><path d="M12 5 4 8l3 6.5h-6L4 8"/><path d="M12 5l8 3-3 6.5h6L20 8"/><path d="M8 21h8"/></svg>',
    religion: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c-1.8 2.4-2.8 4.6-2.8 6.6a2.8 2.8 0 1 0 5.6 0C14.8 6.6 13.8 4.4 12 2Z"/><path d="M6 21c0-4 2.7-6.5 6-6.5s6 2.5 6 6.5"/></svg>',
    kunst: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a9 8 0 1 0 0 16c1 0 1.6-.7 1.6-1.5 0-.4-.2-.8-.2-1.2 0-.9.7-1.3 1.6-1.3H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z"/><circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="9.5" cy="7.3" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="7.3" r="1" fill="currentColor" stroke="none"/><circle cx="16.5" cy="11" r="1" fill="currentColor" stroke="none"/></svg>',
    musik: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5.5l10-2v12.5"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="15.5" r="2.5"/></svg>',
    sport: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/><path d="M5.3 5.3c2 1.6 3 3.9 3 6.7s-1 5.1-3 6.7M18.7 5.3c-2 1.6-3 3.9-3 6.7s1 5.1 3 6.7"/></svg>',
    informatik: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>',
    wirtschaft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V10M10 20V6M16 20v-8M20 20v-4"/><path d="M4 20h18"/></svg>'
  };
  var FACH_PRESETS = [
    { name: 'Mathematik', icon: 'mathematik' }, { name: 'Deutsch', icon: 'deutsch' },
    { name: 'Englisch', icon: 'englisch' }, { name: 'Französisch', icon: 'franzoesisch' },
    { name: 'Spanisch', icon: 'spanisch' }, { name: 'Latein', icon: 'latein' },
    { name: 'Biologie', icon: 'biologie' }, { name: 'Chemie', icon: 'chemie' },
    { name: 'Physik', icon: 'physik' }, { name: 'Geschichte', icon: 'geschichte' },
    { name: 'Erdkunde', icon: 'erdkunde' }, { name: 'Politik', icon: 'politik' },
    { name: 'Religion', icon: 'religion' }, { name: 'Kunst', icon: 'kunst' },
    { name: 'Musik', icon: 'musik' }, { name: 'Sport', icon: 'sport' },
    { name: 'Informatik', icon: 'informatik' }, { name: 'Wirtschaft', icon: 'wirtschaft' }
  ];
  function getFachIconSvg(iconKey) { return FACH_ICONS[iconKey] || null; }

  /* ---------- Fächer-/Themen-Cache ----------
     app.js' geteilte Renderer (badge/fachColorVars/fachBadge/cardWatermark/…)
     lesen Fach-/Thema-Daten SYNCHRON per ID — genau wie im data.js-Prototyp.
     Die Seite muss dafür einmal `Lesify.faecher()`/`Lesify.themen()` geawaitet
     haben (macht jede Seite ohnehin für ihre Haupt-Daten); danach beantworten
     `getFach`/`label` Lookups aus dem Cache, ohne einen weiteren Request. */
  var _cache = { faecher: [], themen: [], lernplaene: {} };
  /** Fügt/aktualisiert Einträge per `id`, statt den ganzen Cache zu ersetzen —
      wichtig für Teil-Listen wie `themenFuerFach()`, die sonst alles außer
      dem gerade abgefragten Fach aus dem Cache werfen würden. */
  function mergeCache(target, list) {
    list.forEach(function (item) {
      for (var i = 0; i < target.length; i++) {
        if (target[i].id === item.id) { target[i] = item; return; }
      }
      target.push(item);
    });
  }
  function getFach(id) {
    for (var i = 0; i < _cache.faecher.length; i++) if (_cache.faecher[i].id === id) return _cache.faecher[i];
    return undefined;
  }
  function getFachIcon(fachId) {
    var f = getFach(fachId);
    return f ? getFachIconSvg(f.icon) : null;
  }
  function label(themaId) {
    for (var i = 0; i < _cache.themen.length; i++) {
      var t = _cache.themen[i];
      if (t.id === themaId) return { fach: t.fachName || '—', thema: t.name, fachId: t.fachId, themaId: t.id };
    }
    return { fach: '—', thema: '—', fachId: '', themaId: themaId };
  }

  /* ---------- Lernplan-Status (sync Cache-Lookup, wie data.js) ----------
     GET /lernplaene/:id liefert die persistierten Felder + `klausur`/
     `testklausur1`/`testklausur2` (volle Objekte, data.js-Form) + `status`
     (die reinen tag1..tag7-Berechnungen, siehe shared/src/lernplan.ts).
     `lernplanStatus()` fügt das zur EINEN flachen Form zusammen, die
     app.js' Lernplan-Renderer erwarten: `{lernplan, klausur, testklausur1,
     testklausur2, tag1..tag7, aktuellerTag, letzteTestNote, letzteTestNr,
     gesamtnoteAktuell}`. Braucht ein vorheriges `await Lesify.getLernplan(id)`
     (oder `getLernplanFuerKlausur`/`starteTestklausur2`, die denselben Cache
     füllen). */
  function lernplanStatus(id) {
    var r = _cache.lernplaene[id];
    if (!r) return null;
    var out = {
      lernplan: {
        id: r.id, klausurId: r.klausurId, testklausur1Id: r.testklausur1Id,
        testklausur2Id: r.testklausur2Id, checklist: r.checklist, tageErledigt: r.tageErledigt,
        lernzettel: r.lernzettel, chatMap: r.chatMap, erstelltAm: r.erstelltAm
      },
      klausur: r.klausur, testklausur1: r.testklausur1, testklausur2: r.testklausur2
    };
    for (var k in r.status) out[k] = r.status[k];
    return out;
  }
  /** Wie `chatMapKey()`/`setChatMapEintrag()` im Backend (`api/src/lib/lernplan.ts`)
      — NICHT das `String(modus)`-Format aus data.js, sonst passen die Keys
      nicht zu dem, was der Server unter `chatMap` tatsächlich speichert. */
  function lernplanChatKey(tag, modus, themaId) { return tag + '|' + (modus || '') + '|' + themaId; }
  function getLernplanChatId(lernplanId, tag, modus, themaId) {
    var r = _cache.lernplaene[lernplanId];
    if (!r || !r.chatMap) return null;
    return r.chatMap[lernplanChatKey(tag, modus, themaId)] || null;
  }

  /* ---------- relative Zeit (z. B. "vor 2 Stunden") ----------
     data.js hat das nur als Seed-Text fest verdrahtet; hier aus dem echten
     Zeitstempel berechnet, damit Chats/Lernzettel/Dateien-Feeds dieselbe
     Anzeigeform bekommen wie im Prototyp. */
  function relativeTime(iso) {
    if (!iso) return '';
    var diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return 'gerade eben';
    if (diffMin < 60) return 'vor ' + diffMin + ' Minute' + (diffMin === 1 ? '' : 'n');
    var diffStd = Math.floor(diffMin / 60);
    if (diffStd < 24) return 'vor ' + diffStd + ' Stunde' + (diffStd === 1 ? '' : 'n');
    var diffTage = Math.floor(diffStd / 24);
    if (diffTage === 1) return 'gestern';
    if (diffTage < 7) return 'vor ' + diffTage + ' Tagen';
    var diffWochen = Math.floor(diffTage / 7);
    if (diffWochen < 5) return 'vor ' + diffWochen + ' Woche' + (diffWochen === 1 ? '' : 'n');
    var diffMonate = Math.floor(diffTage / 30);
    return 'vor ' + diffMonate + ' Monat' + (diffMonate === 1 ? '' : 'en');
  }
  function mitUpdated(item, isoFeld) {
    item.updated = relativeTime(item[isoFeld]);
    return item;
  }
  /** "1.2 MB"/"240 KB" statt `groesseBytes` — data.js hat die Größe direkt
      als formatierten String im Seed. */
  function formatBytes(bytes) {
    if (bytes == null) return '—';
    var kb = bytes / 1024;
    return kb > 1024 ? (kb / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(kb)) + ' KB';
  }
  function mitDateiForm(d) {
    d.groesse = formatBytes(d.groesseBytes);
    return mitUpdated(d, 'erstelltAm');
  }
  function initialen(name) {
    return String(name || '').split(/\s+/).map(function (p) { return p.charAt(0); }).join('').slice(0, 2).toUpperCase();
  }
  /** `GET /testklausuren/:id` liefert flache `ergebnisse`-Zeilen
      (`TestklausurErgebnis`), data.js' UI erwartet aber ein genestetes
      `t.ergebnis = {note, prozent, proThema}` (wie `testklausurFuerLernplanUI`
      im Backend für die Lernplan-Einbettung baut — 1:1 hier gespiegelt, da
      `GET /testklausuren/:id` selbst nicht nestet). */
  function reshapeTestklausur(t) {
    var proz = t.ergebnisse.map(function (e) { return e.prozent; });
    if (proz.length) {
      var gesamtProzent = Math.round(proz.reduce(function (a, b) { return a + b; }, 0) / proz.length);
      t.ergebnis = {
        note: prozentZuNote(gesamtProzent),
        prozent: gesamtProzent,
        proThema: t.ergebnisse.map(function (e) {
          return { themaId: e.themaId, prozent: e.prozent, note: Number(e.note), erklaerung: e.erklaerung };
        })
      };
    } else {
      t.ergebnis = null;
    }
    return mitUpdated(t, 'erstelltAm');
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
      return GET('/faecher').then(function (list) {
        mergeCache(_cache.faecher, list);
        return list;
      });
    },
    /** Synchroner Cache-Lookup (wie data.js) — braucht ein vorheriges `faecher()`. */
    getFach: getFach,
    getFachIcon: getFachIcon,
    addFach: function (d) {
      return POST('/faecher', d);
    },
    updateFach: function (id, patch) {
      return PATCH('/faecher/' + id, patch);
    },
    /** Scoped-Liste — hat kein `fachName`/`farbe` vom Server (kein `fach`-Include,
        siehe faecher.ts), darum hier aus dem Fächer-Cache ergänzt, bevor der
        Themen-Cache aktualisiert wird (sonst zeigen Badges „—" statt Fachname). */
    themenFuerFach: function (fachId) {
      return GET('/faecher/' + fachId + '/themen').then(function (list) {
        var f = getFach(fachId);
        if (f) {
          list.forEach(function (t) {
            t.fachName = t.fachName || f.name;
            t.farbe = t.farbe || f.farbe;
          });
        }
        mergeCache(_cache.themen, list);
        return list;
      });
    },
    themen: function () {
      return GET('/themen').then(function (list) {
        mergeCache(_cache.themen, list);
        return list;
      });
    },
    /** Async — volles Aggregat inkl. Zählwerten/Kurzlisten (Thema-Detailseite).
        `stats.*` zusätzlich als `anzahlChats`/… gespiegelt — dieselbe
        Konvention wie `GET /faecher`/`GET /faecher/:id/themen` — und ins
        Themen-Cache gemerged, damit badge()/label() das Thema danach auch
        synchron finden. */
    getThema: function (id) {
      return GET('/themen/' + id).then(function (t) {
        if (t.stats) {
          t.anzahlChats = t.stats.chats;
          t.anzahlLernzettel = t.stats.lernzettel;
          t.anzahlDateien = t.stats.dateien;
          t.anzahlKlausuren = t.stats.klausuren;
          t.anzahlTestklausuren = t.stats.testklausuren;
        }
        mergeCache(_cache.themen, [t]);
        return t;
      });
    },
    addThema: function (d) {
      return POST('/themen', d);
    },
    /** Synchroner Cache-Lookup für Badges/Labels (wie data.js) — kein Netzwerk-Call. */
    label: label,

    /* Chats -------------------------------------------------------- */
    chats: function (fachId) {
      return GET('/chats' + qs({ fachId: fachId })).then(function (list) {
        return list.map(function (c) { return mitUpdated(c, 'aktualisiertAm'); });
      });
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
      // Mit `extra.onDelta` wird die Antwort gestreamt (Text erscheint live),
      // Ergebnis-Objekt identisch zur JSON-Variante.
      if (extra && extra.onDelta && typeof ReadableStream !== 'undefined' && typeof TextDecoder !== 'undefined') {
        return streamRequest('/chats/' + chatId + '/nachrichten', body, extra.onDelta);
      }
      return POST('/chats/' + chatId + '/nachrichten', body);
    },

    /* Lernzettel ------------------------------------------------- */
    /** Übersichts-Liste (Feeds/Dashboards), ohne Revisionsverlauf. */
    lernzettel: function (themaId) {
      return GET('/lernzettel' + qs({ themaId: themaId })).then(function (list) {
        return list.map(function (l) { return mitUpdated(l, 'aktualisiertAm'); });
      });
    },
    /** Async — voller Inhalt + Revisionsverlauf (Lernzettel-Detailseite). */
    getLernzettel: function (id) {
      return GET('/lernzettel/' + id).then(function (lz) { return mitUpdated(lz, 'aktualisiertAm'); });
    },
    addLernzettel: function (themaId) {
      return POST('/themen/' + themaId + '/lernzettel', {});
    },
    addLernzettelRevision: function (id, text) {
      return POST('/lernzettel/' + id + '/revisionen', { text: text });
    },

    /* Dateien --------------------------------------------------- */
    dateien: function (themaId) {
      return GET('/dateien' + qs({ themaId: themaId })).then(function (list) {
        return list.map(mitDateiForm);
      });
    },
    getDatei: function (id) {
      return GET('/dateien/' + id).then(mitDateiForm);
    },
    /** Direkt navigierbare URL (`<a href>`/`<img src>`) — Token als `?token=`, da kein Authorization-Header möglich ist. */
    dateiInhaltUrl: function (id) {
      return BASE + '/dateien/' + id + '/inhalt?token=' + encodeURIComponent(getToken());
    },
    uploadDatei: function (themaId, file) {
      var fd = new FormData();
      fd.append('datei', file);
      return POST('/themen/' + themaId + '/dateien', fd).then(mitDateiForm);
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
    /** Cached für den sync `lernplanStatus()`-Lookup weiter unten. */
    getLernplan: function (id) {
      return GET('/lernplaene/' + id).then(function (r) {
        _cache.lernplaene[r.id] = r;
        return r;
      });
    },
    getLernplanFuerKlausur: function (klausurId) {
      return GET('/klausuren/' + klausurId + '/lernplan').then(function (r) {
        _cache.lernplaene[r.id] = r;
        return r;
      });
    },
    /** Synchroner Cache-Lookup (wie data.js) — braucht ein vorheriges
        `await Lesify.getLernplan(id)` (o. Ä.). */
    lernplanStatus: lernplanStatus,
    getLernplanChatId: getLernplanChatId,
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
      }).then(function (r) {
        if (_cache.lernplaene[id]) _cache.lernplaene[id].chatMap = r.chatMap;
        return r;
      });
    },
    aktualisiereLernzettel: function (id, themaIds) {
      return POST('/lernplaene/' + id + '/lernzettel', { themaIds: themaIds }).then(function (lz) {
        if (_cache.lernplaene[id]) _cache.lernplaene[id].lernzettel = lz;
        return lz;
      });
    },
    lernzettelDokumentUrl: function (id) {
      return BASE + '/lernplaene/' + id + '/lernzettel/dokument';
    },
    starteTestklausur2: function (lernplanId) {
      return POST('/lernplaene/' + lernplanId + '/testklausur2', {}).then(function (r) {
        _cache.lernplaene[r.id] = r;
        return r;
      });
    },

    /* Testklausuren ------------------------------------------- */
    getTestklausur: function (id) {
      return GET('/testklausuren/' + id).then(reshapeTestklausur);
    },
    addTestklausur: function (d) {
      return POST('/testklausuren', d);
    },
    analysiereTestklausur: function (id) {
      return POST('/testklausuren/' + id + '/analyse', {}).then(reshapeTestklausur);
    },
    loeseTestklausur: function (id, geloesteDateiId) {
      return POST('/testklausuren/' + id + '/loesung', { geloesteDateiId: geloesteDateiId });
    },
    /** Multipart-Upload der Lösung (Foto/Scan/Dokument) — Server extrahiert
        den Text serverseitig synchron und setzt `status: 'geloest'` direkt
        (anders als `loeseTestklausur`, das eine bereits hochgeladene
        `geloesteDateiId` voraussetzt). */
    ladeTestklausurLoesungHoch: function (id, file) {
      var fd = new FormData();
      fd.append('datei', file);
      return POST('/testklausuren/' + id + '/loesung', fd);
    },
    testklausurDokumentUrl: function (id) {
      return BASE + '/testklausuren/' + id + '/dokument';
    },

    /* Usage / Abo ------------------------------------------- */
    /** `resetDatum` kommt vom Server als volles ISO-Datetime (Prisma `Date`),
        `formatDatum()` (app.js) erwartet aber ein reines "YYYY-MM-DD" wie bei
        `Klausur.datum` — hier auf den Datumsteil gekürzt. */
    usage: function () {
      return GET('/usage').then(function (u) {
        if (u.resetDatum) u.resetDatum = String(u.resetDatum).slice(0, 10);
        return u;
      });
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
    reaktivierenAbo: function () {
      return POST('/abo/reaktivieren', {});
    },
    /** Kostenvorschau einer Abo-Änderung (`{sitze|paket|intervall}`), vor `aendernAbo`. */
    aboVorschau: function (aenderung) {
      return GET('/abo/vorschau' + qs(aenderung));
    },
    /** Stripe-Billing-Portal (Zahlungsmethode, offene Rechnung, Belege) → `{url}`. */
    zahlungsportal: function () {
      return POST('/abo/zahlungsportal', {});
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
    /** Wie data.js, plus die Rohdaten (`klassenstufe`, `email`, …) unverändert. */
    getUser: function () {
      return GET('/user').then(function (u) {
        u.klasse = u.klassenstufe;
        u.initials = initialen(u.name);
        // `einwilligungAm` kommt als volles ISO-Datetime — `R.formatDatum()`
        // erwartet "YYYY-MM-DD" wie bei `Klausur.datum` (derselbe Bug wie
        // bei `usage().resetDatum`, siehe api.js `usage()`).
        if (u.einwilligungAm) u.einwilligungAm = String(u.einwilligungAm).slice(0, 10);
        return u;
      });
    },
    /** Nimmt wie data.js `{name, klasse}` entgegen (übersetzt zu `klassenstufe`
        fürs Backend) und spiegelt die Antwort wie `getUser()` (`.klasse`/`.initials`). */
    updateUser: function (patch) {
      var body = {};
      if (patch.name !== undefined) body.name = patch.name;
      if (patch.klasse !== undefined) body.klassenstufe = patch.klasse;
      return PATCH('/user', body).then(function (u) {
        u.klasse = u.klassenstufe;
        u.initials = initialen(u.name);
        return u;
      });
    },
    getSettings: function () {
      return GET('/user/einstellungen');
    },
    updateSettings: function (patch) {
      return PATCH('/user/einstellungen', patch);
    },
    /** DSGVO Art. 17 — hartes Löschen des Kontos (bei `elternteil` inkl.
        aller Kind-Profile). Passwort bestätigt die Anfrage serverseitig. */
    loeschenKonto: function (passwort) {
      return POST('/user/loeschen', { passwort: passwort });
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
    /** Lädt ein PDF (Auth-Header nötig → kein <a href>/<iframe src> direkt) und liefert ein Blob. */
    pdfBlob: function (pfad) {
      return fetch(BASE + pfad, { headers: { Authorization: 'Bearer ' + getToken() } }).then(function (r) {
        if (!r.ok) throw new Error('PDF konnte nicht geladen werden (' + r.status + ')');
        return r.blob();
      });
    },
    _base: BASE,
    /** Elternmodus „Als Kind ansehen" (Phase 12/11): merkt das aktuelle
        (Eltern-)Token, bevor auf die Kind-Session gewechselt wird — sonst
        gäbe es keinen Weg zurück außer komplettem Neu-Login. */
    startElternModus: function (kindToken) {
      try { localStorage.setItem('lesify:elternToken', getToken()); } catch (e) {}
      setToken(kindToken);
    },
    /** Stellt das gemerkte Eltern-Token wieder her. Gibt `true` zurück, wenn
        tatsächlich ein Elternmodus aktiv war. */
    beendeElternModus: function () {
      var t;
      try { t = localStorage.getItem('lesify:elternToken'); } catch (e) { t = null; }
      if (!t) return false;
      setToken(t);
      try { localStorage.removeItem('lesify:elternToken'); } catch (e) {}
      return true;
    },
    /** Sync-Check fürs Elternmodus-Banner (app.js). */
    elternModusAktiv: function () {
      try { return !!localStorage.getItem('lesify:elternToken'); } catch (e) { return false; }
    },
    /** Sync-Snapshot des Fächer-Caches — für geteilte Renderer wie
        `fachFilterChips()`, die (wie im data.js-Prototyp) eine synchrone
        Liste erwarten. Braucht ein vorheriges `await Lesify.faecher()`. */
    _faecherCache: function () { return _cache.faecher.slice(); },

    /* Notenlogik + Klausur-Status (reine Formeln, 1:1 aus data.js) ------- */
    prozentZuNote: prozentZuNote,
    noteLabel: noteLabel,
    noteAmpel: noteAmpel,
    tierLabel: tierLabel,
    AMPEL_GRUEN_MAX_NOTE: AMPEL_GRUEN_MAX_NOTE,
    klausurVergangen: klausurVergangen,

    /* Fach-Farben/-Icons (reine Design-Tokens, 1:1 aus data.js) ---------- */
    FACH_COLORS: FACH_COLORS,
    getFachColor: getFachColor,
    getKindColor: getKindColor,
    FACH_PRESETS: FACH_PRESETS,
    getFachIconSvg: getFachIconSvg,
  };

  window.Lesify = Lesify;
  window.LesifyAPI = Lesify; // eindeutiger Name, falls data.js parallel geladen ist
})();
