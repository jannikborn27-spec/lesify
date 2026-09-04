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

  var params = new URLSearchParams(location.search);
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
  function featureList() {
    if (isFamily) return (CFG.features.family || []).concat(CFG.features[famTier] || []);
    return CFG.features[planKey] || [];
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
  function renderSummary() {
    var t = tier();
    var was = offerOn && t.normal ? t.normal : '';
    var price = was ? '<del>' + was + '</del> ' + t.display : t.display;

    $('co-plan').textContent = planName();
    $('co-price').innerHTML = price;
    $('co-total').innerHTML = price;
    $('btn-amount').textContent = t.display;

    var trial = CFG.trialDays
      ? CFG.trialDays + ' Tage kostenlos testen, danach '
      : '';
    $('co-billing').textContent = trial + (interval === 'yearly'
      ? 'einmal jährlich abgebucht' + (t.perMonth ? ' (entspricht ' + t.perMonth + ' / Monat)' : '') + ', jederzeit kündbar.'
      : 'monatlich abgebucht, jederzeit kündbar.');

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
    stripe = window.Stripe(CFG.publishableKey);
    elements = stripe.elements({
      mode: 'subscription',
      amount: tier().amount,
      currency: CFG.currency,
      appearance: APPEARANCE
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

      // ----- Ab hier bräuchte es das Backend -----
      // POST /abo  { paket, intervall, sitze?, email }
      //   paket: 'starter' | 'premium' | 'infinite'
      //   sitze: nur bei Familien-Paket (2..4), sonst 1
      //   -> Stripe: Customer + Subscription (14 Tage Trial, danach automatische
      //      Abbuchung) anlegen, erste Rechnung
      //   -> { clientSecret, subscriptionId } zurückgeben
      // stripe.confirmPayment({ elements, clientSecret,
      //   confirmParams: { return_url: location.origin + '/checkout-erfolg.html' } })

      if (CFG.mode === 'demo') {
        message('Zahlungsdaten sind gültig und wurden von Stripe akzeptiert. Im Prototyp fehlt der Server-Schritt, der das Abo bei Stripe anlegt — es wird nichts belastet. Ablauf: Konzept-texts/backend-planning.md §4 (Abo & Abrechnung).', 'info');
        $('submit').innerHTML = 'Validiert &mdash; Server-Schritt fehlt';
        setLoading(false);
        return;
      }

      // Echt-Betrieb (mit Backend):
      fetch('/abo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paket: isFamily ? famTier : planKey,
          intervall: interval === 'yearly' ? 'jaehrlich' : 'monatlich',
          sitze: isFamily ? famSeats : 1,
          email: email
        })
      }).then(function (r) { return r.json(); }).then(function (data) {
        return stripe.confirmPayment({
          elements: elements,
          clientSecret: data.clientSecret,
          confirmParams: { return_url: location.origin + location.pathname.replace('checkout.html', 'checkout-erfolg.html') }
        });
      }).then(function (res) {
        if (res && res.error) message(res.error.message, 'error');
        setLoading(false);
      }).catch(function () {
        message('Die Zahlung konnte nicht abgeschlossen werden. Bitte später erneut versuchen.', 'error');
        setLoading(false);
      });
    });
  });

  renderSummary();
  initStripe();
})();
