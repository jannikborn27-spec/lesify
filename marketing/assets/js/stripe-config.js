/* =========================================================
   Lesify — Stripe-Konfiguration (Frontend)
   ---------------------------------------------------------
   Der Publishable Key ist bewusst öffentlich — er darf im
   Client-Code stehen. Der Secret Key (`sk_test_…`) gehört
   NIEMALS ins Frontend; er lebt nur im späteren Backend
   (siehe Konzept-texts/backend-planning.md §7a).

   `mode` ist rein informativ (`'test'`/`'live'`, muss zum Präfix von
   `publishableKey`/serverseitigem `STRIPE_SECRET_KEY` passen) — steuert
   seit 2026-09-14 nichts mehr im Code. `api/` läuft produktiv auf Railway,
   die Kasse löst überall (lokal wie auf lesify.de) echt `POST /abo` aus
   (siehe `checkout.js`).

   Preis-Modell (Design-Platzhalter, nicht final — die Werte
   spiegeln die Pricing-Tabelle in backend-planning.md §1/§7):

   - Drei Einzelplatz-Tarife: Starter · Premium (Bestseller) · Infinite.
     Kein dauerhaft kostenloser Tarif mehr — stattdessen 14 Tage
     kostenlos testen. Tarif + Zahlungsart werden bei der
     Registrierung gewählt; nach 14 Tagen bucht Stripe automatisch
     ab, sofern nicht vorher gekündigt.
   - Aktuelles Angebot: −20 % zum Schuljahresstart. Der Angebots-
     preis ist der aktuell berechnete Preis; der Normalpreis wird
     nur durchgestrichen daneben gezeigt.
   - Familien-Pakete: Tarif × 2/3/4 Sitzplätze. Jeder Sitz bekommt
     das VOLLE Monatskontingent seines Tarifs; Nutzung wird nicht
     zwischen den Sitzen geteilt und nicht übertragen.
   - `amount` = erste fällige Rechnung in Cent (Angebotspreis):
     bei `monthly` der Monatsbetrag, bei `yearly` der Jahresbetrag.
   - Preis-IDs (price_…) werden serverseitig aus dem Stripe-
     Dashboard gezogen, nicht im Client gebraucht.
   ========================================================= */
window.LESIFY_PAYMENTS = {
  publishableKey: 'pk_test_51UAoE2IW4ucZsEH2zDkqHECbDOhvEeZzO1sDn83pore6Ce08nvTse86CMNDcJtjDiixaDrNdd5dcVdl80OXJCzkw00zHB5Sbs8',
  currency: 'eur',
  mode: 'test',

  /* Kostenlose Testphase statt kostenlosem Tarif. Danach automatische
     Abbuchung des gewählten Tarifs (Stripe Trial → Subscription). */
  trialDays: 14,

  /* Aktuelles Rabatt-Angebot. `active: false` schaltet die
     Streichpreise seitenweit ab (dann gilt der Normalpreis). */
  offer: {
    active: true,
    percent: 20,
    label: '−20 % zum Schuljahresstart',
    note: 'Angebot zum Schuljahresstart — Normalpreis durchgestrichen.'
  },

  /* ---- Einzelplätze (Preistabelle final, Stand 2026-09-14) ---- */
  plans: {
    starter: {
      name: 'Starter',
      desc: 'Der Einstieg für ein Fach mit klarer Struktur.',
      monthly: { amount: 1599,  display: '15,99 €',  normal: '19,99 €' },
      yearly:  { amount: 15588, display: '155,88 €', normal: '239,88 €', perMonth: '12,99 €', normalPerMonth: '19,99 €' }
    },
    premium: {
      name: 'Premium',
      badge: 'Bestseller',
      desc: 'Alles für ein Schuljahr mit Plan.',
      monthly: { amount: 1999,  display: '19,99 €',  normal: '24,99 €' },
      yearly:  { amount: 19188, display: '191,88 €', normal: '299,88 €', perMonth: '15,99 €', normalPerMonth: '24,99 €' }
    },
    infinite: {
      name: 'Infinite',
      desc: 'Kein Nachdenken über Kontingente.',
      monthly: { amount: 3599,  display: '35,99 €',  normal: '44,99 €' },
      yearly:  { amount: 33588, display: '335,88 €', normal: '539,88 €', perMonth: '27,99 €', normalPerMonth: '44,99 €' }
    }
  },

  /* ---- Familien-Pakete: Tarif × Sitzplätze (Preistabelle final, Stand
     2026-09-14) ---- Jeder Sitz = ein eigenes Kind-Profil mit dem vollen
     Monatskontingent des Tarifs (`limits` unten). */
  family: {
    seatOptions: [2, 3, 4],
    tiers: {
      starter: {
        2: { monthly: { amount: 2899,  display: '28,99 €',  normal: '32,99 €'  }, yearly: { amount: 27588,  display: '275,88 €', normal: '359,88 €', perMonth: '22,99 €', normalPerMonth: '29,99 €' } },
        3: { monthly: { amount: 4199,  display: '41,99 €',  normal: '45,99 €'  }, yearly: { amount: 39588,  display: '395,88 €', normal: '479,88 €', perMonth: '32,99 €', normalPerMonth: '39,99 €' } },
        4: { monthly: { amount: 5499,  display: '54,99 €',  normal: '58,99 €'  }, yearly: { amount: 51588,  display: '515,88 €', normal: '599,88 €', perMonth: '42,99 €', normalPerMonth: '49,99 €' } }
      },
      premium: {
        2: { monthly: { amount: 3599,  display: '35,99 €',  normal: '40,99 €'  }, yearly: { amount: 33188,  display: '331,88 €', normal: '443,88 €', perMonth: '27,66 €', normalPerMonth: '36,99 €' } },
        3: { monthly: { amount: 5199,  display: '51,99 €',  normal: '56,99 €'  }, yearly: { amount: 47588,  display: '475,88 €', normal: '587,88 €', perMonth: '39,66 €', normalPerMonth: '48,99 €' } },
        4: { monthly: { amount: 6799,  display: '67,99 €',  normal: '72,99 €'  }, yearly: { amount: 61988,  display: '619,88 €', normal: '731,88 €', perMonth: '51,66 €', normalPerMonth: '60,99 €' } }
      },
      infinite: {
        2: { monthly: { amount: 6499,  display: '64,99 €',  normal: '73,99 €'  }, yearly: { amount: 59988,  display: '599,88 €',   normal: '803,88 €',   perMonth: '49,99 €', normalPerMonth: '66,99 €'  } },
        3: { monthly: { amount: 9399,  display: '93,99 €',  normal: '102,99 €' }, yearly: { amount: 86388,  display: '863,88 €',   normal: '1.067,88 €', perMonth: '71,99 €', normalPerMonth: '88,99 €'  } },
        4: { monthly: { amount: 12299, display: '122,99 €', normal: '131,99 €' }, yearly: { amount: 112788, display: '1.127,88 €', normal: '1.331,88 €', perMonth: '93,99 €', normalPerMonth: '110,99 €' } }
      }
    }
  },

  /* ---- Monatskontingente pro Sitz (null = unbegrenzt) ----
     Einzige Quelle für die Grenzen in der App (assets/js/data.js
     spiegelt exakt diese Werte). */
  limits: {
    starter:  { contentAufnahmen: 20,  chatNachrichten: 100,  lernzettel: 5,  testklausuren: 1  },
    premium:  { contentAufnahmen: 50,  chatNachrichten: 250,  lernzettel: 15, testklausuren: 5  },
    infinite: { contentAufnahmen: 100, chatNachrichten: null, lernzettel: 50, testklausuren: 15 }
  },

  /* ---- Interne Planungswerte (NICHT auf der Seite anzeigen) ----
     API-Kosten und LTV je Sitz und Monat in €. */
  economics: {
    starter:  { apiCostMonth: 1.57,  ltv: 110 },
    premium:  { apiCostMonth: 4.13,  ltv: 130 },
    infinite: { apiCostMonth: 11.28, ltv: 180 }
  },

  /* Deckt sich 1:1 mit den `feats` der Preiskarten (marketing.js
     `PRICE.plans[].feats`) — hier nicht eigenständig pflegen, bei
     Änderung an den Karten diese Liste mitziehen. */
  features: {
    starter: [
      '100 KI-Nachrichten / Monat',
      '20 Dokumente / Monat',
      '1 Klausurvorbereitung / Monat'
    ],
    premium: [
      '250 KI-Nachrichten / Monat',
      '50 Dokumente / Monat',
      '5 Klausurvorbereitungen / Monat'
    ],
    infinite: [
      'Unbegrenzt KI-Nachrichten',
      '100 Dokumente / Monat',
      '15 Klausurvorbereitungen / Monat'
    ],
    family: [
      'Ein eigenes Profil je Kind, getrennte Fächer & Fortschritte',
      'Volles Monatskontingent des Tarifs pro Kind — nichts wird geteilt',
      'Wöchentliche Zusammenfassung für Eltern',
      'Eine Rechnung für alle Sitzplätze'
    ]
  }
};
