/* =========================================================
   Lesify — Tracking (Google Tag Manager + Meta Pixel) hinter Cookie-Banner
   ---------------------------------------------------------
   Einbindung im <head> jeder Marketing-Seite, VOR dem CookieScript-Banner:
     <script src="/assets/js/tracking.js"></script>
     <script src="https://cdn.cookie-script.com/s/9f424c32a196280ac768a522861c201c.js" charset="UTF-8"></script>

   Entscheidung 2026-09-28 (Werbestart):
   - Nichts lädt ohne Einwilligung (§25 TDDDG/DSGVO). CookieScript
     (Google Consent Mode v2 im Banner aktiviert) setzt die Consent-
     Defaults „denied" und die Updates in den dataLayer selbst.
   - GTM lädt erst, wenn „Performance" ODER „Targeting" erlaubt ist;
     Google-Tags im Container respektieren dann den Consent-Status
     (analytics_storage ← Performance, ad_* ← Targeting).
   - Meta Pixel lädt nur mit „Targeting".
   - Die <noscript>-Fallbacks von GTM/Pixel sind bewusst weggelassen:
     ohne JS gibt es keinen Banner, also keine Einwilligung.
   - Seiten mit Geheimnissen in der URL (passwort-zuruecksetzen/,
     email-bestaetigen/ → ?token=…) binden dieses Skript nicht ein;
     Stripes Redirect-Parameter (…client_secret) werden vor dem Laden
     aus der Adresszeile entfernt.
   - Die eingeloggte App (/app, Schüler ab Klasse 5) trackt nie.

   Funnel-Events (Aufruf über LesifyTrack.event(name, daten)):
     registrierung  → Meta CompleteRegistration · dataLayer sign_up
     kasse          → Meta InitiateCheckout     · dataLayer begin_checkout
     zahlungsdaten  → Meta AddPaymentInfo       · dataLayer add_payment_info
     testphase      → Meta StartTrial           · dataLayer start_trial
                      + zusätzlich immer „kauf" (Purchase / purchase)
     kauf           → Meta Purchase             · dataLayer purchase
     preise         → Meta ViewContent          · dataLayer view_item_list
     kontakt        → Meta Contact              · dataLayer generate_lead
   Events vor einer Seiten-Weiterleitung (z. B. Registrierung → Kasse)
   mit { nachWeiterleitung: true } — sie werden in sessionStorage geparkt
   und auf der nächsten Seite gesendet, damit der Seitenwechsel sie nicht
   abbricht.
   ========================================================= */
(function () {
  'use strict';

  var GTM_ID = 'GTM-TV2V88K3';
  var META_PIXEL_ID = '1905437307533207';
  var PARK_KEY = 'lesify:track:geparkt';

  // Nur auf der echten Domain tracken — lokal / Cloudflare-Testdomains
  // nicht (verfälscht sonst die Kampagnendaten). ?tracking=1 schaltet es
  // für den Tab ein (Test mit Meta-Pixel-Helper / GTM-Vorschau).
  var aktiv = /(^|\.)lesify\.de$/.test(location.hostname);
  try {
    if (/[?&]tracking=1\b/.test(location.search)) sessionStorage.setItem('lesify:track:test', '1');
    if (sessionStorage.getItem('lesify:track:test') === '1') aktiv = true;
  } catch (e) { /* kein sessionStorage */ }

  window.dataLayer = window.dataLayer || [];

  /* Stripe hängt nach Redirect-Zahlungsarten Client Secrets an die URL
     (checkout-erfolg/) — die sollen nie in GA/Meta landen. */
  (function stripeParameterEntfernen() {
    var p = new URLSearchParams(location.search);
    var weg = ['setup_intent', 'setup_intent_client_secret', 'payment_intent', 'payment_intent_client_secret', 'redirect_status'];
    var gefunden = weg.filter(function (k) { return p.has(k); });
    if (!gefunden.length || !window.history || !history.replaceState) return;
    gefunden.forEach(function (k) { p.delete(k); });
    var qs = p.toString();
    history.replaceState(history.state, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  })();

  /* ---------- Einwilligung (CookieScript) ---------- */
  var erlaubt = { performance: false, targeting: false };

  function consentLesen() {
    var cs = window.CookieScript && window.CookieScript.instance;
    if (!cs || typeof cs.currentState !== 'function') return;
    var st = cs.currentState() || {};
    var kat = st.action === 'accept' && st.categories ? st.categories : [];
    erlaubt.performance = kat.indexOf('performance') !== -1;
    erlaubt.targeting = kat.indexOf('targeting') !== -1;
    anwenden();
  }

  function anwenden() {
    if (!aktiv) return;
    if (erlaubt.performance || erlaubt.targeting) gtmLaden();
    if (erlaubt.targeting) {
      pixelLaden();
      if (window.fbq) window.fbq('consent', 'grant');
    } else if (window.fbq) {
      window.fbq('consent', 'revoke');
    }
    metaWarteschlangeSenden();
  }

  ['CookieScriptLoaded', 'CookieScriptAccept', 'CookieScriptAcceptAll', 'CookieScriptReject'].forEach(function (ev) {
    window.addEventListener(ev, consentLesen);
  });
  // Falls CookieScript schon vor diesem Skript lief (Reihenfolge vertauscht).
  consentLesen();

  /* ---------- Google Tag Manager ---------- */
  var gtmGeladen = false;
  function gtmLaden() {
    if (gtmGeladen) return;
    gtmGeladen = true;
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtm.js?id=' + GTM_ID;
    document.head.appendChild(s);
  }

  /* ---------- Meta Pixel (Original-Basiscode von Meta) ---------- */
  var pixelGeladen = false;
  function pixelLaden() {
    if (pixelGeladen) return;
    pixelGeladen = true;
    /* eslint-disable */
    !function(f,b,e,v,n,t,s)
    {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', META_PIXEL_ID);
    window.fbq('track', 'PageView');
  }

  /* ---------- Events ---------- */
  var EVENTS = {
    registrierung: { meta: 'CompleteRegistration', ga: 'sign_up' },
    kasse:         { meta: 'InitiateCheckout',     ga: 'begin_checkout' },
    zahlungsdaten: { meta: 'AddPaymentInfo',       ga: 'add_payment_info' },
    testphase:     { meta: 'StartTrial',           ga: 'start_trial' },
    kauf:          { meta: 'Purchase',             ga: 'purchase' },
    preise:        { meta: 'ViewContent',          ga: 'view_item_list' },
    kontakt:       { meta: 'Contact',              ga: 'generate_lead' }
  };

  // Meta-Events, bis „Targeting" erlaubt ist (Seite bleibt offen, Nutzer
  // stimmt nach dem Event zu). Ohne Zustimmung verfallen sie mit der Seite.
  var metaWarteschlange = [];
  function metaWarteschlangeSenden() {
    if (!erlaubt.targeting || !window.fbq) return;
    while (metaWarteschlange.length) {
      var e = metaWarteschlange.shift();
      window.fbq('track', e.name, e.daten, { eventID: e.id });
    }
  }

  function eventId() {
    return 'ev_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  /* daten: { value (Euro), currency, plan, interval, seats, transactionId, method } */
  function senden(name, daten) {
    var def = EVENTS[name];
    if (!def || !aktiv) return;
    daten = daten || {};
    var id = daten.transactionId || eventId();

    var item = daten.plan ? {
      item_id: daten.plan + (daten.seats > 1 ? '-' + daten.seats : '') + '-' + (daten.interval || 'monthly'),
      item_name: daten.name || daten.plan,
      item_category: daten.seats > 1 ? 'Familien-Paket' : 'Einzelplatz',
      item_variant: daten.interval === 'yearly' ? 'jaehrlich' : 'monatlich',
      price: daten.value,
      quantity: 1
    } : null;

    // dataLayer (GTM) — landet auch vor der Einwilligung hier; GTM
    // arbeitet ihn beim späteren Laden ab und beachtet dabei den Consent.
    var dl = { event: def.ga, event_id: id };
    if (daten.method) dl.method = daten.method;
    if (daten.value != null) {
      dl.ecommerce = {
        currency: daten.currency || 'EUR',
        value: daten.value,
        items: item ? [item] : []
      };
      if (daten.transactionId) dl.ecommerce.transaction_id = daten.transactionId;
      window.dataLayer.push({ ecommerce: null }); // alten ecommerce-Stand leeren (GA4-Empfehlung)
    }
    window.dataLayer.push(dl);

    // Meta
    var meta = {};
    if (daten.value != null) {
      meta.value = daten.value;
      meta.currency = daten.currency || 'EUR';
    }
    if (item) {
      meta.content_ids = [item.item_id];
      meta.content_name = item.item_name;
      meta.content_type = 'product';
    }
    if (name === 'testphase') meta.predicted_ltv = daten.value;
    metaWarteschlange.push({ name: def.meta, daten: meta, id: id });
    metaWarteschlangeSenden();

    // Entscheidung 2026-09-28: Testphase-Start zählt zusätzlich als Kauf
    // (Meta Purchase + dataLayer purchase), damit Kampagnen auf „Purchase"
    // optimieren können. Google Ads zählt die Conversion nur auf `purchase`.
    if (name === 'testphase') senden('kauf', daten);
  }

  function event(name, daten, opt) {
    if (opt && opt.nachWeiterleitung) {
      try {
        var liste = JSON.parse(sessionStorage.getItem(PARK_KEY) || '[]');
        liste.push({ name: name, daten: daten || {} });
        sessionStorage.setItem(PARK_KEY, JSON.stringify(liste));
        return;
      } catch (e) { /* kein sessionStorage → sofort senden */ }
    }
    senden(name, daten);
  }

  // Geparkte Events der vorigen Seite nachholen.
  try {
    var geparkt = JSON.parse(sessionStorage.getItem(PARK_KEY) || '[]');
    sessionStorage.removeItem(PARK_KEY);
    geparkt.forEach(function (e) { senden(e.name, e.daten); });
  } catch (e) { /* ignorieren */ }

  /* ---------- Tarifauswahl aus der URL → Event-Daten ----------
     Gleiche Normalisierung wie checkout.js (plan/interval/tier/seats).
     Braucht window.LESIFY_PAYMENTS (stripe-config.js). */
  function aboAuswahl(search) {
    var CFG = window.LESIFY_PAYMENTS;
    if (!CFG) return null;
    var p = new URLSearchParams(search == null ? location.search : search);
    var plan = p.get('plan');
    var interval = p.get('interval') === 'yearly' ? 'yearly' : 'monthly';
    var isFamily = plan === 'family' || plan === 'familie';
    var t;
    var seats = 1;
    if (isFamily) {
      plan = CFG.family.tiers[p.get('tier')] ? p.get('tier') : 'premium';
      seats = parseInt(p.get('seats'), 10);
      if (CFG.family.seatOptions.indexOf(seats) < 0) seats = 3;
      t = CFG.family.tiers[plan][seats][interval];
    } else {
      if (!CFG.plans[plan]) plan = 'premium';
      t = CFG.plans[plan][interval];
    }
    return {
      plan: plan,
      name: 'Lesify ' + CFG.plans[plan].name + (isFamily ? ' Familie (' + seats + ' Kinder)' : ''),
      interval: interval,
      seats: seats,
      value: t.amount / 100,
      currency: (CFG.currency || 'eur').toUpperCase()
    };
  }

  /* ---------- Seitenbezogene Events ohne eigenen Code in der Seite ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    if (document.body.getAttribute('data-page') === 'preise') senden('preise', {});
  });

  /* Footer-/Textlink „Cookie-Einstellungen" (href="#cookie-einstellungen")
     öffnet den Banner erneut — Widerruf so einfach wie die Einwilligung. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href="#cookie-einstellungen"]');
    if (!a) return;
    e.preventDefault();
    var cs = window.CookieScript && window.CookieScript.instance;
    if (cs && typeof cs.show === 'function') cs.show();
  });

  window.LesifyTrack = { event: event, aboAuswahl: aboAuswahl };
})();
