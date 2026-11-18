# Launch-Plan 2027 — App, erste Kunden, Profitabilität

> Stand 2026-11-18. Budget **3.000 €** bis zur Profitabilität. Ziel: native App
> (iOS + Android) + Werbestart nach den Weihnachtsferien (Woche ab **11. Jan 2027**).
> Alle Zahlen unten sind **Planannahmen**, keine Messwerte — die echten Werte
> kommen aus dem Vortest (Abschnitt 4) und ersetzen die Annahmen in Abschnitt 3.
>
> Ausgangslage (aus dem Repo): Web-App + API laufen live, Stripe Live seit
> 2026-10-01, 14 Tage Testphase mit Zahlungsmittel, kein Gratis-Tarif.
> Registrierung legt immer ein **Elternkonto** an → **Käufer = Eltern**,
> Nutzer = Kind. Soft-Launch/öffentlicher Launch (Phase 16) noch offen, noch
> keine bezahlte Werbung geschaltet (Meta-Creatives Stand 2026-11-16 = Entwurf).

---

## 1. Die wichtigste Erkenntnis vorweg

**Die App allein macht Lesify nicht profitabel — Profitabilität entscheidet sich
an einer Zahl: Kundengewinnungskosten (CAC) im Verhältnis zum Deckungsbeitrag.**
Die App hilft dabei an zwei Stellen: Kinder nutzen sie täglich (Push → weniger
Kündigungen) und sie wirkt seriöser. Sie macht jeden Store-Verkauf aber auch
**~28 % weniger wert** als einen Web-Verkauf (Abschnitt 3).

Daraus folgen drei Regeln für den Plan:

1. **Bezahlte Werbung zielt auf Eltern und führt auf die Website** (Stripe,
   beste Marge, Tracking steht schon). Die App wird über die Stores organisch
   gefunden und von Kindern genutzt.
2. **Werbung nicht an die App koppeln.** Wenn die App im Januar nicht durch die
   Review ist, startet die Werbung trotzdem — die Web-App ist live.
3. **Jetzt schon mit kleinem Budget messen** (Vortest ab KW 48), statt im
   Januar 2.000 € auf Annahmen zu setzen.

---

## 2. Budget-Aufteilung (3.000 €)

| Posten | Betrag | Bemerkung |
| --- | ---: | --- |
| Apple Developer Program | ~99 € | jährlich |
| Google Play Console | ~25 € | einmalig |
| Betrieb 6 Monate (Railway, Supabase Pro ab den ersten Kunden, Kleinkram) | ~270 € | ~45 €/Monat; KI-Kosten skalieren mit Kunden und sind im Deckungsbeitrag enthalten |
| Reserve (gebrauchtes Android-Testgerät, Rechtstexte-Update, Unvorhergesehenes) | ~300 € | |
| **Werbung** | **~2.300 €** | aufgeteilt in 4 Phasen, Abschnitt 4 |
| **Summe** | **~3.000 €** | |

Software-Kosten für die App selbst: **0 €** (Capacitor, RevenueCat bis
2.500 $ Monatsumsatz kostenlos, Xcode/Android Studio kostenlos).

---

## 3. Unit Economics — was ein Kunde wert ist

### Deckungsbeitrag pro zahlendem Kunden und Monat

KI-Kosten = gemessene Werte bei 100 % Auslastung (`docs/RUNBOOK.md`,
2026-09-23: Starter ~0,63 €, Premium ~1,67 €, Infinite ~6 €).

| Tarif (monatlich) | Preis | Web (Stripe) | App Store / Play |
| --- | ---: | ---: | ---: |
| Starter | 15,99 € | **~14,90 €** | ~10,80 € |
| Premium | 19,99 € | **~17,60 €** | ~12,60 € |
| Infinite | 35,99 € | **~29,20 €** | ~19,70 € |

- **Web:** Stripe ~2,2 % + 0,25 € (inkl. Billing-Gebühr), **keine MwSt.** dank
  Kleinunternehmerregelung.
- **Stores:** Apple/Google verkaufen selbst und führen **19 % MwSt.** ab —
  die Kleinunternehmerregelung hilft dort nicht. Danach **15 % Provision**
  (Google bei Abos immer; Apple nur mit **Small Business Program — muss
  beantragt werden**, sonst 30 % im ersten Jahr).
- **Planwert für alles Weitere: 15 € Deckungsbeitrag pro Kunde und Monat**
  (Mischung aus Starter/Premium, ~70 % Web / 30 % Store).

### Kundenwert (LTV) und erlaubte Kundengewinnungskosten (CAC)

| | Schlecht | Realistisch | Gut |
| --- | ---: | ---: | ---: |
| Ø Abo-Dauer | 4 Monate | 6 Monate | 9 Monate |
| LTV (× 15 €) | 60 € | **90 €** | 135 € |

**Zwei Grenzen, die du dir merken musst:**

- **CAC < 90 €** → jeder Kunde bringt über seine Laufzeit mehr ein, als er
  gekostet hat. Langfristig profitabel, aber langsam (Geld kommt erst nach
  ~6 Monaten zurück).
- **CAC ≤ 45 €** → Werbegeld ist nach **~3 Monaten** zurück. Erst ab hier
  finanziert sich das Wachstum aus dem Umsatz, ohne dass das 3.000-€-Budget
  ausgeht. **Das ist das eigentliche Ziel.**

### Wie CAC zustande kommt

CAC = Kosten pro Testphasen-Start ÷ Anteil der Testphasen, die zu zahlenden
Abos werden.

| | Schlecht | Realistisch | Gut |
| --- | ---: | ---: | ---: |
| Kosten pro Testphasen-Start | 70 € | 40 € | 25 € |
| Testphase → zahlend | 30 % | 40 % | 50 % |
| **CAC** | **~233 €** | **~100 €** | **~50 €** |

Einordnung: Testphasen mit Pflicht-Zahlungsmittel („Hard Paywall") wandeln
laut RevenueCat-Report 2026 deutlich besser um als Freemium; ob Lesify eher
bei 30 % oder 50 % landet, entscheidet vor allem, **ob das Kind in den ersten
48 h einen Lernplan anlegt** (Abschnitt 6).

### Jahresabos sind der stärkste Hebel

Ein Premium-Jahresabo (191,88 €) zahlt den CAC **sofort** zurück und übersteht
die Sommerferien (die Zeit mit den meisten Kündigungen). Jahresabo in der
Kasse prominent zeigen und in den Anzeigen erwähnen.

### Achtung Kleinunternehmergrenze

Über **25.000 € Umsatz in 2027** (≈ 105–130 zahlende Kunden im Jahresschnitt)
gilt ab 2028 die normale MwSt.; über 100.000 € im laufenden Jahr sofort. Dann
sinkt der Web-Deckungsbeitrag (Premium ~17,60 € → ~14,40 €). Rechtzeitig mit
Steuerberater:in klären — und es ist ein gutes Problem.

---

## 4. Zeitplan

KW = Kalenderwoche. Heute: Mi 18.11.2026 (KW 47).

### Jetzt bis Weihnachten — bauen + Vortest

| Wann | Was |
| --- | --- |
| **KW 47** (bis 22.11.) | **Apple- und Google-Konto registrieren** (dauert am längsten). Entscheidung privat vs. Organisation (Organisation: Firmenadresse statt Privatadresse öffentlich, kein 14-Tage-Test bei Google, braucht D-U-N-S). Small Business Program bei Apple beantragen. Conversion-Tracking prüfen (Plausible-Funnel, Meta Pixel, Google-Ads-Conversion auf Testphasen-Start). |
| **KW 48** (ab 23.11.) | **Vortest live** — Phase A Werbung (unten). Start mobiles Layout der App. |
| **KW 48–49** | Mobiles Layout (Tab-Leiste unten, Tap-Ziele), PWA (Manifest + Service Worker). |
| **KW 50** (7.–13.12.) | Capacitor-Hülle, Push (Lernplan-Erinnerung), Kamera-Upload, **In-App-Kauf über RevenueCat + Backend-Anbindung** (größter Brocken, Abschnitt 7), Registrierung in der App. |
| **KW 51** (spätestens Mo 14.12.) | **Google-Closed-Test starten** (bei privatem Konto: 12 Tester, 14 Tage → frühestens 28.12. fertig). TestFlight für iOS. Store-Texte, Screenshots, Datenschutzerklärung um App ergänzen, Demo-Konto für die Reviewer. |
| **KW 52–53** | Fehler beheben, **iOS + Android zur Review einreichen** (über Weihnachten mit längeren Review-Zeiten rechnen). Werbung **pausiert** 21.12.–3.1. (Feiertage = kaum Kaufabsicht für Lern-Apps). |

### Januar bis Juni — Launch + Wachstum

| Wann | Was |
| --- | --- |
| **KW 1** (4.–10.1.) | **Soft-Launch:** Familie, Freunde, 5–10 Testfamilien. Kompletter Funnel einmal echt durchlaufen. App in den Stores freigeben (Apple: Phased Release, Google: Staged Rollout). |
| **Mo 11.1.** | **Öffentlicher Launch** — Phase B Werbung startet. |
| **KW 4–5** (25.1.–7.2.) | **Halbjahreszeugnis-Woche** (je nach Bundesland Ende Jan / Anfang Feb) = stärkster Kaufmoment bis zum Sommer. Eigene Anzeigen „Zeugnis gekommen?". |
| **So 7.2.** | **Checkpoint 1** (Abschnitt 5). |
| **Feb–März** | Phase C — nur noch, was funktioniert. Winterferien (in mehreren Ländern ab 1.2., Bayern 15.–19.2.) sind schwächer. |
| **Mi 31.3.** | **Checkpoint 2.** |
| **Apr–Juni** | Prüfungssaison (Abi, Versetzung, blaue Briefe) — Phase D, nur bei CAC ≤ 60 €. |
| **Mi 30.6.** | **Checkpoint 3** — Sommer-Strategie (Jahresabos, Werbung runter). |

### Werbebudget nach Phasen (~2.300 €)

| Phase | Zeitraum | Budget/Tag | Summe | Ziel |
| --- | --- | ---: | ---: | --- |
| **A — Vortest** | 23.11.–18.12. | ~12 € (Google 7 / Meta 5) | ~300 € | Erste echte Werte für Kosten pro Testphase + Testphase → zahlend. Erste 2–3 Kunden. |
| **B — Launch** | 11.1.–7.2. | ~30 € | ~850 € | Gewinner-Kanal und Gewinner-Anzeigen finden, Zeugnis-Peak mitnehmen. |
| **C — Fokus** | 8.2.–31.3. | ~15 € | ~750 € | Nur Gewinner, CAC senken. |
| **D — Reserve** | Apr–Juni | flexibel | ~400 € | Nur wenn CAC ≤ 60 €, sonst gespart. |

Kanäle: **Google Search** (höchste Kaufabsicht, Keywords in
`Konzept-texts/google-ads/`) und **Meta/Instagram an Eltern** (9 Karussells in
`Konzept-texts/meta-ads/`). Keine App-Install-Kampagnen: die Käufer sind Eltern,
und Werbe-SDKs gehören nicht in eine App für Kinder.

---

## 5. Abbruch- und Skalierungsregeln

Pro Anzeige / Keyword-Gruppe:

- **Pausieren**, wenn nach 150 € Ausgaben keine Testphase entstanden ist oder
  der CPC dauerhaft > 2 € liegt.
- **Budget verdoppeln**, wenn die Kosten pro Testphasen-Start < 25 € liegen
  (nach mind. 5 Testphasen).

Checkpoints:

| Checkpoint | Weiter wie geplant, wenn … | Sonst |
| --- | --- | --- |
| **1 — 7.2.** | CAC ≤ 100 € und Testphase → zahlend ≥ 25 % | **Werbung stoppen**, Onboarding/Aktivierung fixen (Abschnitt 6), organische Kanäle; erst danach neu testen. Rest-Budget bleibt erhalten. |
| **2 — 31.3.** | CAC ≤ 60 € und ≥ 30 zahlende Kunden | Werbung auf Minimum, Preis/Angebot prüfen (z. B. Jahresabo als Standard). |
| **3 — 30.6.** | Monatlicher Deckungsbeitrag > Werbung + Fixkosten | Sommer überbrücken mit Jahresabo-Aktion, im September (Schuljahresstart) neu angreifen. |

Diese Regeln schützen das Budget: auch im schlechten Fall bleibt mehr als die
Hälfte übrig, um nach einer Produktverbesserung neu zu starten.

---

## 6. Kostenlose Kanäle und Produkt-Hebel

Bei 3.000 € entscheiden diese Punkte mehr als das Werbebudget:

1. **Aktivierung in der Testphase** — größter Einzelhebel für „Testphase →
   zahlend". Ziel: Kind legt in den ersten 48 h Fach, Klausur und Lernplan an.
   Erinnerungs-Mails (Resend) an Tag 1, 3, 10 und 13 („Testphase endet morgen"
   — auch rechtlich sauber, senkt Rückbuchungen).
2. **Empfehlungsprogramm** — „1 Monat gratis für beide" (Stripe-Gutschein).
   Eltern reden mit Eltern (Klassen-WhatsApp-Gruppen).
3. **Kurzvideos für Schüler:innen** (TikTok/Reels, 3× pro Woche): Lernplan
   „Klausur in 7 Tagen", Lernzettel-Demo. Kinder überzeugen die Eltern.
4. **App-Store-Optimierung** — Titel/Untertitel mit Suchbegriffen (z. B.
   „Lesify – Lernplan & KI-Nachhilfe"), gute Screenshots mit Beschriftung,
   früh um Bewertungen bitten (nach dem ersten bestandenen Lernplan).
5. **Echte Kundenstimmen** sobald möglich (mit schriftlicher Einwilligung,
   Phase 17) — für Website und Anzeigen.

---

## 7. App-Bau — was für den Store zwingend nötig ist

(Kurz; die Schritte sind als Checkliste in `UMSETZUNGSPLAN.md`
„Phase 16a — Native App & Januar-Launch 2027" geführt.)

- [ ] Mobiles Layout der App + PWA.
- [ ] Capacitor-Hülle (iOS + Android), `app/` lokal gebündelt, nicht als
      ferngeladene Website.
- [ ] Native Funktionen gegen Apples „nur eine Website"-Ablehnung: Push für
      Lernplan-Erinnerungen, Kamera/Dokumentenscan für Uploads, Offline-Seite.
- [ ] **In-App-Kauf** (Apple/Google sind für digitale Abos Pflicht) über
      RevenueCat; Backend akzeptiert Abos aus Stripe **und** aus den Stores
      (siehe `backend-planning.md` §8 „Weiterhin offen").
- [ ] Registrierung (Elternkonto) direkt in der App — heute liegt sie in
      `marketing/registrieren/`, das nicht in der App gebündelt ist.
- [ ] Kein Meta Pixel / GTM in der App; Altersfreigabe + Datenschutz-Angaben
      in beiden Stores; Demo-Konto mit Beispieldaten für die Review.

**Offene Entscheidung (nach dem Launch):** „Kind zuerst"-Einstieg in der App —
das Kind installiert, die Eltern bezahlen per Apples „Kaufanfrage" /
Google-Familienmediathek. Würde organische Store-Installs viel besser
umwandeln, braucht aber Änderungen am Eltern-Kind-Modell. Für Januar: Eltern
registrieren sich, Kinder melden sich mit ihrem Kind-Profil an.

---

## 8. Ziele und was am Ende übrig bleibt

| Stand 30.06.2027 | Schlecht | Realistisch | Gut |
| --- | ---: | ---: | ---: |
| Zahlende Kunden | ~15 | ~45 | ~110 |
| Deckungsbeitrag/Monat (× 15 €) | ~225 € | ~675 € | ~1.650 € |
| Werbung/Monat (Juni) | 0 € (gestoppt) | ~400 € | ~700 € |
| Fixkosten/Monat | ~80 € | ~80 € | ~80 € |
| **Ergebnis/Monat** | **~+145 €** | **~+195 €** | **~+870 €** |
| Kasse grob (3.000 € − Ausgaben + Einnahmen) | ~2.200 € | ~2.200 € | ~4.400 € |

**Meilensteine (Ziel = Szenario „Gut"):**

- **31.12.:** Apps eingereicht, 2–3 zahlende Kunden aus dem Vortest.
- **31.01.:** 15 zahlende Kunden.
- **31.03.:** 40 zahlende Kunden, CAC ≤ 60 €.
- **30.06.:** 100+ zahlende Kunden → ~800 €/Monat Gewinn nach Werbung.

**Was „profitabel" in Zahlen heißt:**

| Stufe | Zahlende Kunden | Bedeutung |
| --- | ---: | --- |
| Laufende Kosten gedeckt | ~5 | Server + KI bezahlen sich selbst |
| Werbung finanziert sich selbst (600 €/Monat) | ~45 | Wachstum ohne neues Geld — nur wenn CAC ≤ 45 € |
| ~1.000 €/Monat für dich | ~150 | nach Werbung und Fixkosten |
| Echtes Einkommen (~3.000 €/Monat) | ~300 | Kleinunternehmergrenze ist dann überschritten (MwSt. einplanen) |

---

## 9. Wöchentlich messen (eine Tabelle reicht)

Jeden Montag eintragen, Quelle in Klammern:

- Werbeausgaben je Kanal, CPC (Google Ads, Meta)
- Website-Besuche → Testphasen-Starts, Kosten pro Testphasen-Start (Plausible-Funnel, `LesifyTrack.event`)
- Testphase → zahlend, Kündigungen, Rückbuchungen (Stripe, RevenueCat)
- Aktivierung: Anteil neuer Kinder mit Lernplan in 48 h (DB)
- KI-Kosten je Sitz (`ki-kosten-alarm`)
- Store-Installs, Bewertungen (App Store Connect, Play Console)

Quellen für die Annahmen: [RevenueCat State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps-2026/)
(Paywall-/Trial-Umwandlung), Ferientermine über
[kalenderpedia.de](https://www.kalenderpedia.de/ferien/winterferien-2027.html) —
vor der Planung der Zeugnis-Anzeigen mit den Kultusministerien abgleichen.
