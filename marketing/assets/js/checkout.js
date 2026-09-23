/* =========================================================
   Lesify — Kasse
   Echtes Stripe Payment Element (deferred / subscription mode),
   getrieben nur vom Publishable Key. Validiert live; der
   abschließende Server-Schritt (Abo bei Stripe anlegen ->
   clientSecret -> stripe.confirmPayment) fehlt im Prototyp
   und ist in backend-planning.md §4 (Abo & Abrechnung) beschrieben.
   ========================================================= */
(function () {
  'use strict';

  var CFG = window.LESIFY_PAYMENTS || {};
  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

  // `api/` läuft seit 2026-09-14 produktiv auf Railway (siehe UMSETZUNGSPLAN.md
  // Phase 16) — API_BASE zeigt auf lesify.de jetzt automatisch dorthin. Das
  // frühere `CFG.mode === 'demo'`-Gate (kein Server-Aufruf auf der öffentlichen
  // Seite) ist entfernt (Entscheidung 2026-09-14, siehe UMSETZUNGSPLAN.md
  // Abschnitt „Geld") — die Kasse ruft jetzt überall echt `POST /abo` auf.
  // Stripe läuft dabei im Test-Modus (`pk_test_…`/`sk_test_…`), es wird
  // nirgends echtes Geld bewegt.
  var PROD_API_BASE = 'https://lesify-production.up.railway.app';
  var istProdHost = /(^|\.)lesify\.(de|pages\.dev)$/.test(location.hostname); // .pages.dev = Cloudflare-Testdomain
  var API_BASE = (
    window.LESIFY_API_BASE || (istProdHost ? PROD_API_BASE : 'http://localhost:3000')
  ).replace(/\/$/, '');
  var TOKEN_KEY = 'lesify:token';
  function sessionToken() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }

  // Ohne Konto sofort zur Registrierung (Eltern-only, siehe registrieren/) —
  // nicht erst nach dem Ausfüllen der Zahlungsdaten scheitern lassen. Die
  // volle Auswahl (plan/interval/tier/seats) reist per Querystring mit;
  // auth-forms.js trägt sie nach der Registrierung hierher zurück.
  if (!sessionToken()) {
    location.href = '/registrieren/' + location.search;
    return;
  }

  var params = new URLSearchParams(location.search);
  // Abschluss ohne Testphase — nach „Zahlungsmittel hatte schon eine
  // Testphase" (Entscheidung 2026-09-23: Testphase einmal je Zahlungsmittel).
  var ohneTestphase = params.get('ohne_testphase') === '1';
  var planKey = params.get('plan');
  var interval = params.get('interval') === 'yearly' ? 'yearly' : 'monthly';

  // Einzelplatz (starter|premium|infinite) oder Familien-Paket (plan=family).
  var isFamily = planKey === 'family' || planKey === 'familie';
  var famTier = params.get('tier');
  var famSeats = parseInt(params.get('seats'), 10);

  if (isFamily) {
    if (!CFG.family || !CFG.family.tiers[famTier]) famTier = 'premium';
    if (CFG.family.seatOptions.indexOf(famSeats) < 0) famSeats = 3;
    planKey = 'family';
  } else if (!CFG.plans || !CFG.plans[planKey]) {
    planKey = 'premium';
  }

  var $ = function (id) { return document.getElementById(id); };

  // Aktueller Preis-Datensatz { amount, display, normal?, perMonth?, normalPerMonth? }.
  function tier() {
    return isFamily
      ? CFG.family.tiers[famTier][famSeats][interval]
      : CFG.plans[planKey][interval];
  }
  var TIER_NAME = { starter: 'Starter', premium: 'Premium', infinite: 'Infinite' };
  function planName() {
    if (isFamily) return 'Familie · ' + (TIER_NAME[famTier] || famTier) + ' · ' + famSeats + ' Kinder';
    return CFG.plans[planKey].name;
  }
  // Dieselben Tarif-Checks wie beim Einzelplatz — die Familien-spezifischen
  // Punkte (eigenes Profil je Kind, eine Rechnung, …) stehen schon auf
  // /preise/, hier reicht die kleine Ergänzung "pro Kind" an jedem Punkt
  // (Entscheidung 2026-09-18: vorher ein eigener, 4 Punkte längerer
  // Marketing-Block statt derselben Liste).
  function featureList() {
    var basis = CFG.features[isFamily ? famTier : planKey] || [];
    if (!isFamily) return basis;
    return basis.map(function (f) { return f + ' pro Kind'; });
  }

  var APPEARANCE = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#101214',
      colorBackground: '#ffffff',
      colorText: '#172128',
      colorTextSecondary: '#516676',
      colorTextPlaceholder: '#889ba9',
      colorDanger: '#c1443c',
      fontFamily: '"Hanken Grotesk", "Outfit", system-ui, sans-serif',
      fontSizeBase: '15px',
      borderRadius: '12px',
      spacingUnit: '4px'
    },
    rules: {
      '.Input': { border: '1px solid #aab8c3', boxShadow: 'none', padding: '12px 14px' },
      '.Input:focus': { border: '1px solid #172128', boxShadow: '0 0 0 3px rgba(16,18,20,0.08)' },
      '.Input--invalid': { border: '1px solid #c1443c', boxShadow: 'none' },
      '.Label': { fontWeight: '600', color: '#25343f', marginBottom: '6px' },
      '.Tab': { border: '1px solid #d8dee3', boxShadow: 'none' },
      '.Tab:hover': { borderColor: '#889ba9' },
      '.Tab--selected': { borderColor: '#101214', boxShadow: 'none', backgroundColor: '#edf1f3' },
      '.Tab--selected:focus': { boxShadow: '0 0 0 3px rgba(16,18,20,0.08)' }
    }
  };

  var offerOn = !!(CFG.offer && CFG.offer.active);

  /* ---------- Zusammenfassung rendern ---------- */
  // Bei Jährlich zeigt die "Abo"-Zeile jetzt den Monatspreis (wie auf
  // /preise/, `priceAmount()` in marketing.js — dort ist "X € / Monat"
  // schon immer die prominente Zahl, egal ob monatlich oder jährlich
  // abgerechnet wird) statt nur den einmaligen Jahresbetrag zu wiederholen,
  // der weiter unten in "Nach der Testphase fällig" ohnehin schon steht.
  // Entscheidung 2026-09-18: vorher stand oben UND unten derselbe
  // Jahresbetrag, der Monatspreis nur als Klammerzusatz im Fließtext.
  function renderSummary() {
    var t = tier();
    var monthly = interval === 'yearly' ? t.perMonth : t.display;
    var monthlyWas = interval === 'yearly' ? t.normalPerMonth : t.normal;
    var priceHtml = (offerOn && monthlyWas ? '<del>' + monthlyWas + '</del> ' : '') + monthly;
    if (interval === 'yearly') priceHtml += ' <span class="co-unit">/ Monat</span>';

    var totalWas = offerOn && t.normal ? t.normal : '';
    var totalHtml = (totalWas ? '<del>' + totalWas + '</del> ' : '') + t.display;

    $('co-plan').textContent = planName();
    $('co-price').innerHTML = priceHtml;
    $('co-total').innerHTML = totalHtml;
    $('btn-amount').textContent = t.display;

    var trial = CFG.trialDays && !ohneTestphase
      ? CFG.trialDays + ' Tage kostenlos testen, danach '
      : 'Sofort fällig, danach ';
    if (ohneTestphase) {
      $('co-total-label').textContent = 'Heute fällig';
      $('btn-prefix').textContent = 'Zahlungspflichtig abschließen ·';
      $('co-sub').textContent = 'Das Abo startet sofort ohne Testphase, der erste Betrag wird direkt abgebucht. Kündigen kannst du in den Kontoeinstellungen.';
    }
    $('co-billing').textContent = trial + (interval === 'yearly'
      ? t.display + ' einmal jährlich abgebucht, jährlich kündbar.'
      : 'monatlich abgebucht, monatlich kündbar.');

    $('co-feats').innerHTML = featureList().map(function (f) {
      return '<li>' + CHECK + '<span>' + f + '</span></li>';
    }).join('');
    document.querySelectorAll('[data-co-interval] button').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-int') === interval);
    });
  }

  /* ---------- Stripe ---------- */
  var stripe, elements, ready = false;

  function message(text, kind) {
    var el = $('payment-message');
    el.textContent = text;
    el.className = 'co-message is-visible' + (kind ? ' co-message--' + kind : '');
  }
  function clearMessage() { $('payment-message').className = 'co-message'; }

  function setLoading(on) {
    var btn = $('submit');
    btn.disabled = on;
    btn.classList.toggle('is-loading', on);
  }

  function initStripe() {
    if (typeof window.Stripe !== 'function') {
      message('Stripe konnte nicht geladen werden. Bitte die Seite über einen lokalen Server öffnen (z. B. „python3 -m http.server"), nicht per file://.', 'error');
      $('submit').disabled = true;
      return;
    }
    // `locale: 'de'` fest statt Stripes Browser-Auto-Erkennung — sonst
    // rutschen Stripe-eigene Texte (z. B. Kartenablehnungs-Meldungen) auf
    // Englisch durch, obwohl der Rest der Kasse Deutsch ist.
    stripe = window.Stripe(CFG.publishableKey, { locale: 'de' });
    elements = stripe.elements({
      mode: 'subscription',
      amount: tier().amount,
      currency: CFG.currency,
      appearance: APPEARANCE,
      // Ohne Link: Lesify hat nur ein Produkt (ein Abo pro Konto), also
      // keinen Vorteil aus „für nächstes Mal speichern" — nur ein
      // zusätzliches optionales Feld, das Reibung in der Kasse erzeugt.
      // Muss dieselbe Liste wie `payment_settings.payment_method_types`
      // in `zahlung.ts` sein — hier ohne PaymentIntent noch unbekannt,
      // welche Methoden das Konto sonst anbieten würde.
      paymentMethodTypes: ['card', 'paypal', 'klarna', 'amazon_pay']
    });
    var paymentElement = elements.create('payment', { layout: 'tabs' });
    paymentElement.on('ready', function () { ready = true; });
    paymentElement.on('loaderror', function (ev) {
      message((ev && ev.error && ev.error.message) || 'Das Zahlungsformular konnte nicht geladen werden.', 'error');
    });
    paymentElement.mount('#payment-element');
  }

  function updateAmount() {
    if (elements) { try { elements.update({ amount: tier().amount }); } catch (e) {} }
  }

  /* ---------- Intervall-Umschalter ---------- */
  document.querySelectorAll('[data-co-interval] button').forEach(function (b) {
    b.addEventListener('click', function () {
      interval = b.getAttribute('data-int');
      var u = new URL(location.href);
      u.searchParams.set('plan', planKey);
      if (isFamily) { u.searchParams.set('tier', famTier); u.searchParams.set('seats', String(famSeats)); }
      u.searchParams.set('interval', interval);
      history.replaceState(null, '', u);
      renderSummary();
      updateAmount();
    });
  });

  /* ---------- Absenden ---------- */
  $('payment-form').addEventListener('submit', function (e) {
    e.preventDefault();
    clearMessage();

    if (!elements) { message('Zahlungsformular ist noch nicht bereit.', 'error'); return; }
    var email = $('co-email').value.trim();
    if (!email || email.indexOf('@') < 1) { message('Bitte eine gültige E-Mail-Adresse eingeben.', 'error'); $('co-email').focus(); return; }

    setLoading(true);

    elements.submit().then(function (result) {
      if (result.error) {
        message(result.error.message || 'Bitte Zahlungsdaten prüfen.', 'error');
        setLoading(false);
        return;
      }

      var token = sessionToken();
      if (!token) {
        message('Zum Abschließen zuerst registrieren/anmelden — die Kasse braucht ein Konto, dem sie das Abo zuordnet.', 'error');
        setLoading(false);
        return;
      }

      // Echt-Betrieb: Abo bei Stripe anlegen (Customer + Subscription, 14 Tage
      // Trial), Client Secret zurückbekommen und die Zahlungsdaten bestätigen.
      fetch(API_BASE + '/abo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          paket: isFamily ? famTier : planKey,
          intervall: interval === 'yearly' ? 'jaehrlich' : 'monatlich',
          sitze: isFamily ? famSeats : 1,
          email: email,
          ohneTestphase: ohneTestphase
        })
      }).then(function (r) {
        if (!r.ok) return r.json().then(function (d) { throw new Error(d.fehler || 'anlegen_fehlgeschlagen'); });
        return r.json();
      }).then(function (data) {
        if (!data.clientSecret) throw new Error('kein_client_secret');
        // Auswahl mitgeben: checkout-erfolg/ braucht sie für „ohne Testphase
        // abschließen", falls die Prüfung nach einem Redirect ablehnt.
        var returnUrl = location.origin + '/checkout-erfolg/' + location.search;
        // Bei Trial ohne Sofortbelastung liefert Stripe ein SetupIntent
        // (Präfix `seti_…`) statt eines PaymentIntent (`pi_…`) — je nachdem
        // ruft man confirmSetup oder confirmPayment.
        var istSetup = data.clientSecret.indexOf('seti_') === 0;
        var confirm = istSetup ? stripe.confirmSetup : stripe.confirmPayment;
        // `if_required`: Karten bleiben auf der Seite, damit wir vor der
        // Weiterleitung noch prüfen können, ob das Zahlungsmittel schon eine
        // Testphase hatte. Redirect-Zahlungsarten (PayPal, …) prüft
        // checkout-erfolg/ nach der Rückkehr.
        return confirm.call(stripe, {
          elements: elements,
          clientSecret: data.clientSecret,
          confirmParams: { return_url: returnUrl },
          redirect: 'if_required'
        }).then(function (res) {
          if (res && res.error) return res;
          if (!istSetup) { location.href = returnUrl; return null; }
          return fetch(API_BASE + '/abo/testphase-pruefen', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + token }
          }).then(function (r) {
            if (r.status === 409) { testphaseAbgelehnt(); return null; }
            location.href = returnUrl;
            return null;
          });
        });
      }).then(function (res) {
        if (res && res.error) message(res.error.message, 'error');
        setLoading(false);
      }).catch(function (err) {
        // Echter Fehlercode landet in der Konsole (Popup bleibt bewusst generisch) —
        // z. B. `kein_client_secret`, wenn Stripe keinen SetupIntent ausstellt.
        console.error('[checkout] Abo/Zahlung fehlgeschlagen:', err);
        message(err && err.message === 'abo_vorhanden'
          ? 'Für dieses Konto besteht bereits ein Abo.'
          : 'Die Zahlung konnte nicht abgeschlossen werden. Bitte später erneut versuchen.', 'error');
        setLoading(false);
      });
    });
  });

  /* Zahlungsmittel hatte schon eine Testphase → Abschluss abgelehnt (das
     angelegte Abo ist serverseitig bereits wieder entfernt, nichts abgebucht). */
  function testphaseAbgelehnt() {
    var el = $('payment-message');
    el.className = 'co-message is-visible co-message--error';
    el.innerHTML = 'Mit diesem Zahlungsmittel wurde bereits eine kostenlose Testphase genutzt — ' +
      'eine zweite ist nicht möglich. Es wurde nichts abgebucht. ' +
      '<a href="' + ohneTestphaseHref() + '">Lesify ohne Testphase abschließen</a>';
  }
  function ohneTestphaseHref() {
    var u = new URL(location.href);
    u.searchParams.set('ohne_testphase', '1');
    return u.pathname + u.search;
  }
  window.LesifyCheckout = { ohneTestphaseHref: ohneTestphaseHref };

  renderSummary();
  initStripe();
})();
