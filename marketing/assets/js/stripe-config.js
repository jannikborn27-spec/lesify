/* =========================================================
   Lesify — Stripe-Konfiguration (Frontend)
   ---------------------------------------------------------
   Der Publishable Key ist bewusst öffentlich — er darf im
   Client-Code stehen. Der Secret Key (`sk_test_…`) gehört
   NIEMALS ins Frontend; er lebt nur im späteren Backend
   (siehe Konzept-texts/backend-planning.md §7a).

   `mode: 'demo'` = kein Backend erreichbar. Gilt automatisch nur
   auf der öffentlich deployten Seite (kein `api/` dort gehostet,
   siehe UMSETZUNGSPLAN.md Phase 16) — die Kasse rendert ein
   echtes Stripe Payment Element und validiert die Eingaben live,
   kann ohne Server-Schritt aber nicht abschließen, es wird
   nichts belastet. Lokal (`pnpm dev`, localhost) läuft der volle
   Stripe-Flow gegen das lokale Backend, unabhängig vom hier
   gesetzten `mode` (siehe `checkout.js`, `IST_LOKAL`).

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
  mode: 'demo',

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

  /* ---- Einzelplätze ---- */
  plans: {
    starter: {
      name: 'Starter',
      desc: 'Der Einstieg für ein Fach mit klarer Struktur.',
      monthly: { amount: 1599,  display: '15,99 €',  normal: '19,99 €' },
      yearly:  { amount: 15588, display: '155,88 €', normal: '191,88 €', perMonth: '12,99 €', normalPerMonth: '15,99 €' }
    },
    premium: {
      name: 'Premium',
      badge: 'Bestseller',
      desc: 'Alles für ein Schuljahr mit Plan.',
      monthly: { amount: 1999,  display: '19,99 €',  normal: '24,99 €' },
      yearly:  { amount: 19188, display: '191,88 €', normal: '239,88 €', perMonth: '15,99 €', normalPerMonth: '19,99 €' }
    },
    infinite: {
      name: 'Infinite',
      desc: 'Kein Nachdenken über Kontingente.',
      monthly: { amount: 3599,  display: '35,99 €',  normal: '44,99 €' },
      yearly:  { amount: 33588, display: '335,88 €', normal: '431,88 €', perMonth: '27,99 €', normalPerMonth: '35,99 €' }
    }
  },

  /* ---- Familien-Pakete: Tarif × Sitzplätze ----
     Jeder Sitz = ein eigenes Kind-Profil mit dem vollen
     Monatskontingent des Tarifs (`limits` unten). Die Familien-
     Tabelle nennt keinen Jahres-Normalpreis, daher steht bei
     `yearly` kein `normal`. */
  family: {
    seatOptions: [2, 3, 4],
    tiers: {
      starter: {
        2: { monthly: { amount: 2899,  display: '28,99 €', normal: '35,99 €' },  yearly: { amount: 27588, display: '275,88 €', perMonth: '22,99 €' }, perSeat: '11,69 €' },
        3: { monthly: { amount: 4199,  display: '41,99 €', normal: '51,99 €' },  yearly: { amount: 39588, display: '395,88 €', perMonth: '32,99 €' }, perSeat: '11,26 €' },
        4: { monthly: { amount: 5499,  display: '54,99 €', normal: '67,99 €' },  yearly: { amount: 52788, display: '527,88 €', perMonth: '43,99 €' }, perSeat: '11,05 €' }
      },
      premium: {
        2: { monthly: { amount: 3599,  display: '35,99 €', normal: '44,99 €' },  yearly: { amount: 33588, display: '335,88 €', perMonth: '27,99 €' }, perSeat: '14,39 €' },
        3: { monthly: { amount: 5199,  display: '51,99 €', normal: '64,99 €' },  yearly: { amount: 49908, display: '499,08 €', perMonth: '40,99 €' }, perSeat: '13,86 €' },
        4: { monthly: { amount: 6799,  display: '67,99 €', normal: '84,99 €' },  yearly: { amount: 64788, display: '647,88 €', perMonth: '53,99 €' }, perSeat: '13,60 €' }
      },
      infinite: {
        2: { monthly: { amount: 6499,  display: '64,99 €',  normal: '80,99 €' },  yearly: { amount: 59988,  display: '599,88 €',   perMonth: '49,99 €' }, perSeat: '25,20 €' },
        3: { monthly: { amount: 9399,  display: '93,99 €',  normal: '116,99 €' }, yearly: { amount: 86388,  display: '863,88 €',   perMonth: '71,99 €' }, perSeat: '24,26 €' },
        4: { monthly: { amount: 12299, display: '122,99 €', normal: '152,99 €' }, yearly: { amount: 113988, display: '1.139,88 €', perMonth: '94,99 €' }, perSeat: '23,80 €' }
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

  features: {
    starter: [
      'Alle Fächer, beliebig viele Themen',
      '20 Content-Aufnahmen pro Monat',
      '100 KI-Nachrichten pro Monat',
      '5 Lernzettel',
      '1 Testklausur pro Monat',
      'Action Plan & Lernplan zur Klausur'
    ],
    premium: [
      'Alles aus Starter',
      '50 Content-Aufnahmen pro Monat',
      '250 KI-Nachrichten pro Monat',
      '15 Lernzettel',
      '5 Testklausuren pro Monat',
      'Erinnerung vor eingetragenen Klausuren'
    ],
    infinite: [
      'Alles aus Premium',
      '100 Content-Aufnahmen pro Monat',
      'Unbegrenzt KI-Nachrichten',
      '50 Lernzettel',
      '15 Testklausuren pro Monat',
      'Bevorzugter Support per E-Mail'
    ],
    family: [
      'Ein eigenes Profil je Kind, getrennte Fächer & Fortschritte',
      'Volles Monatskontingent des Tarifs pro Kind — nichts wird geteilt',
      'Wöchentliche Zusammenfassung für Eltern',
      'Eine Rechnung für alle Sitzplätze'
    ]
  }
};
