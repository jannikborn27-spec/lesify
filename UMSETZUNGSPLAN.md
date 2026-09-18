# Lesify — Umsetzungsplan: vom Prototyp zum Live-Produkt

> Chronologische Schritt-für-Schritt-Liste. Von oben nach unten abarbeiten —
> die Phasen bauen aufeinander auf. Jede Zeile mit `- [ ]` ist ein
> abschließbarer Arbeitsschritt; hak sie ab, wenn das dort genannte Ergebnis
> steht.
>
> **Grundregeln für die ganze Umsetzung**
> - Projektsprache bleibt **Deutsch** (Code-Kommentare, UI, Doku, Commit-Messages nach Belieben).
> - `Konzept-texts/backend-planning.md` ist die **Quelle der Wahrheit** für
>   Datenmodell, Endpunkte, Notenlogik. Jede Änderung an Feldern, Formeln oder
>   Endpunkten wird **dort zuerst** eingepflegt, bevor der Schritt als erledigt gilt
>   (siehe `CLAUDE.md`).
> - Das Backend **reproduziert** das Verhalten aus `assets/js/data.js` — es erfindet
>   nichts neu. Funktionssignaturen aus `data.js` bleiben das Ziel-Interface des API-Clients.
> - Nichts optimieren, bevor es weh tut (Themen-Memory, Suche, Caching): erst die
>   einfache Variante, Ausbau nur bei echtem Bedarf.

### Pflege dieser Datei

**Diese Datei wird bei jeder Arbeit am Lesify-Projekt mitgeführt.** Sobald in
diesem Ordner etwas passiert, das einem Schritt hier entspricht:

- den erledigten Schritt auf `- [x]` setzen (bei Teilfortschritt einen kurzen
  Klammerzusatz, z. B. `- [ ] … (API steht, Tests fehlen)`),
- neu entstandene oder verschobene Aufgaben als Zeilen ergänzen,
- getroffene Entscheidungen mit Datum in **Phase 0** festhalten,
- bei Änderungen an Datenmodell / Notenlogik / Limits / Endpunkten zusätzlich
  `Konzept-texts/backend-planning.md` nachziehen (siehe `CLAUDE.md`).

Der Abgleich passiert **im selben Arbeitsschritt** wie die Änderung, nicht später.

---

## Was jetzt noch von dir gebraucht wird (Stand 2026-09-13)

**Alles, was ohne Rücksprache technisch entscheidbar war, ist gebaut, getestet
und dokumentiert.** Die 15 regulären App-Seiten laufen komplett gegen die
echte API (Phase 11), das Backend steht bis Phase 10, das Frontend-Cut-over
ist bis auf den Eltern-Bereich fertig. Was unten steht, sind **Entscheidungen,
Zugänge oder Texte, die nur du liefern kannst** — sortiert danach, was zuerst
drankommt. Häk die Zeile ab, sobald sie geklärt ist; bei „ich brauche X von
dir" trag die Antwort direkt in die Zeile ein oder sag mir Bescheid, dann
setze ich sie um.

### 1. Damit die App überhaupt live erreichbar ist (Hosting)

- [x] **Wo soll `api/` laufen?** **Railway** (Entscheidung 2026-09-13,
      Service läuft seit 2026-09-14). **Wichtig, abweichend vom ersten Plan:**
      Root Directory bleibt **Repo-Wurzel**, NICHT `api/` — mit `api/` als
      Root sieht Railpack `pnpm-workspace.yaml`/`pnpm-lock.yaml` nicht, fällt
      auf `npm install` zurück, und `npm` kann `workspace:*`
      (`@lesify/shared`-Abhängigkeit) nicht auflösen (Build-Fehler
      2026-09-14). Stattdessen Build/Start-Commands im Service auf den
      `api`-Workspace gescoped:
      - Build Command: `pnpm install --frozen-lockfile && pnpm --filter
        @lesify/shared build && pnpm --filter @lesify/api db:generate &&
        pnpm --filter @lesify/api build`
      - Start Command: `pnpm --filter @lesify/api start`

      **Zweiter Bug (2026-09-14, behoben):** `shared/package.json` zeigte mit
      `main`/`types`/`exports` direkt auf `src/index.ts` statt auf ein
      kompiliertes `dist/`. Lokal (`tsx`) und in Vitest fiel das nie auf, aber
      der produktive `node dist/index.js`-Start crashte in einer Endlosschleife
      mit `ERR_UNKNOWN_FILE_EXTENSION: Unknown file extension ".ts"`, weil
      Node `.ts`-Dateien nicht nativ importieren kann. Fix: `shared/` hat jetzt
      einen echten `build`-Script (`tsc -p tsconfig.json` → `shared/dist/`),
      `main`/`types`/`exports` zeigen auf `dist/index.js`/`dist/index.d.ts`
      (siehe `backend-planning.md` §0 „Umsetzungs-Ebene"). Lokal verifiziert:
      `pnpm --filter @lesify/shared build && pnpm --filter @lesify/api build
      && node api/dist/index.js` startet jetzt sauber (kein Importfehler mehr).

      **Dritter Bug (2026-09-14, behoben):** Danach crashte der Start mit
      `Error: Node.js detected but native WebSocket not found` beim Aufbau
      des `SupabaseStorageGateway` (`api/src/lib/storage.ts`) — `@supabase/
      supabase-js` legt intern immer einen Realtime-Client an (obwohl wir nur
      Storage nutzen), der ab Node 22 das native `WebSocket`-Global braucht;
      Railway läuft auf Node 20. Fix (von der Supabase-Fehlermeldung selbst
      vorgeschlagen): `ws`-Paket als `@lesify/api`-Dependency ergänzt, in
      `createClient(..., { realtime: { transport: WebSocket } })` durchgereicht
      — kein Node-Versions-Zwang nötig.
- [x] **Domain-Entscheidung:** `lesify.de` bleibt die Domain, `app/` bleibt
      Unterpfad (`lesify.de/app`) wie im aktuellen GitHub-Pages-Setup —
      keine Code-Änderung nötig, DNS/TLS-Einrichtung bleibt ein Ops-Schritt
      (Phase 16).
- [x] **Supabase-Produktivprojekt anlegen** — erledigt 2026-09-14. Neues
      Projekt `vmktsooagaoahvuoznfn` in eu-central-1, alle 7 Migrationen per
      `db:deploy` angewandt, `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`/
      `SUPABASE_STORAGE_BUCKET` bei Railway gesetzt — `/health` liefert
      `db:true`, Storage-Client verbindet (siehe „ws"-Fix oben).
- [x] **`CORS_ORIGINS=https://lesify.de` gesetzt** (2026-09-14, Teil der
      Railway-Variablen aus Schritt 6 unten).
- [x] **`window.LESIFY_API_BASE` verdrahtet** (2026-09-14): `app/assets/js/
      api.js`, `marketing/assets/js/auth-forms.js` und `.../checkout.js`
      erkennen jetzt selbst den Host (`/(^|\.)lesify\.de$/.test(location.
      hostname)`) und zeigen auf `https://lesify-production.up.railway.app`
      statt `localhost:3000` — keine Änderung an den HTML-Seiten nötig,
      `window.LESIFY_API_BASE` überschreibt weiterhin beides, falls gebraucht.
      **Offen, keine Code-Aufgabe, deine Entscheidung:** `checkout.js`s
      `CFG.mode === 'demo'`-Gate (Zahlung nur validiert, kein `/abo`-Aufruf
      auf der öffentlichen Seite) ist bewusst unverändert geblieben — ob die
      Kasse jetzt live gegen die echte (aber ohne `STRIPE_SECRET_KEY`: Fake-)
      API laufen soll, ist Teil von Abschnitt 4 „Geld" unten, nicht
      automatisch mitentschieden.

### 2. Eltern-Bereich fertigstellen (`eltern-*.html`, 5 Seiten) — ✅ erledigt 2026-09-13

Alle fünf Entscheidungen von dir beantwortet und umgesetzt:

- [x] **Aktivitäts-Ampel entfernt** (deine Entscheidung: „kann komplett
      entfernt werden … Eltern können genaue Anzahl von jedem Feature
      einsehen, das reicht aus"). Kein neues Feld, keine Formel — die Seiten
      zeigen jetzt die rohen Wochenzahlen aus `GET /abo/kinder/:id/
      zusammenfassung` direkt, ohne abgeleitete Einstufung.
- [x] **„Eingeladen"-Status ergänzt** (deine Entscheidung: „Ja"). `GET
      /abo/kinder` liefert jetzt `eingeladen: boolean` (aus `!!email`).
- [x] **„Letzte Aktivität" weggelassen** (deine Entscheidung: „kann ganz
      weggelassen werden") — nirgends mehr referenziert.
- [x] **Kind-Avatar-Farbe** (dir überlassen): deterministisch aus der
      Kind-ID erzeugt (`Lesify.getKindColor()`, api.js), kein neues
      Datenfeld nötig.
- [x] **Abo-Reaktivierung gebaut** (deine Entscheidung: „ja baue
      reaktivierung"). Neuer Endpunkt `POST /abo/reaktivieren` +
      `ZahlungsGateway.subscriptionReaktivieren()` (Fake + echtes Stripe).
      Zusätzlich `eltern-kind.html`s Fach-/Klausur-Metadatenlisten (Name +
      Anzahl bzw. Datum, keine Inhalte) ergänzt, die die Seite schon vorher
      erwartete, ohne dass der Endpunkt sie geliefert hatte. Details:
      `backend-planning.md` §9 „Nachtrag eltern-*.html".

### 3. Recht & Texte (Phase 13) — keine Code-Aufgabe, blockiert aber den Launch

- [ ] **Impressum / Datenschutzerklärung / AGB** mit echten Angaben füllen
      (`marketing/impressum.html`, `datenschutz.html`, `agb.html`) und
      juristisch prüfen lassen.
- [ ] **Auftragsverarbeitungsverträge** mit Anthropic + Sub-Prozessoren
      (Supabase, Stripe, Hoster) abschließen, fürs Verarbeitungsverzeichnis.
- [x] **KI-Nutzungshinweis-Text ergänzt** (2026-09-14): `chat.html`s
      Composer-Hinweis erweitert auf „Lesify kann Fehler machen — prüfe
      wichtige Angaben nach. Antworten sind keine offizielle
      Leistungsbewertung durch die Schule." Zusätzlich in `testklausur.html`
      denselben Hinweis unter der eingefrorenen Note ergänzt (dort war er
      vorher noch gar nicht vorhanden, obwohl die KI-Note dort am direktesten
      wie eine echte Bewertung wirkt).

### 4. Geld (Phase 9/16)

- [x] **Bug (2026-09-18, gefunden bei Rückfragen zur Abo-QA, selbiger Tag
      behoben): Job `abo-geplante-aenderungen` senkte den Preis nie bei
      Stripe.** Beim Nachprüfen der Frage „warum wirkt eine Sitzerhöhung
      sofort" fiel auf, dass der Gegenpart — eine abgeschlossene
      Sitz**verringerung** — zwar lokal `Abo.sitze` senkte, aber nie
      `zahlung.subscriptionAendern` aufrief. Live gegen Stripe Test-Mode
      reproduziert: Abo von 3 auf 2 Sitze verringert (Kind gelöscht,
      Zeitraum künstlich beendet, Job gelaufen) → lokale DB zeigte
      korrekt `sitze:2`, aber die Stripe-Subscription blieb auf dem
      3-Sitze-Preis (5199 Cent) stehen — der Kunde wäre dauerhaft zu viel
      belastet worden. **Fix:** `geplanteAboAenderungenAnwenden`
      (`api/src/lib/jobs.ts`) berechnet jetzt den neuen Preis
      (`aboPreis()`) und ruft `zahlung.subscriptionAendern()`, bevor es
      die DB aktualisiert — Signatur um einen `zahlung`-Parameter mit
      `getZahlungsGateway()`-Default erweitert (gleiches Muster wie
      `storage` bei `inhalteAelterAlsEinJahrLoeschen`), kein Eingriff an
      `run.ts`/dem CLI-Aufruf nötig. Bestehender Test in `abo.test.ts`
      (nutzt den Fake-Gateway) entsprechend angepasst (`zahlung` explizit
      mitgegeben, sonst hätte der neue Default versucht, echtes Stripe mit
      einer `fake_sub_…`-Referenz anzusprechen). Live erneut verifiziert:
      derselbe Ablauf senkt den Stripe-Preis jetzt korrekt auf 3599 Cent.
      Alle 181 API-Tests grün.
- [ ] **Offene Produktfrage (2026-09-18, noch nicht entschieden): Sitz-/
      Tarif-Erhöhung ohne Bestätigungsschritt.** `PATCH /abo` wirkt sofort,
      die UI zeigt vorher keinen Preis und keine Bestätigung — nur einen
      Toast danach. Für ein Abo in der 14-Tage-Testphase ist das
      unproblematisch: live verifiziert, dass eine Sitz-/Tarif-Änderung
      während der Testphase **keine** Buchung bei Stripe auslöst, nur der
      künftige Rechnungsbetrag ändert sich. Für ein bereits aktiv
      abrechnendes Abo (nach der Testphase) ist es das nicht — live
      verifiziert, dass Stripe dort sofort eine echte, anteilige
      Proration-Buchung anlegt (zwei `invoiceItems`: „Unused time"/
      „Remaining time"), die in die nächste Rechnung einfließt, ohne dass
      die Eltern vorher einen Betrag sehen. **Deine Entscheidung nötig:**
      soll `eltern-abo.html` vor einer Erhöhung eine Kostenvorschau/
      Bestätigung zeigen (z. B. via `stripe.invoices.createPreview()`)?
      Nur für aktiv abrechnende Abos relevant, während der Testphase
      unkritisch.
- [ ] **Frage beantwortet (2026-09-18): Was macht „Sommerpause" genau?**
      Ruft `stripe.subscriptions.update(ref, {pause_collection:{behavior:
      'void'}})` — Stripe stellt für die Dauer der Pause keine Rechnungen
      mehr, ohne den Abrechnungszeitraum selbst zu verschieben — und setzt
      lokal `Abo.status = 'pausiert'`. **Wichtig:** nichts im Backend prüft
      `Abo.status` für den App-Zugriff (`usage.ts` liest nur `abo.paket`
      fürs Kontingent, keine Route filtert nach Status) — Sommerpause **und
      auch eine Kündigung** wirken aktuell ausschließlich auf die
      Stripe-Abrechnung, der App-Zugriff selbst wird nirgends technisch
      eingeschränkt. Passt zum Kartentext „Inhalte bleiben erhalten",
      bedeutet aber auch: ein gekündigtes, abgelaufenes Abo sperrt aktuell
      nichts von selbst. Offen, ob das so gewollt ist oder noch eine
      Zugriffssperre nach Ablauf der Kündigungsfrist gebaut werden soll.

- [x] **Bug (2026-09-18, gemeldet & behoben): Solo-Checkout landete auf
      einer Kind-hinzufügen-Seite, die für Einzelplatz-Abos stumm
      scheiterte.** `checkout-erfolg/` verlinkt „Erstes Kind hinzufügen" für
      **jeden** Checkout — solo wie Familie — auf `eltern-kinder.html`
      (schon länger so). Aber `POST /abo/kinder` (`api/src/routes/abo.ts`)
      hatte ein zusätzliches `if (abo.art !== 'familie') throw new
      HttpError(409, 'kein_familienabo')` — jedes Einzelplatz-Abo
      (`sitze=1`) konnte also **nie** ein Kind-Profil anlegen, obwohl das
      Eltern-Kind-Modell das explizit vorsieht (`backend-planning.md` §1:
      „1–4 Kind-Profile"). Im Frontend (`app.js`) landete der 409 nirgends
      als Fehlermeldung — das „Anlegen"-Modal blieb einfach hängen, ganz
      ohne Hinweis. Live reproduziert (solo registrieren → Checkout → „Erstes
      Kind hinzufügen" → Anlegen → `409 kein_familienabo`, stiller Fehlschlag).
      **Fix:** das `art`-Gate entfernt — `belegt + 1 > abo.sitze` reicht als
      Grenze für Einzel- **und** Familien-Abo. `data.js`s Prototyp-Version
      (`Lesify.addKind`) entsprechend nachgezogen. Neuer Test in
      `abo.test.ts` deckt „Einzelplatz-Abo legt genau 1 Kind an, zweites →
      409 sitze_ausgeschoepft" ab. Alle 180 API-Tests grün.
- [x] **Vier kleinere Kasse-Änderungen (2026-09-18, auf Nutzerwunsch):**
      1. **„Name des Kontoinhabers"** hat jetzt einen Hinweistext („Ihr Name
         als Elternteil — für die Rechnung. Kinder fügen Sie gleich danach
         im Konto hinzu.") — vorher unklar, wessen Name dort hingehört.
      2. **Stripes „Für nächstes Mal speichern"-Feld (Link) entfernt** —
         Lesify hat nur ein Produkt pro Konto (ein Abo), „nächstes Mal"
         gibt es nicht, nur unnötige Reibung. `payment_settings.
         payment_method_types` (`zahlung.ts`, serverseitig) **und**
         `stripe.elements({paymentMethodTypes:[...]})` (`checkout.js`,
         clientseitig — Elements kennt vor dem Absenden noch kein
         PaymentIntent, muss also separat wissen, welche Methoden erlaubt
         sind) jetzt beide explizit auf `['card','paypal','klarna',
         'amazon_pay']` beschränkt, ohne `link`. **Visuell nicht
         durchverifizierbar** — das Stripe-Payment-Element rendert in der
         hiesigen automatisierten Vorschau seit gestern unzuverlässig
         (bekanntes, umgebungsseitiges Problem, siehe Eintrag oben unter
         „Untersucht, nicht code-seitig behebbar"); Code ist typgeprüft,
         wirft keine Fehler, nutzt dieselben Optionen wie vor dem Umbau
         (nur ohne den Client-Absturz-Verdacht bestätigt — Entfernen der
         Option und Zurücksetzen hat das Rendering-Problem nicht behoben,
         es ist also nicht durch diese Änderung verursacht). **Bitte einmal
         in einem normalen Browser die Kasse öffnen und bestätigen, dass
         Karte/PayPal/Klarna/Amazon Pay weiter da sind und „Für nächstes Mal
         speichern" weg ist.**
      3. **Nach dem Checkout geht es jetzt immer zum Eltern-Konto** — war
         durch `checkout-erfolg/` schon länger so verlinkt (solo wie
         Familie → `eltern-kinder.html`), aber siehe Bug oben: erst mit dem
         `kein_familienabo`-Fix funktioniert das für Solo-Abos tatsächlich.
      4. **Familien-Kasse zeigt jetzt dieselben Tarif-Checks wie die
         Einzelplatz-Kasse**, nur mit „pro Kind" ergänzt (z. B. „250
         KI-Nachrichten / Monat pro Kind"), statt vorher 4 zusätzlicher,
         familien-spezifischer Marketing-Punkte davor („Ein eigenes Profil
         je Kind…", „Eine Rechnung für alle Sitzplätze…") — die stehen
         schon auf `/preise/`, in der Kasse selbst reicht die kleine
         Ergänzung. `checkout.js`s `featureList()` entsprechend vereinfacht;
         `CFG.features.family` in `stripe-config.js` bleibt als Referenz
         stehen, wird von der Kasse aber nicht mehr benutzt.
- [x] **Kleinigkeit (2026-09-18, behoben): Monatspreis bei Jährlich-Kasse zu
      unauffällig.** Die „Abo"-Zeile oben zeigte bei Jährlich denselben
      einmaligen Jahresbetrag wie „Nach der Testphase fällig" weiter unten
      — der Monatspreis stand nur als Klammerzusatz im Fließtext
      („…abgebucht (entspricht 15,99 € / Monat)…"), leicht zu übersehen.
      Jetzt zeigt die „Abo"-Zeile bei Jährlich den Monatspreis prominent
      (`15,99 € / Monat`, mit durchgestrichenem Normalpreis wie gehabt) —
      genau wie auf `/preise/` (`priceAmount()` in marketing.js zeigt dort
      schon immer „X € / Monat", egal ob monatlich oder jährlich
      abgerechnet wird). „Nach der Testphase fällig" bleibt unverändert der
      tatsächliche Abbuchungsbetrag (Transparenzpflicht — das wird wirklich
      einmal im Jahr abgebucht), der Fließtext verweist jetzt direkt darauf
      statt den Monatspreis zu wiederholen. Live für Einzelplatz **und**
      Familie × Jährlich verifiziert (`checkout.js` `renderSummary()`, neue
      CSS-Klasse `.co-unit` in `marketing.css`).

- [x] **Bug (2026-09-17, gemeldet & behoben): „Für dieses Konto besteht
      bereits ein Abo" blockierte für immer, auch nach echter Kündigung.**
      `POST /abo`s Guard (`eigenesAbo` in `api/src/routes/abo.ts`) fand per
      `Abo.findFirst({ownerUserId})` **irgendeine** jemals angelegte
      Abo-Zeile — unabhängig vom Status. Sobald ein Account einmal ein Abo
      hatte (auch ein abgebrochenes/mit abgelehnter Karte), blockierte das
      für immer jeden weiteren `POST /abo` mit `409 abo_vorhanden`, selbst
      lange nach einer echten, ausgelaufenen Kündigung — kein Weg zurück,
      keine Testbarkeit mit demselben Konto. Zusätzlich technisch
      inkonsistent mit dem Schema: die Relation heißt `UserAktivesAbo`
      (`User.aboId`) — genau dafür gedacht, das jeweils **aktuelle** Abo
      eines Users zu markieren, während `ownerUserId` bewusst nicht unique
      ist (mehrere Abo-Zeilen über die Zeit sind vorgesehen).
      **Fix:** `eigenesAbo` löst jetzt über `User.aboId` auf statt über
      `ownerUserId`-Suche. `POST /abo` blockiert nur noch, wenn das
      aktuelle Abo nicht endgültig vorbei ist (`gekuendigt` **und**
      `aktuellerZeitraumEnde` in der Vergangenheit → kein Blocker mehr,
      alles andere weiterhin `409`). Neuer Test
      `gekuendigtes, wirklich abgelaufenes Abo blockiert kein neues POST
      /abo mehr` (`api/src/routes/abo.test.ts`) deckt genau das ab: kündigen
      → Zeitraum künstlich in die Vergangenheit gesetzt → neues `POST /abo`
      geht durch → `GET /abo` zeigt danach deterministisch das neue,
      nicht das alte Abo. Alle 180 API-Tests grün. `backend-planning.md`
      §„Endpunkte" entsprechend korrigiert.
      **Bewusst nicht mitgelöst:** kein Schutz gegen wiederholten
      Trial-Missbrauch (dasselbe Konto könnte durch Kündigen+Neuabschluss
      wiederholt die 14 Tage kostenlos bekommen) — bestand aber schon vorher
      genauso über ein neues Konto (keine E-Mail-/Zahlungsmittel-Sperre
      irgendwo im System), ist also keine neue Lücke durch diesen Fix,
      aber ein offener Punkt für später.

- [x] **Bug (2026-09-17, gefunden bei manueller Abo/Sitze/Stripe-QA,
      selbiger Tag behoben): `POST /abo/reaktivieren` schrieb lokal einen
      falschen Status.** Die Route (`api/src/routes/abo.ts`) setzte nach
      Reaktivierung (aus `gekuendigt` **und** aus `pausiert`) hart
      `data: { status: 'aktiv' }`, statt den tatsächlichen Stripe-Status zu
      übernehmen. End-to-end gegen die echte Test-Stripe-API reproduziert
      (beide Male direkt per Stripe-API nachgeprüft): ein während der
      Trial-Phase gekündigtes bzw. pausiertes Abo war nach Reaktivierung bei
      Stripe weiterhin `trialing` (`cancel_at_period_end:false`, `trial_end`
      unverändert in der Zukunft), die lokale DB zeigte aber `status:'aktiv'`
      — „Aktiv" statt „Testphase" in Abo & Sitze.
      **Fix:** `ZahlungsGateway.subscriptionReaktivieren()` liefert jetzt
      `{status}` zurück (analog zu `subscriptionAnlegen`) — beim Fake
      weiterhin `'aktiv'` (kein Trial-Zustand über den Aufruf hinweg
      bekannt), beim echten Stripe-Adapter aus der Update-Response
      gemappt (`STRIPE_STATUS[sub.status]`). Die Route persistiert jetzt
      diesen zurückgegebenen Status statt eines hartcodierten `'aktiv'`.
      Live gegen die echte Test-Stripe-API nachverifiziert: Kündigen →
      Reaktivieren während der Trial liefert jetzt `status:'test'`, exakt
      passend zu Stripes `trialing`. `backend-planning.md` §„Endpunkte"
      entsprechend korrigiert. Alle 179 API-Tests weiterhin grün.
- [x] **Kleinigkeit (2026-09-17, behoben): Stripe-Fehlertexte auf Englisch.**
      `Stripe(pk)` (`checkout.js`) hatte kein `locale` gesetzt — Stripes
      eigene Meldungen (z. B. Kartenablehnung) konnten dadurch auf Englisch
      erscheinen, obwohl die restliche Kasse Deutsch ist. Fix: `Stripe(pk,
      {locale: 'de'})`.
- [x] **Kleinigkeit (2026-09-17, behoben): geplante Sitzverringerung ohne
      dauerhaften Hinweis.** `eltern-abo.html` zeigte nach einer
      Sitzverringerung (`geplanteSitze` gesetzt) nur kurz einen Toast — die
      Plätze-Zeile selbst blieb danach ohne Hinweis auf die anstehende
      Änderung. Ergänzt: eine zweite Zeile „Sinkt auf N Plätze ab
      {Datum} — dafür noch M Kind-Profil(e) entfernen", solange
      `geplanteSitze != null`. Live verifiziert (4→2 Sitze mit 3 belegten
      Plätzen).
- [ ] **Untersucht, nicht code-seitig behebbar (2026-09-17):** beim
      automatisierten Durchklicken tauchte wiederholt ein leeres Stripe
      Payment Element auf (Karten-/Zahlungsart-Felder unsichtbar, obwohl im
      DOM korrekt mit passender Höhe gemountet). `elements.submit()` meldete
      dabei korrekt „Your card number is incomplete" — das Element war also
      funktional aktiv, nur nicht sichtbar gerendert (reines Malproblem,
      kein Logikfehler). Trat nur beim 2.+ Stripe-Elements-Init pro
      Browser-Tab-Sitzung auf (erster Checkout einer frischen
      Browser-Sitzung funktionierte immer einwandfrei), auch mit komplett
      neuen Nutzern/Tabs. Deutet stark auf eine Eigenheit des verwendeten
      automatisierten Vorschau-Browsers (iframe-Compositing nach dem ersten
      Stripe-Iframe) statt auf einen App-Bug hin — beim manuellen Testen in
      einem normalen Browser bisher nicht reproduziert. Falls es dir beim
      eigenen Test doch begegnet: bitte melden, dann tiefer nachgehen.
- [ ] **Offen, keine Code-Aufgabe:** ist in Produktion (Railway) tatsächlich
      ein Stripe-Webhook-Endpoint auf `/abo/webhook` konfiguriert? Ohne ihn
      bleibt jeder außerhalb der App ausgelöste Statuswechsel (Reaktivierung
      s. o., aber auch fehlgeschlagene Abbuchungen, `invoice.payment_failed`
      usw.) dauerhaft unsynchronisiert. Lokal mit `stripe listen
      --forward-to localhost:3000/abo/webhook` gegenprüfbar (CLI ist
      installiert, `stripe v1.50.11`), aber nicht Teil dieser QA-Runde.
- [ ] **Offen, keine Code-Aufgabe:** Job `abo-geplante-aenderungen`
      (Sitzverringerung zum Periodenende) wurde isoliert erfolgreich gegen
      die echte DB getestet (4→3 Sitze korrekt übernommen, sobald
      `aktuellerZeitraumEnde` erreicht **und** genug Kind-Profile entfernt
      sind) — aber ohne echten Cron/Scheduler in Produktion (siehe Phase 10
      „Scheduler + Monitoring" weiter unten, weiterhin offen) wendet ihn
      nie jemand automatisch an. Gehört vor Launch mit auf die
      Scheduler-Checkliste, nicht nur als Job-Code.
- [ ] **Bug (2026-09-16, gemeldet): Kasse scheitert mit „Die Zahlung konnte
      nicht abgeschlossen werden" nach dem Absenden der Kartendaten.**
      Untersucht, zwei Änderungen gemacht, **Ursache aber noch nicht
      abschließend bestätigt** — dein nächster Test entscheidet:
      1. **`trial_settings` ergänzt** (`api/src/lib/zahlung.ts`,
         `subscriptionAnlegen`): `payment_behavior: 'default_incomplete'`
         + Trial ohne `trial_settings.end_behavior.missing_payment_method:
         'cancel'` garantiert laut Stripe-Doku *nicht*, dass ein
         `pending_setup_intent` entsteht — ohne den ist `clientSecret` null
         und `checkout.js` wirft `kein_client_secret`. Live gegen die echte
         Test-Stripe-API verifiziert: **in diesem Account kam auch ohne die
         Option bereits ein SetupIntent zurück** — die Ergänzung ist trotzdem
         drin (macht das Verhalten explizit statt von einem impliziten
         Stripe-Default abhängig), war hier aber nachweislich **nicht** die
         Ursache des gemeldeten Bugs.
      2. **Wahrscheinlichere Ursache gefunden:** `getZahlungsGateway()`
         (`zahlung.ts`) fällt still auf `FakeZahlungsGateway` zurück, sobald
         `STRIPE_SECRET_KEY` leer/nicht gesetzt ist — **auch in Produktion**,
         keine Umgebungsprüfung. Der Fake liefert kein `clientSecret`; `POST
         /abo` antwortet dann trotzdem `201` mit einer echten Abo-Zeile in
         der DB, nur ohne funktionierende Zahlungsbestätigung — exakt das
         Symptom. Der komplette Server-Flow (registrieren → login → `POST
         /abo`) lokal gegen die echte Test-Stripe-API durchgespielt: liefert
         sauber einen `clientSecret` (`seti_…`). Da lokal alles funktioniert,
         liegt der Verdacht auf der **Railway-Umgebungsvariable
         `STRIPE_SECRET_KEY`** — bitte im Railway-Dashboard prüfen, ob sie
         (noch) korrekt gesetzt ist (kein führendes/nachgestelltes
         Leerzeichen, kein Anführungszeichen mitkopiert, richtiger Name).
         Falls sie fehlt/falsch ist: neu setzen → Railway redeployt
         automatisch → Kasse erneut testen.
      3. **Diagnose-Hilfen ergänzt, damit der nächste Fehlschlag sofort
         sichtbar ist:** `getZahlungsGateway()` loggt jetzt
         `zahlungFakeGatewayInProd` (strukturiertes `console.error`), falls
         das in Produktion (`NODE_ENV=production`) passiert — im
         Railway-Log direkt sichtbar. `checkout.js`s Catch-Block loggt den
         echten Fehler jetzt zusätzlich per `console.error('[checkout] …')`
         in die Browser-Konsole, statt ihn nur als generische Toast-Meldung
         zu verstecken — beim nächsten Fehlschlag bitte die Browser-Konsole
         (F12 → Console) mitschicken, das verrät sofort den echten
         Fehlercode.
      **Noch offen:** von dir bestätigen, ob Punkt 2 die tatsächliche
      Ursache war (Railway-Var prüfen + erneut testen).
- [x] **Bug (2026-09-16, gemeldet & behoben): Preise-Sektion → Kasse verlor
      Intervall & Kinderzahl** — Jährlich + Infinite + 3 Kinder ausgewählt,
      Kasse zeigte trotzdem Monatlich und berechnete nur 1 Kind.
      **Ursache:** die „…testen"-Links auf den Preiskarten
      (`marketing.js` `priceCard`/`priceCheckoutHref`, vormals inline in
      `priceCard`) wurden einmalig beim Rendern gebaut (nur
      `?plan=<tarif>`, ganz ohne `interval`/`tier`/`seats`) und nie
      aktualisiert — der Intervall-Toggle und der Kinderzahl-Stepper
      (`priceInit`/`apply()`) haben nur den angezeigten Preis, nicht den
      Link, neu berechnet. `checkout.js` bekam dadurch nie mehr als
      `plan=infinite`, fiel auf `interval=monthly` zurück und behandelte
      es mangels `plan=family` als Einzelplatz (`sitze: 1`). Fix: `apply()`
      schreibt jetzt bei jeder Änderung die `href` aller
      `[data-cta-plan]`-Buttons neu (`priceCheckoutHref(name, state.i,
      state.s)`) — bei >1 Kind als `?plan=family&tier=…&seats=…&interval=…`,
      sonst als `?plan=<tarif>&interval=…`. Mit Node gegen `checkout.js`s
      Parameter-Logik durchgerechnet (Jährlich+Infinite+3 Kinder →
      korrekt `family`/`infinite`/`3`/`yearly`).
- [x] **Preise-Seite (`/preise/`) + Eltern-only Signup** (2026-09-16, auf
      Nutzer-Feedback „Preise/Payment-System ist eine Katastrophe" — Auswahl
      ging beim Umweg über die Kasse verloren, Konto-/Kinder-Anlegen-Prozess
      war unübersichtlich):
      1. **Eigene Preise-Route statt Homepage-Anker.** `marketing/preise/`
         (neu) rendert dieselbe Preis-Sektion wie zuvor die Startseite
         (`LAB_SECTIONS` `price`, fixed v4 in `marketing.js`) — nur auf
         eigener, dunkler Seite (`.pricepage` in `marketing.css`), ab
         Desktop-Breite fest auf Viewport-Höhe (kein Scroll, siehe
         `min-width:780px`-Regel). Header wird zur immer-hellen Pille
         (neuer `data-hd="5"`-Header-Zustand) statt transparent-über-Hero,
         weil die Seite selbst schon dunkel ist und nicht scrollt.
         Preis-Sektion für den dunklen Hintergrund neu eingefärbt
         (`landing-lab.css`, `body[data-page="preise"] #price-section …`),
         Stimmen-Sektion ausgeblendet (Platz für die Viewport-Höhe).
      2. **Alle CTAs zeigen jetzt auf `/preise/`** statt direkt auf
         `/registrieren/` bzw. `/#price` — Nav (`NAV_LINKS`), Footer
         (`FOOTER`), Header-„Kostenlos starten", alle `.lab-cta`/`.cta-*`-
         Buttons in `marketing.js` (per `replace_all` auf
         `href="/registrieren/"` → `href="/preise/"`, 22 Stellen), die
         Hero-Buttons in `index.html`/`ueber-uns/index.html`, der
         „Kostenlos registrieren"-Link auf `login/` und der „Zurück zu den
         Preisen"-Link auf `checkout/`.
      3. **Registrierung ist jetzt Eltern-only.** `marketing/registrieren/`
         hat keinen Rollen-Picker und keine Kind-Name/Klassenstufe-Felder
         mehr, nur noch „Ihr Name" + E-Mail + Passwort. Backend:
         `registrierenBody` (`api/src/routes/auth.ts`) nimmt nur noch
         `{name, email, passwort, einwilligung}`, `rolle` ist serverseitig
         fest `elternteil`. `User.klassenstufe` in `schema.prisma` auf
         `String?` gesetzt (Migration `20260916160602_klassenstufe_optional`,
         nur `DROP NOT NULL` — additiv, gegen die echte Supabase-DB gefahren)
         und bleibt nur bei Kind-Profilen (`rolle = schueler`, weiterhin
         Pflichtfeld in `POST /abo/kinder`) gesetzt.
         `auth.test.ts` entsprechend angepasst (Rollen-Validierungstest
         entfernt, da `rolle` kein Client-Input mehr ist), lief grün gegen
         die echte Supabase-DB.
      4. **Kasse schickt ohne Konto sofort zur Registrierung** (`checkout.js`,
         `location.href = '/registrieren/' + location.search`), statt erst
         nach dem Ausfüllen der Zahlungsdaten mit „zuerst
         registrieren/anmelden" zu scheitern. `auth-forms.js`s
         Registrierung→Kasse-Redirect trägt jetzt zusätzlich `tier`/`seats`
         mit (vorher nur `plan`/`interval` — derselbe Fehlerklasse wie der
         Kasse-Link-Bug oben, hier vor dem Live-Auftreten gefixt) — end-to-
         end mit einer echten Test-Registrierung gegen die Supabase-DB
         verifiziert (Jährlich+Infinite+3 Kinder → landet exakt so in der
         Kassen-Zusammenfassung „Lesify Familie · Infinite · 3 Kinder",
         Test-User danach wieder gelöscht).
      5. **Korrigierte Altentscheidung:** die frühere Regel „Solo-Elternteil
         (1 Sitz) hat kein Kind-Profil, der Account ist selbst der
         Lernaccount" ist gestrichen (siehe `backend-planning.md` §1
         „Eltern-Kind-Modell" für die Korrektur-Notiz). `app/assets/js/
         auth-gate.js`s Weiche leitet jetzt **jedes** `rolle = elternteil`-
         Konto immer in den Eltern-Bereich (ohne Kind-Profil →
         `eltern-kinder.html`, sonst `eltern.html`) statt Solo-Konten wie
         Schüler-Accounts direkt auf `dashboard.html` zu lassen.
         `checkout-erfolg/` verlinkt jetzt „Erstes Kind hinzufügen" →
         `eltern-kinder.html` statt „Zur App" → `dashboard.html`.
      6. **Nebenbei-Fix:** `app/einstellungen.html` blendete für
         Eltern-Accounts das jetzt leere `klassenstufe`-Feld als literalen
         Text „null" ein (JS-`input.value = null` → String „null") und hätte
         beim Speichern mit leerem String an der Backend-Validierung
         (`min(1)`) scheitern können — Feld wird für `rolle = elternteil`
         jetzt ausgeblendet und beim Speichern gar nicht erst mitgeschickt.

      Kind-Profile anlegen/entfernen (`eltern-kinder.html`, Sitz-Deckel) und
      Sitze nachträglich hinzufügen/entfernen (`eltern-abo.html`, `PATCH
      /abo`) waren bereits vollständig gebaut — hier nicht angefasst.
- [x] **Stripe Test-Modus produktiv verdrahtet** (Entscheidung 2026-09-14:
      erst Test-Modus, dann später separat auf Live umsteigen; `STRIPE_SECRET_KEY`
      + `STRIPE_WEBHOOK_SECRET` bei Railway gesetzt). End-to-End auf der echten
      `lesify.de` verifiziert: Registrieren → Kasse → Testkarte
      `4242 4242 4242 4242` → „Dein Abo ist startklar" — `stripe.confirmSetup`
      lief gegen einen echten Stripe-SetupIntent durch (mit fehlendem/falschem
      `STRIPE_SECRET_KEY` wäre das serverseitig ein Fake-Ref gewesen und
      `confirmSetup` hätte im Browser einen Fehler geworfen). War:
      1. [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
         (Test-Modus-Toggle oben rechts muss an sein) → **Secret key**
         (`sk_test_…`, Gegenstück zum bereits im Client hinterlegten
         `pk_test_…` aus `marketing/assets/js/stripe-config.js`) kopieren →
         als `STRIPE_SECRET_KEY` bei Railway setzen.
      2. [dashboard.stripe.com/test/webhooks](https://dashboard.stripe.com/test/webhooks)
         → **Add endpoint** → URL `https://lesify-production.up.railway.app/abo/webhook`
         → Events: `customer.subscription.created`, `.updated`, `.deleted`,
         `invoice.paid`, `.payment_succeeded`, `.payment_failed` (siehe
         `backend-planning.md` §4 „Abo & Abrechnung").
      3. Nach dem Anlegen das **Signing secret** (`whsec_…`) des Endpoints
         kopieren → als `STRIPE_WEBHOOK_SECRET` bei Railway setzen.
      4. Railway redeployt automatisch — danach läuft serverseitig
         `StripeZahlungsGateway` statt `FakeZahlungsGateway`.
      5. Test: Registrieren → Kasse mit Stripe-Testkarte `4242 4242 4242 4242`
         (beliebiges zukünftiges Datum, beliebige CVC) → Abo sollte bei
         Stripe (Test-Modus-Dashboard) und in der DB (`status: test`) landen.
- [x] **Öffentliche Kasse live geschaltet** (Entscheidung 2026-09-14):
      `checkout.js`s `CFG.mode === 'demo'`-Gate entfernt — `lesify.de/checkout`
      löst jetzt echte `POST /abo`-Aufrufe aus, nicht mehr nur „validiert,
      kein Abschluss". Ohne `STRIPE_SECRET_KEY` (siehe Punkt oben) läuft
      serverseitig weiterhin der `FakeZahlungsGateway` — es entsteht also
      erst nach Schritt 1–4 oben eine echte (Test-)Stripe-Subscription.
      `stripe-config.js`s `mode`-Feld ist jetzt rein informativ
      (`'test'`/`'live'`), steuert nichts mehr im Code.
- [x] **Preistabelle final** (2026-09-14, komplette Tabelle von dir geliefert:
      Einzel + Familie × 2/3/4 Sitze, monatlich/jährlich, normal/Angebot).
      Dabei mehrere vorbestehende Dateninkonsistenzen über alle drei
      Preisquellen hinweg korrigiert (waren sich teils untereinander
      uneins — echte Bugs, nicht nur Platzhalter):
      - `shared/src/abo.ts` (**bestimmt die tatsächlich abgerechneten
        Beträge**): alle Jahres-Familienpreise waren falsch (z. B. Starter×3
        jährlich: 405,48 € statt korrekt 395,88 €), alle `normal`-Listenpreise
        falsch/verschoben.
      - `marketing/assets/js/stripe-config.js` (Kasse): gleiches Muster,
        jetzt korrigiert; `normal`/`normalPerMonth` für Familien-Jahrespreise
        ergänzt (fehlten komplett).
      - `marketing/assets/js/marketing.js` (Preis-Seite `index.html#price`):
        rechnete Familienpreise bisher nur **näherungsweise** über einen
        `seatFactor` (`[1, 1.8, 2.5, 3.1]`) hoch, statt die echten
        Tarif×Sitz-Beträge zu zeigen — jetzt exakte Tabelle pro Tarif/Sitz,
        `seatFactor` entfernt. Lokal gegen alle Tarif×Sitz×Intervall-
        Kombinationen verifiziert (stimmt exakt mit deiner Tabelle überein).
      - Dein Wunsch „bei Jahresabos immer den Monatsbetrag zeigen (Gesamt pro
        Monat)" war UI-seitig auf der Preis-Seite schon so gebaut (Jährlich-
        Toggle zeigte schon `/ Monat`) — jetzt mit den korrekten Zahlen
        dahinter statt der `seatFactor`-Näherung. Kasse (`checkout.js`) zeigt
        bei Jahresabos zusätzlich „(entspricht X € / Monat)" im Fließtext.
      Weiterhin offen, reine Geschäftsentscheidung: Angebotsdauer/
      -verlängerung, ob der Rabattpreis dauerhaft an den Vertrag gebunden
      bleibt.
- [ ] **Stripe Live-Modus** + Rechnungsstellung + Umgang mit fehlgeschlagenen
      Zahlungen (Retry/Mahnlogik) — eigener Schritt nach dem Test-Modus oben,
      sinnvoll erst wenn die Preis-Feinheiten (siehe oben) final sind.
- [ ] **Anthropic-Produktions-Key mit Budget-Limit** — weiterhin deine
      Entscheidung/dein Account (Anthropic-Konsole: Key erzeugen, Budget-Cap
      setzen, dann `ANTHROPIC_API_KEY` bei Railway eintragen; ohne Key läuft
      weiter der `FakeKiClient`, kein Blocker).
      **Technischer Teil erledigt (2026-09-14):** `pnpm dev` lud `api/.env`
      bisher gar nicht (nur die Testsuite tat das über `vitest.setup.ts`) —
      `api/src/index.ts` importiert jetzt `dotenv/config` als allerersten
      Import (muss vor `env.js` laufen). `dotenv` von `devDependencies` zu
      `dependencies` verschoben, da der Import jetzt auch im produktiven
      Build (`dist/index.js`) mitläuft (in Produktion no-op, da dort keine
      `.env`-Datei liegt). Isoliert verifiziert: frisch gestarteter
      `tsx`-Prozess ganz ohne mitgegebene Env-Vars (nur `PORT` override) zeigt
      `db:true` unter `/health`.

### 5. E-Mail-Versand

- [x] **E-Mail-Anbieter gewählt: Resend** — _2026-09-17: `api/src/lib/mailer.ts`
      (`MailGateway`, `ResendMailGateway`/`FakeMailGateway` nach dem Muster von
      `zahlung.ts`/`storage.ts`), aktiv sobald `RESEND_API_KEY` gesetzt ist
      (`api/.env.example`, `RESEND_API_KEY`/`EMAIL_ABSENDER`/`MARKETING_URL`).
      `POST /auth/registrieren` und `POST /auth/passwort-vergessen`
      verschicken jetzt echte Mails (Mail-Fehler lassen die Requests nicht
      scheitern, nur Logging — siehe `docs/RUNBOOK.md`). Neue Marketing-Seite
      `marketing/email-bestaetigen/` als Ziel des Bestätigungslinks (gab es
      vorher nicht). Dev-Modus gibt weiterhin zusätzlich den Roh-Token in der
      Antwort zurück, damit der Flow ohne Mail-Postfach testbar bleibt.
      Getestet: `api/src/lib/mailer.test.ts` (2), bestehende `auth.test.ts`
      (15) weiterhin grün. **Ops erledigt (2026-09-18):** Resend-Domain `send.lesify.de`
      verifiziert (Absender daher `no-reply@send.lesify.de`), Railway-Variablen
      `RESEND_API_KEY`/`EMAIL_ABSENDER`/`MARKETING_URL` gesetzt, Live-Test über
      `www.lesify.de/passwort-vergessen/` erfolgreich. Mails jetzt gestaltet
      (`api/src/lib/mailTemplates.ts`: Logo, Button, Footer, Klartext-Variante);
      dieselbe Vorlage für die **Kind-Einladung** (`POST /abo/kinder/:id/einladung`
      verschickt jetzt ebenfalls eine Mail, 2026-09-18)._
- [ ] **Klausur-Erinnerung + Wöchentliche Zusammenfassung:** die Toggles
      existieren in `einstellungen.html`, sind aber wirkungslos, bis ein
      Versandweg feststeht (bewusst zurückgestellt, siehe
      `backend-planning.md` §8).
- [ ] **Kontaktformular-Zielsystem:** wohin sollen `POST /kontakt`-Nachrichten
      tatsächlich gehen (Postfach/Ticketsystem)?

### 6. Betrieb (Phase 15/16)

- [x] **Bug (2026-09-14, live gemeldet & behoben): Zufällige Logouts beim
      Seitenwechsel.** `app/assets/js/auth-gate.js` warf bei **jedem**
      Fehlschlag von `GET /auth/me` sofort zum Login raus (`raus()`) —
      nicht nur bei einer echten `401`/ungültigen Session, sondern auch bei
      Netzwerkfehlern, `429` (Rate-Limit) oder `5xx`. Auf Railway (echte
      Netzwerklatenz statt `localhost`) reicht schon ein kurzer Hänger beim
      Seitenwechsel, um rauszufliegen, obwohl die Session noch gültig ist.
      Fix: nur noch bei `err.status === 401` ausloggen, alles andere lässt
      die Seite normal weiterlaufen. Lokal (Logik-Check aller vier
      Fehlerfälle) und live gegen `lesify.de` verifiziert.
- [x] **Bug (2026-09-16, gemeldet & behoben): Seiten laden spürbar verzögert,
      dann erscheint alles auf einmal.** Ursache mit Timing-Messung gegen die
      echte Supabase-DB (`eu-west-1`) bestätigt: jede Seite rendert nichts,
      bis **alle** ihre `Lesify.*()`-Calls durch sind (Dashboard z. B. 7
      parallele Requests, siehe `app/dashboard.html`), und `requireAuth`
      machte dabei bei **jedem einzelnen** dieser Requests einen eigenen
      `prisma.session.findUnique`-Roundtrip (~150-450 ms je Query, gemessen).
      Fix: `SessionCache` (`api/src/lib/sessionCache.ts`, TTL 30 s) hält
      validierte Sessions kurz im Speicher, spart den DB-Lookup bei
      wiederholten Requests mit demselben Token — 7-paralleler Seitenaufruf
      lokal gemessen von ~477 ms auf ~215 ms. Details + Trade-off in
      `Konzept-texts/backend-planning.md` (§ Umsetzung Phase 3, Abschnitt
      „Session-Cache"). Nicht angefasst: das All-or-nothing-Rendermuster
      selbst (Skeleton/Ladezustand) und einzelne unnötig sequenzielle
      Awaits (z. B. `thema.html`) — auf Wunsch des Nutzers bewusst offen
      gelassen, siehe unten.
- [ ] **Skeleton/Ladezustand statt leerer Seite** (Folgeidee aus obigem Bug,
      noch nicht umgesetzt): Seiten zeigen bis zum ersten Render nichts außer
      leeren `<div>`s — ändert die reale Ladezeit nicht, aber die gefühlte.
- [ ] **Sequenzielle statt parallele Awaits vor dem ersten Render** (Folgeidee,
      noch nicht umgesetzt): z. B. `thema.html` lädt `Lesify.faecher()` und
      `Lesify.getThema()` nacheinander statt gleichzeitig, obwohl beide
      unabhängig sind — ein Roundtrip weniger pro Seitenaufruf möglich.
- [ ] **Error-Tracking-Anbieter** (z. B. Sentry) — DSN besorgen, anschließen.
- [ ] **DB-Backups:** Supabase-Feature aktivieren + einmal einen echten
      Restore testen.
- [ ] **Auth-Lockout-Policy bestätigen:** aktuell nur IP-Drosselung mit
      exponentiellem Backoff, kein harter Account-Lockout nach X
      Fehlversuchen — reicht das, oder soll ein Lockout dazu?

### 7. Optionale Aufräumarbeiten (keine Entscheidung nötig, nur FYI)

- [x] **Datei-Viewer** (2026-09-14): echte Bild-/PDF-Vorschau in
      `openDateiModal()`/`renderDateiModal()` (app.js) über
      `Lesify.dateiInhaltUrl(id)` (signierte Storage-URL, 302-Redirect) —
      `<img>` für `typ: 'img'`, `<embed type="application/pdf">` für
      `typ: 'pdf'`; DOC bleibt beim bisherigen Text-Mockup (Word lässt sich
      nicht sinnvoll inline rendern). Bild-Ladefehler fallen automatisch auf
      das alte Icon-Placeholder zurück. „Herunterladen" lädt jetzt ebenfalls
      die echte Datei statt eines generierten Zusammenfassungs-`.txt`, wenn
      `dateiInhaltUrl` verfügbar ist (sonst wie bisher der Fallback für
      Dummy-Daten ohne `api.js`). Lokal gegen den echten Dev-Stack verifiziert
      (Bild- und PDF-Upload über die echte API, Vorschau im Browser bestätigt
      — Bild lädt mit korrekten Pixeldaten, PDF öffnet im nativen
      Browser-Viewer mit Download/Print-Toolbar). **Nachtrag (2026-09-14):**
      `renderDateiModal()` pollt jetzt selbst mit dem bereits vorhandenen
      `Lesify.pollDateiStatus(id)` (dieselbe Funktion, die `dateien.html`/
      `thema.html`/`chat.html` schon nach dem Upload nutzen), solange eine
      im Modal geöffnete Datei noch `status: 'verarbeitung'` hat — Status-
      Zeile, KI-Zusammenfassungs-Box und (bei DOC) der Vorschau-Text
      aktualisieren sich live, sobald die Verarbeitung fertig ist, ohne dass
      ein Reload nötig ist. Guard über `typeof Lesify.pollDateiStatus ===
      'function'` (fehlt im Dummy-Daten-Pfad `data.js` — dort bleibt es beim
      bisherigen Reload-Verhalten) + `document.body.contains(scrim)`-Check,
      falls das Modal vorher geschlossen wurde. Syntaxgeprüft
      (`node --check`) und die betroffene Seite (`dateien.html`) im
      Dev-Stack ohne Konsolenfehler geladen; das eigentliche Live-Update
      selbst ließ sich mit den verfügbaren Browser-Tools nicht automatisiert
      auslösen (kein Datei-Upload-Automatisierungspfad) — bitte einmal
      manuell gegenprüfen: Datei hochladen, Modal während der Verarbeitung
      offen lassen, prüfen dass Status/Zusammenfassung ohne Reload umspringen.
- [x] **Dev-Switcher entfernt** (2026-09-14, nach deiner Durchsicht):
      - **Suche → „Kachel" final.** `app.js` (`searchResultsHtml`/
        `searchDropdownHtml`/`searchRow`) fest auf Variante 2, restliche
        4 Varianten (Linie/Fläche/Badge/Punkt) samt CSS entfernt.
        **Nebenbei gefunden:** Die volle Ergebnisseite (`suche.html`) hatte
        zwei Bugs, die sie optisch von der Dropdown-Schnellsuche
        (`dashboard.html`) unterschieden — (1) ein `card`/`divide-list`-
        Rahmen um die Zeilen, den die Dropdown nie hatte, jetzt entfernt;
        (2) `suche.html` lud nirgends `Lesify.faecher()`, wodurch der
        Fach-Farb-Cache leer blieb und Zeilen immer grau statt fach-
        eingefärbt waren (`dashboard.html` füllt den Cache nebenbei über
        sein Fächer-Widget) — jetzt lädt `suche.html` den Cache selbst vor.
        Beide Seiten sehen jetzt bit-genau gleich aus, live gegen den
        Dev-Stack verifiziert.
      - **Testklausur-Phasen-Umschalter entfernt.** `testklausur.html`
        zeigt nur noch den echten Status (`t.status`), `stageOverride`/
        `TK_STAGES`/`initStageDev()` komplett raus.
      - **„Pill-Style"** war kein eigener Umschalter (nirgends im Code
        gefunden) — vermutlich bereits fest verdrahtete Pill-Buttons bei
        Preis-/Sitzplatz-Reglern, nichts zu entfernen.
      - **Nebenbei gefunden, mit entschieden:** `marketing/ueber-uns/
        index.html` hatte einen weiteren, bisher nicht gelisteten
        Dev-Switcher (Hero, 10 Varianten). Final auf v2 gewählt, die
        anderen 9 Varianten samt Umschalter-Script entfernt. Dabei
        CSS-Bug gefixt: `.au-hero-portrait.au-img-2`s `min-height` nutzte
        einen größeren `vw`-Clamp (46vw) als das Foto selbst (42vw) —
        die Section war dadurch spürbar höher „gestreckt" als nötig.
        `min-height` jetzt exakt auf den Foto-Clamp gesetzt (Foto-/
        Textgröße unverändert), live verifiziert: Section-Höhe entspricht
        jetzt exakt der Foto-Höhe (vorher spürbar mehr).
- [x] **„Datenexport"/„Konto löschen"-Buttons in `einstellungen.html`
      (Schüler-Seite)** — gebaut 2026-09-14, auf Zuruf. Karte „Daten &amp;
      Aufbewahrung" um zwei Buttons ergänzt: „Daten exportieren" (`GET
      /user/export` per `fetch` + Blob-Download, gleiches Muster wie
      `eltern-datenschutz.html`) und „Konto löschen" (eigenes
      Passwort-Bestätigungs-Modal → `Lesify.loeschenKonto(passwort)`, danach
      Token gelöscht + Redirect auf `/`). Lokal gegen den echten Dev-Stack
      end-to-end verifiziert: Export liefert echten JSON-Export, falsches
      Passwort wird mit 401 abgefangen (Modal bleibt offen), richtiges
      Passwort löscht das Konto wirklich (Login danach 401, E-Mail sofort
      wieder frei registrierbar).
- [x] **Fach-Demo-Bug in der Struktur-Section behoben** (2026-09-16):
      `ORG.fach` (marketing.js) zeigte eine erfundene „bereits geschriebene"
      Klausur (`klausurPast`) unter der aktuellen — raus, nur noch die eine
      anstehende Klausur. Alle drei Themen-Karten (Gedichtanalyse,
      Erörterung, Satzglieder) haben jetzt einheitlich die hervorgehobene
      `is-on`-Optik statt nur der ersten.
- [x] **Auto-Play-Demos liefen schon vor dem Sichtbarwerden los** (2026-09-18):
      Chat-Live-Demo (`#chat`, `data-chat-auto`), Lernplan-Demos
      (`kvlInit`/`kvInit`) und Org-Demo (`orgInit`) starteten ihren
      `setTimeout`/`setInterval`-Ablauf sofort beim Bau der Section
      (`buildLabSections()`/`buildChatSection()` laufen einmalig beim
      Laden) — unabhängig vom Scroll-Stand. Wer erst später zur Section
      scrollte, sah die Demo schon mehrere Schritte durchgelaufen. Neuer
      Helper `onVisible(el, cb)` (IntersectionObserver, Schwelle 30 %) in
      `marketing.js` gated jetzt den jeweils ersten `start()`-Aufruf auf
      den Moment, in dem die Section tatsächlich in den Viewport kommt;
      danach laufen die Intervalle wie bisher weiter. Lokal gegen einen
      Server (nicht `file://`) verifiziert: Demo-Log/`data-org-active`
      bleiben bei Idle ohne Scrollen mehrere Sekunden unverändert und
      starten erst nach dem Scrollen zur Section.
- [x] **Klausurvorbereitung-Demo startete bei Tag 3 statt Tag 1** (2026-09-18):
      `renderKv` Variante 5 (die final gewählte, fixe Center-Variante) rief
      `kvlMock()` ohne `active` auf — der Default (`active: 2`) ließ die
      Demo direkt bei Tag 3 einsteigen, dazu passend nur der dritte Punkt
      unten hervorgehoben. Jetzt explizit `active: 0` übergeben, Start-Dot
      entsprechend auf Tag 1 verschoben.
- [x] **Dev-Panel für zwei offene Layout-Fragen reaktiviert** (2026-09-16,
      `mountLabDev()` wieder in `DOMContentLoaded`, `LAB_SECTIONS`/
      `labSectionApi` um ein `def`-Fallback-Feld erweitert): Rest der
      Sections bleibt `fixed`, nur zwei Achsen offen, unten rechts sichtbar
      auf `index.html`, bis du dich entscheidest — dann wieder auf `fixed`
      setzen und `mountLabDev()` entfernen.
  - [x] **„Fächer"-Kachel-Raster (`orgfaecher`, 10 Varianten):** zeigt bewusst
        nur 6 kuratierte Fächer statt aller 18 (Subheadline nennt 18) — neue
        Karte „+12 weitere" zwischen Geschichte und „Eigenes Fach" schließt
        die Lücke zwischen gezeigter Anzahl und genannter Zahl, in allen
        10 Varianten enthalten (Zahlen-Kachel/Ghost/Avatar-Stack/Pill-Reihe/
        Bento/Dark/Scroll-Reihe/Kompakt-Liste/Ring/Editorial). Default: v1.
  - [x] **Vergleichs-Section (`cmp`) neu ausgerichtet:** bisheriger Inhalt
        „Lesify vs. klassische Nachhilfe" (6 allgemeine Vorteils-Zeilen) bleibt
        unverändert als **v11 „Aktuell"** erhalten und ist der Default
        (`def: '11'`, Live-Verhalten unverändert, solange nicht umgeschaltet).
        Neu dazugekommen: 10 Varianten (v1–v10) um ein neues Preisargument
        „30 Tage Lesify Premium oder eine Stunde Nachhilfe — für ungefähr
        denselben Preis" (`CMP_VALUE`, 6 Zeilen: Preis unentschieden, Premium
        gewinnt Nutzungsdauer/Fächer/KI-Nachrichten/Klausurvorbereitung/
        Verfügbarkeit). Sobald eine Richtung final ist: `LAB_SECTIONS`-Eintrag
        auf `fixed` setzen.
- [x] **Beide offenen Layout-Fragen final entschieden** (2026-09-16, nach
      deiner Durchsicht) — `LAB_SECTIONS` auf `fixed` gesetzt, `mountLabDev()`
      wieder aus `DOMContentLoaded` entfernt, kein Dev-Panel mehr:
  - [x] **„Fächer"-Kachel-Raster:** **v2 „Ghost"** gewählt (`orgfaecher`
        `fixed: '2'`) — „+12 weitere" als gestrichelte Karte mit
        Auslassungs-Icon statt Zahlen-Kachel.
  - [x] **Vergleichs-Section:** **v1 „Cards"** gewählt (`cmp` `fixed: '1'`),
        die alte "Lesify vs. klassische Nachhilfe"-Section (ehem. v11) ist
        damit vom Netz. Content von 6 auf **9 Zeilen** erweitert (Preis,
        Nutzungsdauer, Erreichbarkeit, Fächer, Themen, Klausurvorbereitung,
        Organisation, Selbstständigkeit, Motivation — Wortlaut von dir
        geliefert). Kopf: Eyebrow/Headline aus dem neuen `CMP_VALUE` bleiben
        ("Gleicher Preis, mehr Wert" / "30 Tage Lesify Premium oder eine
        Stunde Nachhilfe."), Subheadline bewusst auf den bisherigen Text
        zurückgesetzt ("Preis, Verfügbarkeit, Flexibilität, messbare
        Ergebnisse u. v. m. …"). Der Preisspannen-Hinweis unter den Karten
        ist raus. Gewinner-Markierung: grüner Haken bleibt, die unterlegene
        Seite bekommt jetzt einen **roten X-Akzent** (`--rot`/`--rot-bg`,
        `.cmp-i--x`) statt des neutralen grauen Strichs — nur die echte
        Unentschieden-Zeile (Preis) bleibt neutral grau.
- [x] **Preise-Headline entschärft** (2026-09-16): überschnitt sich inhaltlich
      mit der neuen Vergleichs-Section ("60 Minuten Nachhilfe oder ein ganzer
      Monat Lesify Premium." stand an beiden Stellen) — `PRICE.h` jetzt
      „Monatlich kündbar, 14 Tage kostenlos testen.", Rest der Preise-Section
      unverändert.
- [x] **Preise-Seite (`/preise/`) Layout-Bug behoben** (2026-09-17, gemeldet
      als "alles wirkt komplett gequetscht"): die auf Viewport-Höhe gesperrte
      `.pricepage` (`overflow: hidden`, kein Scroll ab 780px, siehe
      marketing.css) war auf normalen Laptop-Bildschirmen (z. B. 1366×768)
      **~200px höher als der sichtbare Bereich** — Kopfzeile oben und Buttons
      unten wurden abgeschnitten. Zusätzlich fehlte dem `.price-grid` (v4/v6)
      jede Umbruch-Regel unter 760px, wodurch die 3 Karten auf Mobile
      nebeneinander gequetscht aus dem Viewport liefen.
  - Layout/Spacing bleibt **fest v4** (Entscheidung 2026-09-17, nach
    Vergleich mit einer probeweisen "v7 Natürlich"-Variante mit
    vh-bemessenen Abständen — wieder verworfen, v4 gewünscht).
  - **Mobile-Fix ist global**: `.price-grid`/`.price-strip` brechen jetzt
    unter 760px auf 1 Spalte um — betraf auch die Startseiten-Section
    gleichermaßen (dieselbe v4-Sektion), daher nicht auf `/preise/`
    beschränkt.
  - **Sicherheitsnetz:** `.pricepage` nutzt `overflow-y: auto` statt
    `hidden` (Inhalt scrollt intern statt abgeschnitten zu werden, falls ein
    Fenster ungewöhnlich kurz ist) und `align-items: safe center`
    (verhindert, dass zentrierter Flex-Inhalt beim Scrollen oben
    abgeschnitten wird).
- [x] **Preise-Seite: Karten-/Umschalter-Farben neu, 7 Paletten + Dev-Switch**
      (2026-09-17, Folge-Feedback: "Coloring ist quasi wie auf der
      Landingpage, das geht offensichtlich nicht" — weißer Hintergrund dort
      vs. schwarzer hier). Layout bleibt v4; nur die Einfärbung ändert sich.
  - **Echter Kontrast-Bug dabei gefunden und gefixt** (nicht nur
    Geschmackssache): `.price-amt b` (der Preis selbst!) und
    `.price-feats li` (die ganze Leistungsliste) hatten gar keine eigene
    Textfarbe und erbten die für die schwarze Bestseller-Karte gedachte
    helle Farbe von `.pricepage` — auf den 2 WEISSEN Karten waren Preis und
    Leistungen dadurch praktisch unsichtbar (fast weiß auf weiß, Kontrast
    ≈ 1:1). Das war vermutlich der Hauptgrund für den "das geht so nicht"-
    Eindruck, nicht nur der Ton der Farben.
  - 7 Paletten über `[data-price-color]` auf `<body>` (kein Re-Render, siehe
    unten) — **v1 Weiß** (Baseline, obiger Kontrast-Fix), **v2 Kontur**
    (Karten transparent mit heller Linie statt Fläche, Bestseller-Karte
    jetzt weiß statt schwarz), **v3 Dunkel** (alle Karten dunkel/angehoben,
    Bestseller mit türkisem Verlauf + Leuchtrand statt Schwarz-auf-Schwarz),
    **v4 Fach-Akzent** (helle Karten, Farbidentität aus
    `Lesify.FACH_COLORS` — Starter blau, Premium türkis, Infinite violett,
    per `:nth-child` da Karten keine Plan-Klasse tragen), **v5 Glas**
    (Frosted-Glass/Blur-Karten), **v6 Gold** (wie v3, Bestseller mit warmem
    Gold-Akzent statt Türkis), **v7 Hell (Startseite)** (2026-09-17
    nachgereicht: repliziert die Preis-Sektion 1:1 wie auf der Startseite —
    weißer Seiten-Hintergrund statt Schwarz, `.pricepage`/Eyebrow/H2/Lead/
    Umschalter zurück auf die normalen hellen Farben, Karten unverändert
    da `.sv--price4 .price-card…` schon immer hell war). Alle 7 in
    `landing-lab.css` (`body[data-page="preise"][data-price-color="N"]
    #price-section …`).
  - **v7-Nachtrag (2026-09-17): Header wie die gescrollte Startseite.**
    Bei `data-price-color="7"` zeigt `#mkt-nav` dauerhaft die dunkle
    Pille (`data-hd="4a"` + erzwungenes `.is-scrolled`, siehe
    `priceNavIsLight()`/`applyPricePageColor()` in marketing.js) statt der
    für die dunklen Paletten gedachten hellen Pille (`data-hd="5"`) — die
    Seite scrollt ja faktisch nie über den Fold hinaus, ohne den Zusatz
    wäre der (für "über dem Hero" gedachte) transparente/helle
    Un-scrolled-Zustand von "4a" auf dem weißen Seitenhintergrund von v7
    unlesbar gewesen. Reagiert auch live auf den Dev-Switch, ohne Reload.
  - Dev-Switch **"Preise-Farben"** unten rechts nur auf `/preise/`
    (`mountPriceColorDev()`, `localStorage['lesify:pricepage:color']`,
    Default `1`) — setzt nur ein `data-price-color`-Attribut, **kein
    Re-Render** nötig, Monatlich/Jährlich- und Kinderzahl-Auswahl bleiben
    beim Umschalten erhalten (anders als der frühere Layout-Dev-Switch, der
    noch `renderPrice()` neu aufrief).
- [x] **Vertrauens-Element (Avatare + Zitat) jetzt auch auf `/preise/` +
      kompakte Fassung in der Kasse** (2026-09-17). Zwei Wünsche:
  1. **`/preise/` zeigt jetzt dieselbe Stimmen-Sektion wie die
     Startseite** (Avatar-Reihe + "+9.994" + Zitat, `priceVoices()` in
     marketing.js) — bis dahin per `display:none` ausgeblendet, um die
     Viewport-Höhe zu sparen (siehe Eintrag oben). Nur der weiße
     Schnittring der Avatare musste für den dunklen Seiten-Hintergrund
     auf `var(--ink-950)` umgefärbt werden (v7/Hell behält den originalen
     hellen Ring, siehe `landing-lab.css`). Die Seite scrollt dadurch auf
     normalen Laptop-Höhen jetzt leicht (das Sicherheitsnetz
     `.pricepage{overflow-y:auto}` fängt das ab, kein Abschneiden mehr).
  2. **Kompakte Fassung links in der Kasse** (`marketing/checkout/`).
     Neue Klasse `.co-voices` (statisches HTML in `checkout/index.html`,
     da diese Seite kein `marketing.js` lädt): 26px-Avatare (gleiche drei
     Personen wie auf `/preise/`, SB/MT/FK) statt 44px.
  - **Auch hier dasselbe Muster wie beim Preise-Fix:**
    `.checkout__summary` (die auf Viewport-Höhe gesperrte linke Spalte,
    kein Scroll ab 901px) nutzt jetzt `overflow-y: auto` statt `hidden`,
    da der neue Block den Inhalt auf kürzeren Bildschirmen leicht über
    den Fold schieben kann.
  - **Nachtrag (2026-09-17):** `.co-voices` stand zunächst direkt unter
    "Nach der Testphase fällig" mit Zitat + Quelle (Blockquote-Stil wie
    auf `/preise/`) — auf Wunsch jetzt **ganz unten**, nach den
    `.co-trust`-Punkten (Stripe/EU), und statt Zitat nur noch Avatare +
    eine Zeile **„10.000+ Eltern vertrauen auf Lesify"** (`.co-voices__txt`,
    eine Reihe statt gestapelt — spart zusätzlich Höhe, passt jetzt auf
    den meisten Laptop-Höhen ohne Scroll).

---

## Phase 0 — Bestandsaufnahme & Entscheidungen

Blockiert alles Weitere. Erst die offenen Produktfragen klären, dann bauen.

- [x] **Prototyp-Parität prüfen:** `assets/js/data.js` gegen `backend-planning.md`
      §1/§2/§9 diffen (Feldnamen, Enums, Statuswerte, Formeln). — _2026-09-03: die
      von den Entscheidungen betroffenen Felder (`Thema.mastery`, `Klausur.note`)
      in beiden Dokumenten entfernt, §1/§4/§5/§6/§7/§8 nachgezogen. Ein voller
      Feld-für-Feld-Abgleich der übrigen Entities steht bei Bedarf noch aus._
- [x] **Alle Nutzer-Flows im Prototyp einmal manuell durchklicken.** — _2026-09-04:
      vorab erledigt, gefundene Bugs sind gefixt._
- [x] **Text-Audit Website + App (2026-09-18):** Zielgruppe **ab Klasse 5**
      (alle „8./9. Klasse"-Texte ersetzt), Anrede **überall Du**, „Nachtest"
      entfernt, Limit-Label „Klausurvorbereitungen", Preis-Einstieg „ab 12,99 €",
      Kündigung monatlich/jährlich je nach Paket, Datenschutz/Einstellungen: Inhalte
      werden mit Kontoende gelöscht, Tippfehler behoben, Test-Chat aus Seed-Daten
      entfernt. _Offen:_ Job `inhalte-aufbewahrung` (löscht nach 365 Tagen) passt
      nicht mehr zum Text; Preis-/Rabatt-Überarbeitung (−20 %) und
      Nutzerzahlen-Claims folgen separat.
- [x] **Getroffene Entscheidungen (Stand 2026-09-03)** — in `backend-planning.md`
      §8 abgehakt und in die betroffenen Abschnitte eingearbeitet:
  - [x] **Limit-Werte je Tarif:** bestätigt, Werte in `stripe-config.js` sind korrekt.
  - [x] **Preise & Intervalle:** monatlich **und** jährlich. **MwSt. wird nicht
        ausgewiesen** (Kleinunternehmerregelung — intern vermerkt, **nirgends auf
        der Website erwähnen**). _Noch offen:_ Angebotsdauer, Jahrespreis-Rundung,
        ob der Angebotspreis dauerhaft an den Vertrag gebunden bleibt.
  - [x] **Limit erreicht:** **Hard-Stop nur des betroffenen Features.** Datei-Limit
        erreicht → Uploads gesperrt, Chats und (Test-)Klausuren laufen normal weiter.
        Kein Soft-Warning, keine automatische Upgrade-Erzwingung.
  - [x] **Trial:** **14 Tage** (nicht 7). Nach 14 Tagen wird **automatisch der
        Monatsbetrag abgebucht**, sofern nicht vorher gekündigt — echter
        Stripe-Trial → Subscription, kein separater „Trial-Ende"-Zustand, keine
        eigenen Reminder-Mails (Stripe übernimmt die Zahlungs-Mails).
  - [x] **Zahlungsanbieter:** **Stripe.**
  - [x] **Schul-SSO:** **kommt nicht.** Button in `login.html` entfernen,
        `GET /auth/sso/schule` streichen.
  - [x] **Eltern-Kind-Modell:** **wird später geklärt** (Registrierung fragt die
        Rolle weiter ab, tiefere Mechanik zurückgestellt).
  - [x] **Familien-Sitz hinzufügen/entfernen:** Mechanik **später**. Fest: beim
        **Entfernen eines Sitzes werden dessen Inhalte gelöscht.**
  - [x] **`Thema.mastery`:** **wird ersatzlos entfernt** (war nie real hergeleitet)
        — aus `data.js`, `app.js`, `testklausur.html` und `backend-planning.md`.
  - [x] **Testklausur-Lösungs-Uploads:** **ausgenommen** vom Datei-/Content-Limit.
  - [x] **Usage-Reset:** **fix zum Monatsersten.**
  - [x] **Erreichte `Klausur.note`:** **wird nirgends eingetragen** — Lesify ist zur
        Vorbereitung da, das Endergebnis ist irrelevant. Feld `Klausur.note` und die
        „Deine Note"-Anzeige auf geschriebenen Klausur-Karten entfallen; der
        „Geschrieben"-Zustand (aus `datum` abgeleitet) bleibt als neutraler Chip.
  - [x] **Datenaufbewahrung:** **alle Inhalte** (Dateien, Klausuren, Chats,
        Lernzettel, Testklausuren, Lernpläne) werden **nach einem Jahr automatisch
        gelöscht.** Dieser Hinweis muss in den Einstellungen (oder an der dafür
        besten Stelle) sichtbar stehen. Ersetzt die offene „Archivierungs"-Frage.
  - [x] **Benachrichtigungs-Versand:** **keine eigene E-Mail-Infrastruktur** — die
        wichtigen Mails (Zahlung, Abo, Beleg) laufen über Stripe. Eigener Versand
        von Klausur-Erinnerung / Wochenreport ist zurückgestellt.
  - [x] **KI-Missbrauchsschutz:** die KI darf **nur für schulrelevante Themen**
        genutzt werden. Alles darüber hinaus wird **direkt abgeblockt** (Guard vor
        jedem Chat-/Generierungs-Call, siehe Phase 6 + Phase 15).
  - [x] **Weitere Entscheidungen (2026-09-04):**
    - **Chat-Titel:** kurzer KI-Call nach der ersten Nachricht (Prompt 07), an
      `POST /chats/:id/nachrichten` angehängt. Client-Kürzung nur im Prototyp.
    - **Dritte Testklausur:** Backend lehnt einen dritten `POST /testklausuren`
      zur selben `klausurId` **hart ab** — genau zwei pro Klausurvorbereitung.
    - **Lernplan-Neustart:** gibt es nicht — pro Klausur genau ein 7-Tage-Zyklus.
  - [x] **Marketing-Website auf vier Seiten (2026-09-08):** Nur noch Home,
        Preise, Über uns, FAQ in der Navigation. Funktions-Unterseiten
        (`funktionen.html` + `feature-*.html`) und `vergleich.html` eingestellt,
        Inhalte auf die Startseite verlagert (`index.html#vergleich`).
        `ueber-uns.html` wird zur persönlichen Gründer-Seite. Details/Prüfung im
        Marketing-Block dieser Phase; `backend-planning.md` §11 nachgezogen.
  - [x] **`preise.html` + `faq.html` eingestellt (2026-09-12):** Beide Nav-
        Einträge bleiben („Preise", „FAQ"), verlinken jetzt aber auf die
        bereits vorhandenen Startseiten-Abschnitte `index.html#price` /
        `index.html#faq` statt auf eigene Seiten — dieselbe Konsolidierung
        wie zuvor bei Funktions-Unterseiten/`vergleich.html`. Preis-Karten +
        Sitzplatz-Rechner (`PRICE`-Objekt, `renderPrice`/`priceInit`) und
        FAQ-Einträge (`FAQ`-Objekt, `renderFaq`) waren als Startseiten-
        Abschnitte bereits vollständig vorhanden; nur `checkout.html`
        (Zurück-Link) + Nav/Footer in `marketing.js` mussten umgehängt
        werden. Die Familien-Feature-Matrix und die separate Abrechnungs-
        FAQ von `preise.html` haben **kein** Äquivalent mehr auf der
        Startseite — bewusst in Kauf genommen. `backend-planning.md`
        nachgezogen.
  - [x] **Architekturfragen (chatMap, Datei-Status, Suche, Rate-Limiting):**
        entschieden am 2026-09-04 — siehe Abschnitt **„Architekturfragen"** unten.
  - [x] **Interim-Hosting für den Prototyp (2026-09-11):** `marketing/` +
        `app/` (beides statisch, kein Build) laufen über **GitHub Pages**
        (`.github/workflows/pages.yml`, Source = GitHub Actions) auf
        `jannikborn27-spec/lesify`. Struktur: `marketing/` → Site-Root,
        `app/` → `/app`-Unterpfad — **eine** Domain für beides, weil GitHub
        Pages nur eine Custom Domain pro Repo erlaubt (kein echtes
        `app.lesify.de`-Subdomain-Setup). Alle Pfade in den HTML/CSS/JS-
        Dateien sind bereits relativ, daher funktioniert das unter
        `github.io/lesify/…` genauso wie später unter der eigenen Domain.
        `api/` läuft **nicht** über GitHub Pages (kein Static-Host-Ziel) —
        bleibt bis zum echten Deploy (Phase 16) rein lokal/dev. Ersetzt
        nicht die Produktions-Infrastruktur aus Phase 16 (Staging/Prod,
        echtes API-Hosting, Supabase-Produktivbetrieb).
- [x] **Prototyp-Bereinigung aus den Entscheidungen** (im statischen Frontend, vor
      dem Backend-Bau) — _erledigt 2026-09-03_:
  - [x] `Thema.mastery` überall entfernt: Seed + `addThema` in
        [assets/js/data.js](assets/js/data.js); der simulierte Auswertungs-Basiswert
        kommt jetzt aus `themaBasis(themaId)` (stabiler Hash) in `data.js` bzw.
        inline in [testklausur.html](testklausur.html). Keine `mastery`-Referenz mehr.
  - [x] `Klausur.note` + `klausurErgebnisBox` / „Deine Note" entfernt:
        [assets/js/data.js](assets/js/data.js) (Seed + Kommentar),
        [assets/js/app.js](assets/js/app.js) (`klausurErgebnisBox` gelöscht, aus
        `Render`-Export raus, `klausurCard` zeigt für geschriebene Klausuren keinen
        Fuß mehr), [klausur.html](klausur.html) (`drawHead` ohne Ergebnis-Box).
        „Geschrieben"-Flag bleibt.
  - [x] Trial `7` → `14` + Abbuchungs-Logik:
        [frontend/assets/js/stripe-config.js](frontend/assets/js/stripe-config.js)
        (`trialDays: 14` + Kommentare),
        [frontend/assets/js/checkout.js](frontend/assets/js/checkout.js) (Kommentar;
        die UI-Zeile leitet sich aus `trialDays` ab und stimmt damit automatisch),
        „7 Tage" → „14 Tage" in `index.html` / `preise.html` / `registrieren.html` /
        `vergleich.html` / `faq.html` / `checkout.html` / `agb.html`, und alle
        Stellen mit „ohne Zahlungsdaten / kein automatischer Wechsel" auf das neue
        Modell umgeschrieben (Zahlungsart bei Anmeldung, Auto-Abbuchung nach 14 Tagen,
        Kündigung in der Testphase = keine Berechnung). **Die AGB-Klausel (§4) und
        die Datenschutzerklärung müssen in Phase 13 noch rechtlich geprüft werden**
        (Auto-Renewal-/Widerrufs-Pflichtangaben).
  - [x] Schul-SSO-Block (Divider + Button + Inline-Skript) aus
        [frontend/login.html](frontend/login.html) entfernt.
  - [x] [einstellungen.html](einstellungen.html): Karte „Daten & Aufbewahrung"
        mit dem 1-Jahres-Löschhinweis ergänzt.
  - [x] **Dunkles Design (2026-09-08):** Einstellung `settings.darkMode`
        (Karte „Erscheinungsbild" auf `app/einstellungen.html`) — **nur
        eingeloggter Bereich**, Marketing bleibt hell. Token-Override-Block
        am Ende von `app/assets/css/style.css` (`:root[data-theme="dark"]`,
        „Fog Blue"-Rampe semantik-treu invertiert), Anti-Flash-Snippet im
        `<head>` jeder App-Seite + `applyTheme()` in `app.js`,
        `Konzept-texts/backend-planning.md` (Einstellungen-Tabelle) nachgezogen.
  - [x] **Dark-Mode-Lesbarkeitsdurchlauf (2026-09-08):** alle 16 App-Seiten
        (inkl. Modals, Dropdowns, Suche-Varianten, Chat-/Lernzettel-Blasen)
        per Kontrast-Audit geprüft. Behoben: zu dunkler Muted-Ton der
        Ink-Rampe (`--ink-400/500/600` angehoben); `#fff`-Text auf
        invertierten Flächen (`--ink-950`) → `var(--paper)` (Chat-Chips/
        -Avatare, Lernzettel-Blasen, Datei-Dropzone, `.hero-chip.is-primary`);
        helle Fach-Pastelltöne (`--fach-bg`) auf dunklem Grund → dunkle
        Fach-Mischung in `fachColorVars()`/Chat-`--chi-fc`; Overlay-Panels
        ohne sichtbare Kante → heller Rand + Lichtsaum + dunklerer Scrim;
        `.modal-close` ohne `background` (UA-`buttonface`) → transparent;
        Breadcrumb-/Pfeil-Affordances von `--ink-300` → `--ink-400`.
        Bewusst unverändert: weiße Schrift auf Fach-Farbflächen
        (Lernplan-Aktivschritt, Buchstaben-Fach-Avatare) — im Hell-Design
        identisch, gehört zu einem breiteren Design-Review.
  - [x] **Landing-Lab entfernt (2026-09-04):** `frontend/landing-lab.html` und
        `frontend/assets/js/landing-lab.js` gelöscht.
        `frontend/assets/css/landing-lab.css` **bleibt** — die aktuelle
        `frontend/index.html` nutzt seine `lab-*`-Klassen, es ist damit faktisch
        das Landing-Stylesheet. Die öffentliche Website wird ohnehin erst später
        überarbeitet (dann ggf. umbenennen/aufräumen).
  - [x] **Landing-Page (`marketing/index.html`) neu aufgebaut (2026-09-05):**
        fester Section-Plan (Hero → Trust-Ticker → Problem Vorher/Nachher → So
        geht's → Features → Vergleich → Ampel-Prinzip → Zahlen → Testimonial →
        Preise → FAQ → CTA). Tatsächlicher Dateistand (abweichend vom
        ursprünglichen Plan mit `landing.js`/`landing.css`):
        `marketing/assets/js/marketing.js` (Nav/Footer, Reveal, Preis-Umschalter,
        Demo-Formulare, Hero-Slideshow) und `marketing/assets/css/marketing.css`
        (Tokens/Basis) + `marketing/assets/css/landing-lab.css` (`lab-*`-Klassen
        der Sektionen — **weiterhin eingebunden**, nicht durch ein separates
        `landing.css` ersetzt).
  - [x] **Hero-Slideshow rechts, 10 Design-Varianten (2026-09-05):** rechte
        Hero-Hälfte in `marketing/index.html` zeigt 4 Folien (KI-Chat, Lernpläne
        &amp; Klausurvorbereitung, Testklausuren, Strukturierung), alle auf
        demselben Platzhalterfoto (`assets/img/test-img-hero.jpg`, 1200×900-JPG-
        Export von `assets/img/test-img.png`) aufgebaut. Datengetrieben statt
        Markup-Duplikat: `HERO_FEATURES` in `marketing/assets/js/marketing.js`
        (Titel/Text/URL/Fach-Akzentfarbe/Bildausschnitt pro Folie),
        `buildHeroStage()` rendert alle 10 Varianten in `#hero-stage`
        (`marketing/index.html`), `initHeroSlides()` steuert generisch über
        `[data-hero-slides]`/`[data-hs-slide]` (Dots inkl. Akzentfarbe, Pfeile,
        Offset-Attribut für Coverflow/Stapel-Varianten, Autoplay mit Pause bei
        Hover/Fokus/Tab-Wechsel/`prefers-reduced-motion`). Varianten 1–5 =
        Bild+Text-Karten (1 Karussell/Coverflow, 2 Bild-links/Text-rechts,
        3 Polaroid-Stapel, 4 randlos mit Text im Bild, 5 Poster mit Farb-Tag).
        Varianten 6–8 = echtes Vollbild (100vw/100vh, `.hv9__panel` wird zum
        Hintergrundfoto, Haupt-Überschrift liegt als heller Text/Glas-Panel
        darüber, Folien-Text schwebt als Glaskarte: 6 zentrierter Scrim,
        7 Glas-Panel links/Foto rechts klar, 8 Duoton-Einfärbung per Fach-Akzent
        + Ken-Burns-Zoom, Karte unten rechts). Varianten 9/10 = nur das rechte
        `.hv9__panel` wird zum Foto, linke Spalte bleibt wie im Original-Design
        (Fließtext auf Papier-Hintergrund): 9 = bestehender Diagonal-Schnitt,
        jetzt mit Foto statt Flächenfarbe; 10 = kein Diagonal-Schnitt, Foto
        bündig zum rechten Viewport-Rand, `.hv9__text` als weiße Karte mit
        negativem `margin-right`, die über den Fotorand ragt. Umschaltung
        zwischen allen 10 nur als Dev-Tool: `.layout-dev.is-hero` (analog
        `mountSearchDev` in `app/assets/js/app.js`),
        `localStorage['lesify:hero:v']`, nur auf `index.html`; setzt zusätzlich
        `data-hero-bg` auf die `.hv9`-Section für die Panel-Foto-Overrides.
        Mobile Fallback (≤899px) bricht 6–10 auf einfaches Stapeln um (Foto als
        Block, Karte im normalen Textfluss statt schwebend) — beim Testen einer
        alten `@media (max-width:900px){.hv9__panel{display:none}}`-Regel auf
        den Grund gegangen, die die Foto-Overrides sonst unsichtbar gemacht
        hätte. **2026-09-05, später am Tag:** kurzzeitig auf eine feste
        Diagonal-Foto-Variante mit 5 neuen Content-Anzeigen (Story/Rail/
        Ticker/Editorial/Statement) sowie PNG statt JPG umgestellt — auf
        Wunsch wieder auf diesen 10-Varianten-Stand zurückgesetzt (JPG-Bild,
        `data-hero-bg`-Umschalter, alle 10 Varianten).
  - [x] **Variante 9 (Diagonal-Foto): Quadrat-Foto-Experiment verworfen,
        zurück auf `.hv9__panel`-Hintergrund (2026-09-05):** kurzzeitig auf
        ein eigenes `<div class="hv9__square">` (rechtsbündig, `100vh`,
        `aspect-ratio:1/1`, Bild `test-img-square.png`) statt
        `.hv9__panel`-Hintergrund umgestellt — trotz zweier Korrekturen
        (Clip-Path ergänzt, dann auf die textsicheren 54%/48%-Werte
        angepasst) auf Wunsch komplett verworfen. Variante 9 ist wieder exakt
        im Stand des 10-Varianten-Basispakets: `.hv9__panel` selbst trägt das
        Foto (`background-image:url('../img/test-img-hero.jpg')`,
        `clip-path:polygon(54% 0,100% 0,100% 100%,48% 100%)`, Scrim-Gradient
        über `::before`), wieder Teil der gemeinsamen 6–10-Foto-Regelgruppe
        in `landing-lab.css`. `.hv9__square` (Markup + CSS) und
        `assets/img/test-img-square.png` entfernt; `initHeroSlides()` in
        `marketing.js` wieder auf einzelnes `panelBg` (`querySelector`) statt
        `panelBgs`-Array zurückgesetzt. Alle 10 Varianten erneut im Browser
        geprüft (9 und 10 explizit, keine Konsolenfehler).
  - [x] **Variante 9: Foto ungecroppt, rechtsbündig (2026-09-05):** nur
        `.hv9[data-hero-bg="9"] .hv9__panel` bekommt jetzt eine eigene
        Bild-Regel statt der mit 6–8 geteilten: `background-image:
        url('../img/test-img-hero.png')` (statt der JPG-Variante),
        `background-size: contain` (ganzes Bild sichtbar, kein Zuschnitt
        mehr wie bei `cover`), `background-repeat: no-repeat`,
        `background-position: right !important` — das `!important` ist
        nötig, weil `initHeroSlides()` sonst per Folie eine eigene
        `background-position` (`data-hs-pos`, für den `cover`-Zuschnitt
        gedacht) inline setzt, die sonst eine feste Position überschreiben
        würde. `assets/img/test-img-hero.png` (1600px-PNG, aus
        `assets/img/test-img.png` verkleinert) neu angelegt. Diagonal-Schnitt
        (54%/48%) und Scrim unverändert; Mobile-Fallback erbt die neue
        Bild-Regel automatisch (überschreibt dort nur Layout-Eigenschaften).
        **Offen:** eine der 10 Varianten final auswählen, Dev-Switch danach
        entfernen; eigene Bilder je Feature statt des einen Platzhalterfotos.
  - [x] **Versuch „Diagonal-Foto only + 10 Folien-Inhalt-Varianten“ verworfen,
        zurück auf den 10-Hero-Varianten-Stand (2026-09-05):** kurzzeitig den
        Hero-Layout-Dev-Switch entfernt (Diagonal-Foto fest verdrahtet, kein
        `data-hero-bg` mehr) und die schwebende Glaskarte durch 10 neue
        Folien-Inhalt-Varianten (Ticker/Editorial/Story/Rail/Statement/Tabs/
        Frame/Marquee/Side/Minimal) ersetzt — auf Wunsch komplett verworfen
        („absolutely terrible“). Wieder exakt im vorherigen Stand: alle 10
        Hero-LAYOUT-Varianten (Karussell, Split, Polaroid, Bleed, Tag,
        Vollbild, Glas-Split, Duoton, Diagonal-Foto, Overlay-Karte) samt
        Dev-Switch (`localStorage['lesify:hero:v']`, `data-hero-bg` auf
        `.hv9`) sind zurück; Variante 9 (Diagonal-Foto) zeigt wieder die
        schwebende Glaskarte (`.hs-glass-cap`) mit dem PNG-Bild
        (`test-img-hero.png`, `contain`, rechtsbündig, Diagonal-Schnitt
        54%/48%) aus dem vorletzten Schritt. `assets/img/test-img-hero.jpg`
        (für Varianten 6–8/10) neu erzeugt. **Offen:** eine der 10 Varianten
        final auswählen, Dev-Switch danach entfernen; eigene Bilder je
        Feature statt des einen Platzhalterfotos.
  - [x] **Hero final: Variante 9 (Diagonal-Foto) fest, Dev-Switch entfernt
        (2026-09-05):** aus den 10 Layout-Varianten die Diagonal-Foto-Variante
        gewählt und fest verdrahtet. `marketing/index.html`: `.hv9` trägt fest
        `data-hero-bg="9"`, `.hv9__panel` ohne `data-hs-bg`. `marketing.js`:
        `buildHeroStage()` rendert nur noch die eine `.hero-slides--9`-Gruppe
        (Glaskarte `.hs-glass-cap` mit den 4 `HERO_FEATURES`), Dev-Tool
        (`HERO_VARIANTS`/`heroVariant`/`applyHeroVariant`/`mountHeroDev`,
        `localStorage['lesify:hero:v']`) samt Aufruf gelöscht; `initHeroSlides()`
        auf das Nötige eingedampft (Dots/Pfeile/Autoplay, kein Offset-/Caption-/
        `panelBg`-Sync mehr). `landing-lab.css`: alle Regeln der Varianten 1–8/10
        und der `.layout-dev`-Block entfernt; übrig bleiben die geteilten
        Steuer-Elemente (`.hs-dots`/`.hs-arrow`/`.hero-slides__nav`/`.hs-ico`),
        `.hs-glass-cap` und die `.hv9[data-hero-bg="9"]`-Foto-Regel. Bildquelle
        jetzt `assets/img/test-img.png` direkt (6000×4500-PNG), `background-size:
        contain`, `background-position: right !important`, `background-repeat:
        no-repeat`, Diagonal-Schnitt 54%/48% + Scrim-`::before` unverändert.
        `test-img-hero.jpg`/`test-img-hero.png` damit ungenutzt. Im Browser
        geprüft (Foto rechtsbündig, Glaskarte blättert, keine Konsolenfehler).
        **Offen:** eigenes/echtes Foto statt des Platzhalters.
  - [x] **Hero-Karte: 10 Info-Karten-Designs zur Auswahl + Dev-Panel
        (2026-09-05):** Foto / Diagonal-Schnitt / Scrim / Hintergrundfarben
        (`.hv9__panel`, `data-hero-bg="9"`) bleiben unverändert — nur der
        Inhalt von `#hero-stage` (die Info-Karte über dem Foto) wird neu
        gestaltet. `marketing.js`: `buildHeroStage()` rendert jetzt 10
        Karten-Designs (`heroC1..heroC10`) gleichzeitig in `#hero-stage`,
        jedes als eigene `.hs-stage.hs-stage--cN`-Gruppe mit denselben 4
        `HERO_FEATURES`. Designs: 1 Editorial (opake Papier-Karte,
        Display-Titel), 2 Lower-Third (Leiste am unteren Fotorand +
        Fortschrittsbalken), 3 Bare (Text ohne Karte auf dem Scrim,
        `01 / 04`-Zähler), 4 Accent-Flood (Karte in der Fach-Farbe der
        Folie), 5 Index-Liste (alle 4 sichtbar, aktive klappt Text auf),
        6 Tab-Chips (Pill-Reihe + kompakte Glas-Karte), 7 Spine (vertikales
        Label als Buchrücken), 8 Pull-Quote (übergroßer Titel + Mono-Link
        aus `data-hs-url`), 9 Stack (aktive Karte auf faux-gestapelten
        Karten + „Nächste:“-Hinweis), 10 Pill (kleine Pillen, aktive klappt
        Beschreibung aus). `initHeroSlides()` erweitert: unterstützt jetzt
        auch `[data-hs-go="i"]` (Listen-/Chip-Direktwahl), `[data-hs-count]`
        und `[data-hs-nexthint]`, und setzt `--hs-accent` (Fach-Farbe der
        aktiven Folie) auf die Gruppe, damit jedes Design die Akzentfarbe
        nutzen kann. Umschaltung per Dev-Panel `mountHeroCardDev()`
        (`.layout-dev.is-herocard`, `localStorage['lesify:herocard:v']`,
        1–10), analog `mountSearchDev` in `app/assets/js/app.js`; `.layout-dev`
        -CSS wieder in `landing-lab.css`. Karten-CSS: `.hs-stage`-Grundgerüst
        + `.hs-c1..c10` + geteilte `.hs-nav`/`.hs-dots`/`.hs-arrow`/`.hs-ico`
        in `landing-lab.css` (ersetzt `.hs-glass-cap`). Alle 10 im Browser
        geprüft (Desktop + Mobile, kein horizontales Overflow, keine
        Konsolenfehler).
  - [x] **Hero-Karte: Auswahl auf 7 Designs eingegrenzt (2026-09-05):**
        Designs 5–10 (Index-Liste, Tab-Chips, Spine, Pull-Quote, Stack,
        Pill) verworfen. Neuer Stand `heroC1..heroC7` / `HERO_CARD_VARIANTS`
        1–7, `heroCardVariant()`-Regex auf `/^[1-7]$/`: 1 Editorial,
        2 Lower-Third, 3 Bare, 4 Accent-Flood (mit Fach-Farbe), **5 Glass**
        (die frostige dunkle Glas-Karte wie im Ausgangsstand, Icon-Chip +
        Titel + Text), **6 Flat** (gleicher Aufbau wie Accent-Flood, aber
        ohne Fach-Farbe — volle `--ink-950`-Karte, weißer Text, konstant
        über alle Folien), **7 Polaroid** (weiße Sofortbild-Karte, ~-2,5°
        gekippt, auf zwei faux-gestapelten Karten via `::before/::after` +
        `isolation: isolate`; Icon als „Foto“ auf `--ink-100`, Titel/Text
        als Bildunterschrift, Navi zentriert). `initHeroSlides()` wieder
        verschlankt (kein `[data-hs-go]` / `[data-hs-nexthint]` mehr —
        nur noch von den entfernten Designs gebraucht), ungenutzte
        `HS_ARROWS`/`HS_DOTS` entfernt. CSS: `.hs-c5..c10`-Blöcke +
        `.hs-stage--c5/--c6`-Zentrierung raus, neue `.hs-c5/.hs-c6/.hs-c7`
        rein, 620px-Media-Query auf `.hs-c1..c6` reduziert. Alle 7 im
        Browser geprüft (keine Konsolenfehler). **Offen:** eines der 7
        Designs final wählen, Dev-Panel danach entfernen; eigenes/echtes
        Foto statt des Platzhalters.
  - [x] **Hero-Foto: responsives Skalieren gefixt — eigenes gesiztes
        Foto-Element statt background auf der vollen Section (2026-09-05):**
        Backup `marketing/index.html.bak` angelegt (Stand vor diesem Fix).
        Problem: `.hv9__panel` ist `inset: 0` = volle Section-Fläche und nie
        1:1. `background-size: contain` ließ das ganze Bild im Keil
        „schweben“ (Papier-Rest mal null, mal großes Dreieck);
        `background-size: cover` skalierte das quadratische Bild dagegen auf
        die volle Section-Breite hoch (viel zu groß, nur ein schmaler
        Mittelstreifen sichtbar). Lösung: in `.hv9__panel` liegt jetzt ein
        eigenes Element `<span class="hv9__photo">`, dessen Box an BEIDE
        Keil-Maße gekoppelt ist — `height: 100%` (= Keilhöhe H),
        `width: auto` + `aspect-ratio: 1/1` (Breite = H), `min-width: 52vw`
        (auf breiten Screens wächst die Breite auf die Keilbreite, Box wird
        `52vw × H`). Das Foto sitzt als `background-size: cover` /
        `center` in dieser kleinen, nahezu quadratischen Box → moderate
        Skalierung, sinnvoller Ausschnitt, Keil auf jeder Größe randlos
        gefüllt, Bild immer unverzerrt. `.hv9__panel` bleibt mit `--ink-100`
        gefüllt (Absicherung). Stacking von negativem `z-index` auf
        `isolation: isolate` (Section) + `z-index` 0/1 (Panel/`.hv9__grid`)
        umgestellt, `translateZ(0)` auf dem Panel. Ein echtes `<img>` mit
        `object-fit` wurde im clip-path-Container von Chromium erst nach
        einem Repaint gemalt → daher `<span>` + CSS-Hintergrund.
        `!important` bei der Position entfernt. Diagonal-Clip (54%/48%),
        Scrim-`::before` (jetzt `z-index: 1`) und Mobile-Fallback
        (`.hv9__photo` dort `inset: 0`, `object`-frei) im Prinzip
        unverändert. Bei 960–2560 px Breite und 820 px Höhe + Mobile
        geprüft (Foto füllt den Keil beidseitig, keine grauen Ränder,
        erscheint direkt beim Laden, keine Konsolenfehler). Hinweis:
        Test-Bild ist ein 6000×4500-PNG (~7,5 MB) — echte Bilder sollten
        optimiert und 1:1 sein (dann auch kein Seiten-Zuschnitt).
  - [x] **Hero: Schleier über dem Foto + 10 Text-Stil-Varianten
        (2026-09-05):** (1) `.hv9[data-hero-bg="9"] .hv9__panel::after` —
        zweiter Verlauf `linear-gradient(to top, rgba(16,18,20,0.82) …
        transparent 70%)` über Foto und Diagonal-Scrim (`::before` bleibt),
        `z-index: 1`, `pointer-events: none`; dunkelt den Fuß des Keils ab.
        (2) Die linke Hero-Spalte `.hv9__text` bekommt 10 Stil-Varianten
        (`.hv9[data-hero-text="1..10"] .hv9__text …` in `landing-lab.css`) —
        gleicher Inhalt, nur Typo/Auszeichnung/Anordnung: 1 Standard,
        2 Groß (Riesen-Headline), 3 Regel (Akzentlinie links), 4 Badge
        (Eyebrow-Pille), 5 Editorial (leichte Headline, kursiver Lead),
        6 Kompakt, 7 Zentriert, 8 Kicker (Mono-Label + Trennlinie),
        9 Karte (Textblock auf Fläche), 10 Minimal (kein Eyebrow, 2. CTA
        als Link, keine Trust-Zeile). Umschaltung: `.hv9` trägt
        `data-hero-text` (init `"1"`); `marketing.js` — Dev-Panel
        `mountHeroCardDev` → `mountHeroDev` mit zwei Zeilen „Karte“
        (`[data-hc]`, `lesify:herocard:v`) und „Text“ (`[data-ht]`,
        `lesify:herotext:v`), gemeinsamer `devRow()`-Builder,
        `HERO_TEXT_VARIANTS` + `heroTextVariant()`/`applyHeroTextVariant()`.
        `.layout-dev` bekam `max-height`/`overflow: auto`. Alle 10
        Text-Varianten + Schleier im Browser geprüft (Desktop + Mobile,
        keine Konsolenfehler). **Offen:** je eine Karten- und Text-Variante
        final wählen, Dev-Panel danach entfernen.
  - [x] **Neue Section „KI-Chat" (index.html, `#chat`) mit Live-Demo +
        5 Layout-Designs (2026-09-06):** neue `<section class="lab-sec
        chat-sec" id="chat" data-chat="1">` direkt nach der Trust-Ticker-
        Leiste, vor „Problem". Inhalt komplett in `marketing.js`
        (`buildChatSection` → `#chat-section`). **Live-Demo** (`chatDemoMarkup`
        /`initChatDemo`): scripted KI-Chat-Panel mit 3 Beispiel-Chips
        (Konjunktiv II · erklären / Zellatmung · üben / pq-Formel ·
        hausaufgaben), Tipp-Indikator + Typewriter-Ausgabe, Freitext-Feld
        mit generischer didaktischer Rückfrage; Modus-Label wechselt je
        Antwort; „Demo — kein echter Chat"-Hinweis. **Perks** (`CHAT_PERKS`,
        4): Erklärt den Weg statt der Lösung (Rückfragen, Jahrgangsniveau) ·
        Sicher & beim Schulstoff (Themen-Riegel im System-Prompt, EU/DSGVO) ·
        Für Eltern nachvollziehbar (Wochen-Zusammenfassung statt Chat-
        Wortlaut, vgl. `backend-planning.md` §… Eltern-Ansicht) · Kennt das
        Thema (Themen-Memory aus Lernzetteln/Dateien). **5 Designs**
        (`chatV1..V5`, `.chat-var--vN`, `data-chat` auf der Section):
        1 Split, 2 Zentriert, 3 Bühne (Demo im Browser-Frame), 4 Tabs
        (Perk-Tabs starten den passenden Demo-Prompt), 5 Dark (dunkle
        Section, Glas-Demo, Glas-Karten). Umschaltung: Dev-Panel —
        `mountHeroDev` → `mountLabDev`, `LAB_DEV_AXES`-Tabelle, dritte Zeile
        „Chat" (`[data-ch]`, `lesify:chat:v`, 1–5). CSS-Block `.chat-sec` /
        `.chat-demo*` / `.chat-perks*` / `.chat-var--vN` in `landing-lab.css`.
        Alle 5 Varianten + Demo-Interaktion strukturell im Browser geprüft
        (je genau eine Demo-Instanz nach Wechsel, Tabs steuern Demo, Dark-
        Styles greifen, keine Konsolenfehler). **Offen:** eine der 5
        Varianten final wählen, Dev-Panel-Zeile danach entfernen;
        Demo-Texte ggf. mit echten Beispielen ersetzen.
  - [x] **Landing-Lab-Ausbau: KI-Chat auf 10 Varianten + 8 weitere
        Sections mit je 10 Varianten (2026-09-06):** zweites Backup
        `marketing/index.html.bak2`. **KI-Chat** +5 Designs (`chatV6..V10`):
        6 Bento, 7 Rows, 8 Statement, 9 Stack (Faux-Karten-Stapel),
        10 Banner (dunkles Vollband + Browser-Frame). **8 neue Sections**
        nach `#chat`, vor „Problem" (bestehende Alt-Sections unangetastet):
        `#kv` Klausurvorbereitung · `#cmp` Vergleich · `#subj` Fächer &
        Klassenstufen · `#price` Preise · `#test` Testimonials · `#parent`
        Eltern-Zugang · `#faq` FAQ · `#cta` Abschluss-CTA. Je Section
        `<section class="lab-sec sv-sec" id="{key}" data-{key}="1"><div
        id="{key}-section"></div></section>`; Inhalt datengetrieben in
        `marketing.js` (`renderKv`/`renderCmp`/… mit switch über 1–10,
        `LAB_SECTIONS` → `LAB_API` → `buildLabSections()`), CSS-Block
        `.sv--{key}{n}` in `landing-lab.css`. Klausurvorbereitung zeigt den
        6-Schritt-Ablauf (Testklausur → Lernplan-Erstellung → Durchführung →
        2. Testklausur → Schwachstellen → Lernzettel) + Noten-Fortschritts-
        Karte (Demo-Zahlen). Interaktiv: `priceInit` (Monats-/Jahres-
        Umschalter, `[data-pm]`, tauscht `[data-m]`/`[data-y]`),
        `testInit` (Carousel/Rotator, Auto-Rotate mit Interval-Cleanup),
        FAQ/Accordion-Varianten über native `<details>`. **Dev-Panel:**
        `LAB_DEV_AXES` jetzt Array (Hero-Karte/-Text/Chat + 8 Section-
        Achsen), generischer Klick-Handler über `data-{key}`; Panel „Landing-
        Lab" hat 11 Zeilen / 107 Buttons. Alle 85 neuen Section-Varianten
        strukturell im Browser durchgeschaltet (kein Builder-Fehler, eine
        Chat-Demo-Instanz, Preis-Toggle + Testimonial-Carousel + FAQ-Toggle
        funktionieren, keine Konsolenfehler). Visuelle Prüfung stand aus
        (Browser-Pane war ausgeblendet). Reiner Prototyp-Content (Demo-
        Zahlen/-Stimmen). **Offen:** je Section eine Variante final wählen,
        Alt-Sections + Dev-Panel danach entfernen; echte Testimonials/Zahlen.
  - [x] **Dev-Panel kompakter (2026-09-06):** Buttons nur noch Nummer
        (Voll-Label als `title`-Tooltip), kleinere Schrift/Abstände/Buttons
        (17px), engere Zeilen; Titel „Landing-Lab" ist jetzt ein
        Collapse-Toggle (▼/▶, `.layout-dev.is-min`, `localStorage['lesify:
        lab:min']`).
  - [x] **Landing-Lab-Runde 2: Neu-Designs für Chat/KV/CMP/Fächer/Preise/
        Testimonials/FAQ (2026-09-06):**
        · **Chat:** `.chat-demo`-Komponente neu (KI-Chat-Look: Marken-
        Avatar, Bubbles mit Avatar, Pillen-Input, `__main`/`__foot`).
        3 Größen `chat-demo--lg` / `--xl` + `--app` (Fächer-Navi-Fenster).
        11 Varianten: 1 Statement + 2 Stack (die früheren v8/v9), 3–5 normale
        Größe (Sidebar/Card-Row/Framed), 6–8 groß (Hero-LG/Split-LG/Dark-LG),
        9–11 sehr groß (Fullbleed-XL/App-XL/Immersive-XL).
        · **KV:** alle 10 von Grund auf neu, jeder Schritt visuell —
        `KV_ART` (6 Inline-SVG-Illustrationen). 1–5 Bild-Varianten
        (Strip/Grid/Zigzag/Stack/Filmstrip), 6–10 Animations-Varianten wie
        die Chat-Demo: `kvPlayer`/`kvInit` (Auto-Advance 3,8 s, Dots/Pfeile,
        Fortschrittsbalken; Track-, Scrubber- und Immersive-Dark-Aufsätze).
        · **CMP:** v1 bleibt Karten-Vergleich (inspiriert von altem `cv2`) —
        neu verfeinert (dunkle Lesify-Karte + Sparkle + CTA, `is-lose`-Zeilen
        gedimmt, ehrlicher Callout). v2–v10 alle auf dieser Karten-Basis
        (Empfohlen/VS/Aligned/Dark/Lead-in/Score/Pills/Callout/Compact).
        · **Fächer:** neu, 5 Varianten — opake fach-farbige Karten mit
        SVG-Icon (Astra-AI-Inspiration) + „Eigenes Fach"-Karte/-Hinweis
        (Grid/Big/Bento/Scroll/Split). `SUBJ_LIST` mit Icon+Farbe pro Fach.
        · **Preise:** v1 + 5 Redesigns (v2–v6). Bestseller-Karte deutlich
        hervorgehoben (2 px Rahmen, Verlauf, Ribbon). Neuer **Sitze-Umschalter**
        (1–4 Kinder, `PRICE.seatFactor` = Familien-Rabatt) neben dem Monats-/
        Jahres-Toggle; `priceInit` rechnet Preis = Basis × Intervall × Sitze
        live und blendet einen Familien-Paket-Hinweis ein.
        · **Testimonials:** neu, 10 Varianten im knowunity-Stil — CSS-„UGC-
        Video"-Karten (Farbverlauf + Play-Button + Name) als driftende
        Hintergrund-Wall (`testWall`, vertikale Marquee-Spalten) hinter
        Headline/Zahl/Zitaten (Hero/Split-Phone/Wall/Marquee/Dark/Thumbs/
        Spotlight/Bento/Masonry/Circles). Alter Carousel-`testInit` entfernt.
        · **FAQ:** v1 kräftiger (`faq-bold` — nummerierte Rahmen-Karten,
        Kreis-+/−-Toggle, Kontakt-Fuß); v2–v10 unverändert.
        Dev-Panel-Achsen jetzt: Karte 7 · Text 10 · Chat 11 · kv 10 · cmp 10 ·
        subj 5 · price 6 · test 10 · parent 10 · faq 10 · cta 10 (99 Buttons).
        Alle strukturell + interaktiv im Browser geprüft (KV-Player,
        Preis-Toggles/Sitze, FAQ-Toggle, Chat-Demo, keine Konsolenfehler);
        visuelle Endabnahme steht aus (Browser-Pane zeitweise ausgeblendet).
  - [x] **Landing-Lab-Runde 3: Karte/Text eingegrenzt, Chat + KV komplett
        neu als App-Nachbau (2026-09-07):**
        · **Hero-Karte (`hc`):** nur noch Design 2 (Lower-Third) und 3 (Bare),
        je mit einer zweiten Fassung — `2b` Full-Bleed (randlose Leiste am
        absoluten unteren Bildrand, über die volle Hero-Breite gezogen via
        `100vw`-Breakout; `applyHeroCardVariant` setzt zusätzlich
        `data-hero-card` auf `.hv9`) und `3b` Bare · Clean (unten-links
        verankert, engere Spalte, weicher Cross-Fade beim Folienwechsel statt
        `display`-Umschaltung). `HERO_CARD_VARIANTS`/`heroCardVariant()`-Regex
        auf `2|2b|3|3b`, Default `2`. Alte `heroC1/4/5/6/7` + zugehöriges CSS
        entfernt.
        · **Hero-Text (`ht`):** nur noch Variante `1` (Standard) plus `1.1`,
        `1.2`, `1.3` — alle = Variante 1 zusätzlich mit einer Vertrauensleiste
        (`.hv9__trust`, angelehnt an `test-circ__row` der Testimonial-Section
        v10): überlappende fach-farbige Avatar-Kreise + „10.000+ Familien
        lernen schon mit Lesify". `1.1` schlichte Reihe, `1.2` in einer
        zurückhaltenden Pill-Karte, `1.3` kompakt-inline (ersetzt die
        `.lab-trust`-Zeile). Markup einmalig via `ensureHeroTrust()` in
        `.hv9__text` eingehängt, CSS blendet es nur für `data-hero-text^="1."`
        ein. `heroTextVariant()`-Regex `1(\.[123])?`. Alte
        `[data-hero-text="2..10"]`-Overrides entfernt.
        · **Chat (`ch`):** alle 11 alten Varianten verworfen, 10 neue —
        **alle** auf dunklem Section-Hintergrund (`.chat-sec { background:
        var(--ink-950) }` global) und **alle** um denselben realistischen
        Nachbau von `app/chat.html` herum: `chatAppMarkup()` baut Verlauf-
        Spalte (4 fach-gefärbte Inbox-Zeilen), Kontext-Kopf mit Fach-Kachel +
        Nutzungs-Donut, Messenger-Thread (nutzt weiter `initChatDemo` /
        `.chat-demo__msg*`), Composer mit Klammer + Rund-Senden. 10 Rahmen:
        1 App (Chrome+Verlauf) · 2 Fokus (schmal, kein Verlauf) · 3 Split
        (Text/Perks links) · 4 Hero (breit) · 5 Floating (Glow) · 6 Window
        (Perspektive + Caption) · 7 Bare (nur Kopf/Thread/Composer) · 8 Strip
        (Perk-Strip drunter) · 9 Duo (App + Glas-Perk-Karten) · 10 Fullbleed.
        `CHAT_BUILDERS`/`CHAT_VARIANTS` = 1–10, Regex `[1-9]|10`.
        · **KV (`kv`):** alle 10 alten Varianten (Bild-/Player-Serie)
        verworfen, 10 neue um `kvxMock()` — realistischer Nachbau von
        `app/testklausur.html`: Fach-Badge + Titel, vertikale Step-Schiene
        (Erstellen · Lösen · Analyse · Ergebnis), Panel mit 4 Phasen, die
        `kvInit` automatisch durchläuft (3,6 s, Fortschrittsbalken,
        Step-Klick). Phasen: KI erstellt → Aufgaben + Download + Upload-
        Dropzone → „Bereit zur Analyse" → Ergebnis mit eingefrorener
        Testklausurnote in Ampelfarbe + Aufgabe-für-Aufgabe-Karten +
        Notenchips. Optional 7-Tage-Lernplan-Rail (`kvxPlanRail`). 10 Rahmen:
        1 Split · 2 Fokus · 3 Split+Plan · 4 Text-Split (mit Ampel-Legende)
        · 5 Floating · 6 Window · 7 Bare · 8 Dark (Section dunkel) · 9
        Steps-Top (horizontale Schiene) · 10 Fullbleed+Plan. `LAB_LABELS.kv`
        angepasst, `kvInit` neu (Phasen- statt Slide-Zyklus).
        Alle 20 neuen Chat/KV-Varianten + Karte 2b/3b + Text 1.1–1.3
        strukturell im Browser geprüft (Grids/Breiten korrekt bei echtem
        Viewport, kein H-Overflow, dunkler Section-BG greift, keine
        Konsolenfehler); vollständige visuelle Abnahme steht noch aus
        (Browser-Pane im Desktop-App zeitweise eingeklappt, Screenshots
        unzuverlässig). **Offen:** je Achse eine Variante final wählen,
        Alt-Sections + Dev-Panel danach entfernen.
  - [x] **Landing-Lab-Runde 4: Karte/Text finalisiert, Chat auf 4 +
        Farb-Achse, KV = ganze Klausurvorbereitung (2026-09-07):**
        · **Hero-Karte 2b:** Leiste lebt jetzt IM `.hv9__panel` (nicht
        mehr in `#hero-stage`) — `buildHeroStage()` hängt `heroC2b()` per
        `insertAdjacentHTML` ins Panel, `applyHeroCardVariant` sucht in
        `.hv9 [data-hero-slides]`. Dadurch ist die Leiste genau so breit
        wie das Foto (Panel-Box), wird vom diagonalen Weiß-Schnitt
        (`clip-path` + `overflow:hidden` des Panels) beschnitten und liegt
        per `z-index:2` über Foto (0) und Panel-Scrims (1), aber hinter dem
        weißen Diagonal-Ausschnitt. `100vw`-Breakout + `padding-bottom:0`
        auf `.hv9` entfernt.
        · **Hero-Text:** fest auf Variante 1.3 (Trust · Inline) — Achse
        `ht` aus `LAB_DEV_AXES` entfernt, `HERO_TEXT_VARIANTS`/
        `heroTextVariant()` weg, `applyHeroTextVariant('1.3')` einmalig in
        DOMContentLoaded. CSS auf die 1.3-Regeln reduziert.
        · **Chat:** 10 → 4 Varianten. v1 = früheres v8 (Strip)
        unverändert; v2 Cards (Perk-Strip → volle Perk-Karten + Lead +
        Modi-Zeile), v3 Explainer (Perk-Liste + die vier Chat-Modi
        nebeneinander + CTA), v4 Deep (Perk-Karten + Eltern-Notiz + Modi +
        Kennzahlen-Zeile) — Redesigns von v8 mit deutlich mehr Text/Info.
        Neue Daten `CHAT_MODES` (4) + `CHAT_STATS` (4), Helfer
        `chatModeCards`/`chatStatRow`/`chatParentNote`. Neue Dev-Achse
        **„Chat-Farbe"** (`cc`, `data-chat-color` auf `#chat`,
        `localStorage['lesify:chatcolor:v']`): `fb` full black (Default) ·
        `fw` full white · `wc` BG schwarz / Chat weiß · `bc` BG weiß / Chat
        schwarz — greift über alle 4 Varianten. CSS: Section-BG per
        `[data-chat-color]`, plus ein „Helle Chat-Anzeige (fw + wc)"-Block,
        der den `.chat-app`-Nachbau auf Weiß dreht; Zusatz-Inhalte
        (Perks/Modi/Stats) flippen ihre Typo für helle Section (fw + bc).
        Donut-Ring über `.chat-app__donut-t/-v`-Klassen (statt Inline-Farbe).
        · **KV:** komplett neu — nicht mehr nur Testklausur, sondern die
        GANZE Klausurvorbereitung als „Klausur-Cockpit" (`kvxMock`): Kopf
        mit Fach + Countdown, 6er-Journey-Schiene (Klausur · Testklausur 1
        · Lernplan · Lernphase · Lernzettel · Testklausur 2) und ein Panel
        mit 6 automatisch laufenden Phasen (`kvInit`): Klausur angelegt
        (Themen-Ampel) → Testklausur 1 (Note + Ampel pro Thema) → Lernplan
        (7 Tage, schwache Themen zuerst) → Lernphase (Tag 4/7, KI-Chats,
        abgehakt) → Lernzettel (Definitionen/Formeln/typische Fehler aus
        den Chats) → Testklausur 2 (Note 2,0, +1,6, Vergleich T1→T2).
        Optionale Übersichts-Rail (Countdown, Themen-Ampel, Lernzettel,
        nächster Lerntag). 10 Rahmen: 1 Split · 2 Fokus · 3 Cockpit
        (Rail, xl) · 4 Text-Flow (Prozess-Liste links) · 5 Floating · 6
        Window · 7 Bare · 8 Dark · 9 Steps-Top · 10 Fullbleed+Rail.
        `KVX`-Daten, `LAB_LABELS.kv` + `kvInit` (6 statt 4 Phasen)
        angepasst. Alles strukturell im Browser geprüft (Grids/Breiten bei
        echtem Viewport, Farb-Achse fb/fw/wc/bc greift wie spezifiziert,
        Phasen-Zyklus, kein H-Overflow, keine Konsolenfehler); volle
        visuelle Abnahme weiter offen (Pane eingeklappt).
  - [x] **Neue TLDR-Section „Was Lesify besonders macht" (index.html,
        `#tldr`) mit 16 Varianten (2026-09-08):** Abschnitt direkt hinter
        dem Hero, vor dem Trust-Ticker: `<section class="lab-sec sv-sec"
        id="tldr" data-tldr="1"><div id="tldr-section"></div></section>`.
        Verdichtet die sechs Kernpunkte (KI-Chat pro Fach/Thema · Lernzettel
        automatisch · Testklausur mit echter Note · Lernplan bis Klausurtag
        · Dateien/Fotos als Kontext · zu Hause + DSGVO) plus vier Kennzahlen
        (9 Fächer · 4 Modi · 24/7 · ab 15,99 €) und vier Trust-Chips.
        Datengetrieben in `marketing.js`: `TLDR`/`TLDR_IC`, Helfer
        `tldrItems('card'|'line'|'num'|'zebra')` / `tldrStats` / `tldrChips`
        / `tldrCta`, `renderTldr(v)` mit Switch 1–10, als erster Eintrag in
        `LAB_SECTIONS` + `LAB_LABELS.tldr` registriert → Dev-Panel-Achse
        „tldr" (10 Buttons) automatisch über `LAB_API`. 10 Rahmen:
        1 Grid (3-Spalten-Karten + Stat-Leiste) · 2 Bento (dunkle Leitzelle
        links) · 3 Split (Sticky-Aside + Liste) · 4 Rail (horizontaler
        Scroller + Chips) · 5 Dark (dunkler Abschnitt via `[data-tldr="5"]`,
        2-Spalten-Liste + Stat-Fuß) · 6 Ziffern (nummerierte Editorial-
        Liste) · 7 Liste (zentriert, Icon-Chip-Zeilen) · 8 Pills (Feature-
        Pills + kompakte 2-Spalten) · 9 Zebra (abwechselnde volle Reihen +
        Stat-Band) · 10 Panorama (3 Spalten mit Akzentkante, Zahlen als
        Punktzeile). CSS-Block `.sv--tldr1…10` in `landing-lab.css`
        (gemeinsame Bausteine `.tldr-card` / `.tldr-stats` / `.tldr-chips` /
        `.tldr-line__row` + Responsive 980/620 px). Reiner Prototyp-Content.
        · **Kompakt-Runde 11–16 (2026-09-08):** dichte Aufsätze auf 1/2/5
        mit weniger Höhe, nutzen den neuen Kurztext `point.s` statt der
        langen Beschreibung. `RX10` auf 1–16 erweitert (pro Section weiter
        per `+v <= max` begrenzt), `tldrItems` um `crow`/`crowm`/`ledger`,
        neue Stat-Modifier `is-slim`, Punkt-Datenfeld `m` (ein voller Satz,
        Mittel zwischen `s` und `d`). 11 Grid Kompakt (Icon neben Titel,
        dichtes 3er-Raster, Inline-Zahlen) · 12 Bento Kompakt (dunkle
        Kopfleiste Headline+CTA, darunter Haarlinien-3er-Raster) · 13 Dark
        Kompakt · 14 Ledger (flache Spec-Sheet-Liste Icon|Titel|Kurztext,
        Zahlen als Fußzeile) · 15 Split Kompakt (schmales Aside + geteilte
        Kurzliste) · 16 Split Dark (v15 als schwarzes Panel).
        **13 + 16** rendern als **schwarzer Abschnitt über die volle Breite
        mit abgerundeten Ecken** (`background`/`border-radius: --radius-2xl`
        auf `.sv-sec[data-tldr="13"|"16"]`, Inhalt bleibt in der
        Container-Breite) und zeigen je Karte **einen vollen Satz** (`crowm`
        → `point.m`). `.tldr-csplit`-Grid von v15 auf beide Varianten
        verallgemeinert. CSS-Block „TLDR — Kompakt-Runde (11–16)" in
        `landing-lab.css`.
        **Offen:** eine Variante final wählen, Dev-Panel-Zeile danach
        entfernen; visuelle Abnahme im Browser.
  - [x] **Startseite: Trust-Ticker raus, Hero-Farbe fixiert, Hero-
        Eckschnitt (2026-09-09):**
        · **`tv5` (Trust-Ticker-Leiste) entfernt** — Markup aus
        `marketing/index.html` (lag zwischen `#tldr` und `#chat`), CSS
        `.tv5*` aus `landing-lab.css` (inkl. `reduced-motion`-Zeile).
        · **Dev-Panel-Achse „Hero-Farbe" (`hc`) entfernt**, Variante 1 fest:
        `LAB_DEV_AXES` ohne `hc`-Eintrag, `applyHeroColor('1')` statt
        `applyHeroColor(heroColorVariant())` in DOMContentLoaded
        (`HERO_COLOR_VARIANTS`/`heroColorVariant()` bleiben als tote Helfer).
        · **Neuer Token `--section-radius: 48px`** in `marketing.css`
        (`:root`, bei den `--radius-*`).
        · **Hero (`.hv9`) mit Eckschnitt unten links:** `background:
        var(--bg-canvas)` (Papier) + `border-bottom-left-radius:
        var(--section-radius)`, `overflow: hidden` → `visible` (das
        Foto-Panel beschneidet sich bei `data-hero-bg="9"` selbst).
        `.hv9::before` = 48×48-Box unten links mit `radial-gradient`
        (Mittelpunkt = Papier-Bogen-Zentrum, oben rechts): innerhalb des
        Radius transparent, außerhalb `--ink-950` → der schwarze Zwickel
        blitzt exakt im weggeschnittenen Radius durch, sonst nichts.
        `z-index:-1` (hinter `.hv9__grid`/`.hv9__panel`, vor der
        Papier-Fläche).
  - [x] **Eckschnitt: TLDR-Dunkelabschnitt ohne Radius, Chat-Abschnitt
        oben eingeschnitten (2026-09-09):**
        · **`border-radius` auf `.sv-sec[data-tldr="13"|"16"]` entfernt** —
        die schwarzen TLDR-Varianten sind wieder rechteckig (volle Breite).
        · **`.chat-sec` (Abschnitt nach `#tldr`) bekommt oben denselben
        Eckschnitt wie der Hero, an BEIDEN Ecken:**
        `border-top-left-radius` + `border-top-right-radius:
        var(--section-radius)`. Da der Chat-Abschnitt per Default schwarz
        ist (`data-chat-color="fb"`), reicht `border-radius` +
        `overflow: hidden` — die schwarze Fläche wird beschnitten, der
        Papier-Seitenhintergrund blitzt im Schnitt durch. Kein `::before`
        nötig (anders als beim Hero, wo der Schnitt sonst Papier auf Papier
        zeigen würde).
  - [x] **KI-Chat fixiert, KV vor KI-Chat, Eckschnitt auf KV (2026-09-09):**
        · **Dev-Panel-Achsen „Chat" (`ch`) und „Chat-Farbe" (`cc`)
        entfernt**, final: Layout `v3` (Explainer), Farbe `fw` (Full White).
        `chatVariant()`/`chatColorVariant()` geben fest `'3'` / `'fw'`
        zurück, `LAB_DEV_AXES` ist jetzt nur noch `LAB_API.map(...)`
        (tldr · kv · cmp · subj · price · test · parent · faq · cta).
        `CHAT_VARIANTS`/`CHAT_COLOR_VARIANTS`/`applyChatVariant`/
        `applyChatColor` bleiben als tote Helfer.
        · **Reihenfolge:** `#kv` (Klausurvorbereitung) in `index.html` VOR
        `#chat` gezogen — Flow jetzt Hero → TLDR → KV → KI-Chat → Vergleich …
        · **Eckschnitt vom Chat-Abschnitt entfernt** (`.chat-sec` wieder nur
        `overflow: hidden`) und stattdessen auf **`#kv`** gelegt, weil KV
        jetzt direkt auf `#tldr` folgt: `.sv-sec[data-kv]` bekommt
        `background: var(--bg-canvas)`, `border-top-left-radius` +
        `border-top-right-radius: var(--section-radius)`, `overflow:
        visible`, `isolation: isolate` und **`::before` (Ecke oben links) +
        `::after` (Ecke oben rechts)** — 48×48-Boxen mit `radial-gradient`
        (Mittelpunkt = Radius-Bogen-Zentrum): innen transparent, außen
        `--ink-950`, `z-index:-1`. Der schwarze Zwickel blitzt in beiden
        oberen Ecken durch, exakt im weggeschnittenen Radius. Regel steht
        VOR `.sv-sec[data-kv="8"]`, damit die dunkle KV-Variante ihren
        schwarzen Section-Hintergrund behält.
        · **Korrektur (2026-09-09):** `LAB_DEV_AXES` ist jetzt
        `LAB_API.filter(a => !a.fixed).map(...)` — `LAB_SECTIONS`-Einträge
        mit `fixed:'<n>'` rendern fest diese Variante (`labSectionApi.variant()`)
        und tauchen NICHT als Dev-Panel-Achse auf.
  - [x] **Hero-Slideshow-Fixes + Preise final v4 mit Redesigns (2026-09-09):**
        · **Fortschrittsbalken (`.hs-progress`)** lief als reine CSS-Loop
        unabhängig von der JS-Steuerung und war nach Pfeil-/Punkt-Klick aus
        dem Takt. `initHeroSlides()`: `armProgress()` (Animation via
        `animation:none` → Reflow → `''` neu starten) wird in `show()` und
        `start()` aufgerufen, `pauseProgress()` in `stop()` — Balken startet
        jetzt mit jeder Folie neu und pausiert beim Hovern.
        · **Bild/Text-Sync:** Foto-Blende von 700 ms auf **340 ms** verkürzt
        (`.hv9__photo`), aktive Karten-Folie bekommt eine gleich lange
        Einblend-Animation (`@keyframes hsSlideIn`, 340 ms) — Foto und Text
        wirken beim schnellen Durchklicken zusammen.
        · **Kein Hover-/Fokus-Stopp mehr:** `mouseenter/leave` + `focusin/out`
        → `stop`/`start` aus `initHeroSlides()` entfernt; die Slideshow läuft
        durchgehend weiter (Pfeil-/Punkt-Klick setzt den Takt über `restart()`
        neu), nur bei verstecktem Tab (`visibilitychange`) hält sie an.
        · **Preise:** Section fest auf **v4 (Dark-Feat)** (`fixed:'4'` in
        `LAB_SECTIONS`), `price`-Achse aus dem Dev-Panel raus.
          – **Premium-Button** war schwarz auf schwarzer Karte (unsichtbar):
          auf v4 jetzt heller Button (`--paper` Fläche, dunkler Text, heller
          Hover-Ring).
          – **Bestseller-Hinweis** von der Pillen-Fahne oben links zu einem
          **45°-Eckbanner oben rechts** (`.price-card__tag` in v4: `rotate(45deg)`,
          Karte `overflow: hidden`), Farbe **`--gelb`** statt `--paper` (hebt
          sich klar von der Sektions-Papierfläche ab).
          – **Familien-Paket-Auswahl** von der Segment-Reihe „1 Kind / 2
          Kinder / …" zu einem **Stepper** (`.price-seats`, `[data-seats-step]`,
          Kinderzahl 1–4, ±-Buttons mit Disabled-Grenzen, Sitz-Punkte,
          grün getönt ab 2 Kindern). `priceInit` entsprechend umgebaut
          (`data-seats-val`/`-dots`, `is-family`-Klasse). `PRICE.seatFactor`
          unverändert; Backend-Planung nicht betroffen.
  - [x] **Klausurvorbereitung (kv) komplett neu — Lernplan-Nachbau,
        8 Rahmen (2026-09-09):**
        · **Altes „Klausur-Cockpit" (`kvx*`, `renderKv` 1–10) für die
        kv-Section abgelöst.** `KVX`/`kvxMock`/`kvxDays`/`kvxPhases`/`kvInit`
        bleiben — die `feature-*`-Unterseiten nutzen sie weiter.
        · **Neue Demo `kvl*` spiegelt die echte Lernplan-Seite
        (`app/lernplan.html?id=lp1`):** Kopf (Fach-Badge + Titel +
        Countdown), links die **7-Tage-Navigation** (`.kvl__nav`,
        `.kvl__step[data-state=done|now|soon]`, Nummer→Häkchen bei
        erledigt, aktiver Tag blau getönt), rechts der **aktive Lerntag**
        (`.kvl__main`): Kopfzeile „Tag N · Titel" + Chip (Heute dran /
        Erledigt / Kommt noch), Beschreibung, je nach Tag eine **abhakbare
        Checkliste** (`.kvl__cl`, Kreis-Haken + „öffnen →"-Zeile wie in der
        App), eine **Note-Box + Ampel pro Thema** (Testklausur-Tage) oder
        eine kurze Themen-Liste. `kvlInit` lässt die Tage automatisch
        durchlaufen (3,8 s) und reagiert auf Klick. Akzent = `--fach-blue`.
        7 Tage (nicht 6): Testklausur 1 · Schwachstellen verstehen · …
        üben · … festigen · Testklausur 2 · Restlücken · Selbsttest.
        · **Linke Textspalte neu** (statt der nummerierten
        `kvx-cv__flow`-Schrittliste): 4 Icon-Punkte (rückwärts geplant /
        zwei Testklausuren / jeder Tag in den Chat / Lernzettel wächst
        mit), eine Kennzahl-Zeile (7 Lerntage · 2 Testklausuren · 1
        Lernzettel) und CTA — `kvlText()`.
        · **8 Rahmen** (`LAB_LABELS.kv`): 1 Split (früher v4, jetzt Default:
        Text links / Demo rechts) · 2 Fenster (Demo mit Browser-Chrome) ·
        3 Sticky (schmales, klebendes Text-Aside) · 4 Flip (Demo links) —
        das sind die vier „wie v4"; dazu frei: 5 Zentriert (Kopf mittig,
        Demo voll, Punkte als Reihe) · 6 Dark (`[data-kv="6"]` dunkel, ohne
        Eckschnitt, Demo dunkel) · 7 Bento (Demo groß + Punkt-/CTA-Kacheln)
        · 8 Timeline (7 Tage als horizontale Schiene über einem Fokus-Tag).
        CSS-Block „Klausurvorbereitung (kv) — Lernplan-Nachbau (.kvl*)" in
        `landing-lab.css`; `.sv-sec[data-kv="8"]`-Dark-Regel → `="6"`.
        **Offen:** visuelle Abnahme im Browser (Pane rendert diese Session
        keine Screenshots).
  - [x] **kv fixiert (v5), Chat schwarz + 10 Redesigns (2026-09-09):**
        · **kv aus dem Dev-Panel** (`fixed:'5'` in `LAB_SECTIONS`) — final
        v5 „Zentriert". Zwei Änderungen: (1) `kvlPointsRow()` steht jetzt
        ZWISCHEN Kopf und Demo (vorher darunter). (2) Unter der Demo eine
        Reihe **Tag-Nummern** (`.kvl-dots`, `[data-kvl-dot]`) als
        Slideshow-Steuerung — `kvlInit` verdrahtet sie mit demselben
        `show(i)` wie ein Klick in der Demo, aktive Nummer wird
        mitgeführt.
        · **KI-Chat = schwarzer Abschnitt.** `chatColorVariant()` fest
        `'fb'`; die `[data-chat-color="fb"]`-Regeln färben Section dunkel,
        Text hell.
        · **Eckschnitt-Rahmen für die Nachbar-Abschnitte** (wie bei
        tldr/Hero): `#kv` (darüber) bekommt runde UNTER-Ecken +
        schwarze Zwickel (`::before`/`::after`, Radial-Gradient), `#cmp`
        (darunter) runde OBER-Ecken + Zwickel — die schwarze Chat-Fläche
        „blutet" so in die Ecken der angrenzenden Papier-Abschnitte.
        `.sv-sec[data-kv]` von Ober- auf Unterrand umgestellt, neue Regel
        `.sv-sec[data-cmp]` (vor `[data-cmp="5"]` platziert, damit die
        dunkle cmp-Variante schwarz bleibt).
        · **Chat-Achse „Chat" ins Dev-Panel zurück** mit **10
        inhaltsreichen Redesigns** (`CHAT_BUILDERS` 1–10, `CHAT_VARIANTS`):
        1 Explainer · 2 Deep · 3 Cards · 4 Modi-zuerst · 5 Leitplanken ·
        6 Beispiele · 7 Vergleich · 8 Editorial (Eltern-Zitat) · 9 Für
        Eltern · 10 Komplett. Jede kombiniert den App-Nachbau
        (`chatAppMarkup`) mit deutlich mehr Text: neue Daten
        `CHAT_EXAMPLES` (Beispiel-Fragen nach Fach), `CHAT_VS`
        (Lesify-Chat vs. allgemeiner KI-Chat), `CHAT_GUARD` (Leitplanken),
        `CHAT_QUOTE` (Eltern-Zitat) + Helfer `chatExamplesGrid` /
        `chatVsBlock` / `chatGuardCards` / `chatQuoteBlock`. CSS-Block
        „KI-Chat — 10 inhaltsreiche Redesigns" in `landing-lab.css`.
        `chatColorVariant` fest, keine „Chat-Farbe"-Achse.
        **Offen:** visuelle Abnahme (Pane rendert diese Session keine
        Screenshots).
  - [x] **Neue Section „Struktur" (org) — alles hängt an Fach & Thema,
        10 Varianten (2026-09-09):**
        · **Neuer Abschnitt `#org`** in `index.html` ZWISCHEN `#chat` und
        `#cmp` (`<section class="lab-sec sv-sec" id="org" data-org="1">`),
        registriert in `LAB_SECTIONS`/`LAB_LABELS` (`renderOrg`/`orgInit`).
        · **Eckschnitt-Rahmen verschoben:** Der schwarze KI-Chat wird jetzt
        nach unten von `#org` gerahmt (nicht mehr `#cmp`). Regel
        `.sv-sec[data-cmp]` → `.sv-sec[data-org]` (runder Oberrand +
        schwarze Zwickel); `#cmp` wieder ohne Eckschnitt. `#kv` (über dem
        Chat) unverändert mit rundem Unterrand.
        · **Demo komplett neu (2026-09-09, `.orgx*`):** Stil der
        Klausurvorbereitung — links **3 Schritte** (Fach · Thema · Dateien),
        rechts eine von **3 Mini-Seiten**, nachgebaut aus den echten
        App-Seiten `fach.html` · `thema.html` · `dateien.html`:
          – **Fach:** Avatar + „Mathematik" + Meta, Themen-Raster
          (4 Karten mit „N Chats · N Lernzettel · N Dateien"), Klausur-Karte
          mit Themen-Chips + Note.
          – **Thema:** Breadcrumb + Fach-Pille + „Bruchrechnung" + Tab-Zeile
          (Übersicht/Chats 2/Lernzettel 1/Dateien 1/Klausuren 2), vier
          Gruppen-Karten (Chats · Dateien · Lernzettel · Klausuren) mit
          Zeilen wie in der Übersicht.
          – **Dateien:** „Alle Dateien" + Dropzone + Filter-Chips + 4
          Datei-Karten, jede mit farbiger **„Fach · Thema"-Chip** (die
          Pointe: jede Datei kennt ihr Fach und Thema).
        Slideshow: `orgInit` wechselt automatisch (4,2 s) und reagiert auf
        Klick — Schritte, **Nummern unter der Demo** (`.orgx-dots`) UND die
        drei Nutzen-Punkte (`data-org-point`, aktiver Punkt hervorgehoben)
        schalten synchron mit. Daten in `ORG` (`fach`/`thema`/`dateien`),
        Seiten-Renderer `ORG_PAGES = [orgPageFach, orgPageThema,
        orgPageDateien]`.
        · **10 neue Rahmen** (`LAB_LABELS.org`): 1 Zentriert (Default) ·
        2 Split · 3 Flip · 4 Fenster · 5 Sticky · 6 Dark · 7 Bento ·
        8 Zebra · 9 Karten · 10 Editorial. Nutzen-Punkte je Variante
        (`orgPoints()` mit Stack-/Cards-/Zebra-Modifier). CSS-Block
        „Organisation (org)" in `landing-lab.css` komplett auf `.orgx*`
        umgestellt.
        · **Erklär-Karten-Runde 11–15 (2026-09-09):** statt der 3-Schritt-
        Navi trägt die Demo hier die **kompakte App-Icon-Leiste**
        (`.orgx__rail` — Marke + 8 Icons + Avatar, ~54 px; `ORG_RAIL`),
        wodurch die Demo deutlich schmaler wird. Links (bzw. rechts) davon
        **drei Erklär-Karten** (`.org-cv__scard`, `orgSwitchCards()`), die
        wie v2/v7 die Slideshow umschalten (`data-org-point`). Zusätzlich
        sind die Rail-Icons Fächer/Themen/Dateien Umschalter
        (`data-org-nav`, in `orgInit` verdrahtet). Keine Nummern-Dots.
        11 Erklär-Split · 12 Erklär-Flip · 13 Erklär-Karten (nur Karten,
        kein Lead) · 14 Erklär-Sticky · 15 Erklär-Dark (`[data-org="15"]`).
        `orgInit`-Guard von `!steps.length` auf `!main` gelockert.
        · **org final = v11 (2026-09-09):** `fixed:'11'` in `LAB_SECTIONS`
        (org raus aus dem Dev-Panel). Zwei Korrekturen: (1) fehlendes
        `ORG_IC.topic`-Icon ergänzt — Rail-Icon „Themen" und die
        „Thema"-Erklärkarte zeigten sonst „undefined". (2) Neuer Rahmen
        `.org-cv--ecol`: Kopf mittig → drei Erklär-Karten als 3er-Reihe
        (`org-cv__switch--row`) → kompakte Demo darunter zentriert —
        gestapelt wie die KI-Chat- und KV-Section (statt nebeneinander).
        · **Feinschliff v11 (2026-09-09):**
          – **Feste Demo-Höhe:** `.orgx__main { height: 528px; overflow:
          hidden }` — bemessen an der höchsten Seite (Inhalt inkl.
          Innenabstand ~516 px), damit auf der Fach-Seite die Klausur-Karte
          und auf der Thema-Seite die Lernzettel-/Klausuren-Gruppen
          vollständig sichtbar sind. Dateien-Seite hat dadurch etwas
          Leerraum unten (bewusst). Alle drei Seiten füllen dieselbe Box,
          kein Springen beim Wechsel (Breite war über `.orgx--lg` schon
          fix). Thema-Seite zusätzlich leicht gestrafft.
          – **Thema-Färbung wie thema.html:** getönte Karten-Kopfleiste in
          der Fach-Farbe (`.orgx-group-h` mit `color-mix`-Band + farbigem
          Icon + Count-Badge), Fach-Pille mit Farbpunkt.
          – **Fortschrittsbalken:** `.orgx__progress > i` mit
          `@keyframes orgProg` (4,2 s, im Takt der Slideshow); `orgInit`
          startet ihn per Reflow-Trick (`armBar()`) mit jeder Folie neu.
          – **Wechsel-Animationen:** neue Seite blendet ein
          (`@keyframes orgPageIn`), aktive Erklär-Karte hebt an + Icon
          skaliert (weiche `transition`), Rail-Icons faden. Alle mit
          `prefers-reduced-motion`-Ausnahme.
        · **Demo-Box höher (2026-09-09):** `.orgx__main` 476 → **528 px** —
        die frühere Höhe schnitt (falsch gegen die äußere statt innere
        Höhe bemessen) die Klausur-Karte (Fach) und die Lernzettel-/
        Klausuren-Gruppen (Thema) ab. Jetzt alle drei Seiten voll sichtbar.
  - [x] **KI-Chat & TLDR final fixiert (2026-09-09):** `chatVariant()` fest
        `'3'` (Cards), `tldr`-Eintrag in `LAB_SECTIONS` mit `fixed:'16'`
        (Split Dark). Beide Achsen (`ch`, `tldr`) aus `LAB_DEV_AXES` /
        Dev-Panel raus; `ch` war der letzte manuelle Sonder-Eintrag, die
        Achsen-Liste ist jetzt nur noch `LAB_API.filter(!fixed)`.
        `applyChatVariant`/`applyChatColor`/`CHAT_VARIANTS` bleiben als tote
        Helfer. Dev-Panel zeigt nur noch: cmp · subj · test · parent ·
        faq · cta.
  - [x] **Landing-Page finalisiert — Dev-Tool raus, 10-Section-Layout,
        Schwarz/Weiß-Wechsel mit Eckschnitten (2026-09-09):**
        · **Backup:** `marketing/index-backup-2026-09-09.html` (Stand vor
        dem Umbau).
        · **Dev-Tool entfernt:** `mountLabDev()`-Aufruf aus dem
        DOMContentLoaded raus (Funktion bleibt als toter Helfer).
        `LAB_SECTIONS` = nur noch die 7 gerenderten Sections, alle mit
        `fixed`: kv `'5'` · org `'11'` · cmp `'9'` · price `'4'` ·
        parent `'1'` · faq `'1'` · cta `'1'`. `tldr`/`subj`/`test`
        entfallen als eigene Sections (Inhalt wandert in org bzw. price);
        `renderTldr/renderSubj/renderTest` + `LAB_LABELS`-Einträge bleiben
        tot.
        · **`marketing/index.html` neu:** `<main>` enthält exakt 10 Blöcke
        in dieser Reihenfolge — Hero · KV (`#kv`) · KI-Chat (`#chat`) ·
        Struktur (`#org`) · Vergleich (`#cmp`) · Preise + Stimmen
        (`#price`) · Eltern-Zugang (`#parent`) · FAQ (`#faq`) · CTA
        (`#cta`) · Footer. Alle Alt-Sections (`#tldr`, `#subj`, `#test`
        und die ~10 Nicht-Lab-Blöcke `pv3`/`wv1`/`fv2`/… ) raus. Hero-
        Button „So funktioniert’s" `#how` → `#kv`; Footer-Link ebenso;
        `faq.html`/`preise.html` `index.html#vergleich` → `#cmp`.
        · **Schwarz/Weiß-Wechsel mit Eckschnitten** (`landing-lab.css`):
        Schwarze Abschnitte = Chat, Vergleich, Eltern, CTA
        (`.sv-sec[data-cmp|data-parent|data-cta]` = `--ink-950`, heller
        Text — Pendant zur Chat-Section). Weiße Abschnitte mit rundem Rand
        NUR an Ecken, die an einen schwarzen Abschnitt grenzen: KV nur
        unten (`border-bottom-*-radius`, 2 Radial-Zwickel), org/price/faq
        an allen 4 Ecken (`border-radius: var(--section-radius)`, EIN
        `::before` mit vier `radial-gradient`-Zwickeln je Ecke,
        `z-index:-1`). Alte `[data-org]::before/::after`-Einzelregeln
        ersetzt.
        · **cmp v9 auf Schwarz:** Lesify-Karte `.cmp-card--a` → `#17191d`
        + heller Rand (statt unsichtbar auf `--ink-950`); `CMP_SPARK` =
        `LOGO_MARK` (echtes Logo statt Funken-Icon), Logo-`svg` weiß.
        · **cta v1 auf Schwarz:** `.cta-band` (dunkle Innen-Bande)
        aufgelöst — transparent, kein Padding/Radius/Schatten, `::before`
        aus.
        · **Stimmen in die Preis-Section:** `priceVoices()` rendert unter
        dem Preisraster (v4) 4 Zitat-Karten aus `TEST.items`
        (`.price-voices`, weiße Karten). Eigene Testimonial-Section
        entfällt.
        · **Fächer in die Struktur-Section:** `orgFaecher()` hängt unter
        die Demo (v11) eine Fächer-Übersicht — 6 Fach-Karten + „Eigenes
        Fach", Kartendesign wie `app/faecher.html` (farbiges Icon-Tile +
        Name + Meta), `--t` je Fach-Farbe. Eigene „Fächer &
        Klassenstufen"-Section entfällt.
        · **Eltern-Zugang neu (`renderParent`, Nachbau `app/eltern.html`):**
        Kind-Karte (`<details class="ptx-kid">`) mit Avatar, „diese Woche
        aktiv"-Ampel-Chip und 6-Kachel-KPI-Grid (`.ptx-k`: Fächer,
        Themen, Chats/Woche, Nachrichten/Woche, Lernzettel, Testklausuren/
        Woche) — bewusst ohne Chat-/Lernzettel-Inhalte, ohne Noten.
        Daneben Wochenüberblick-Report (`.ptx-report`, Ampelpunkte) und
        rechts drei Konto-Argument-Karten + „Eltern-Konto anlegen".
        Komplett dunkel gestylt. Alte `pt-*`-Varianten/CSS ersetzt durch
        `ptx-*`.
        · **Struktur-Slideshow +1 s:** `orgInit`-Intervall 4200 → 5200 ms;
        `@keyframes orgProg` / `.orgx__progress i`-Animation ebenfalls
        4200 → 5200 ms.
        · **Unterseiten Preise / Über uns / FAQ:** zunächst nur die toten
        `#vergleich`-Links auf `#cmp` gezogen. Vollständiger Umbau auf die
        Startseiten-Optik dann am 2026-09-10 (siehe „Nachbesserung"-Block
        weiter unten).
        · Im Browser (:4325) geprüft: 10 Blöcke in Reihenfolge, Schwarz/
        Weiß + Radien (kv 0/48, org/price/faq 48/48, cmp/parent/cta
        `--ink-950`), 4-Zwickel-`::before`, Logo auf der Vergleichs-Karte,
        4 Stimmen-Karten, 7 Fach-Karten, 6 KPI-Kacheln, `orgProg` 5,2 s,
        kein Dev-Panel, keine Konsolenfehler; preise/faq/ueber-uns laden
        sauber.
        · **Nachbesserung (2026-09-10):**
          – **TLDR wieder da:** `#tldr`-Section zwischen Hero und KV
          zurück (`renderTldr`, `LAB_SECTIONS`-Eintrag `fixed:'16'` an
          erster Stelle). v16 „Split Dark" ist per
          `.sv-sec[data-tldr="16"]` ohnehin ein schwarzer Vollbreiten-
          Abschnitt. Layout jetzt: Hero(w) · **TLDR(b)** · KV(w) ·
          Chat(b) · Struktur(w) · Vergleich(b) · Preise(w) · Eltern(b) ·
          FAQ(w) · CTA(b) · Footer.
          – **KV jetzt alle 4 Ecken:** KV ist neu oben (TLDR) UND unten
          (Chat) von Schwarz eingefasst → `data-kv` aus der „nur
          unten"-Gruppe in die 4-Zwickel-Gruppe verschoben
          (`landing-lab.css`). Hero behält seinen bestehenden
          `border-bottom-left-radius` + `::before`-Zwickel (schneidet
          jetzt wieder in die schwarze TLDR-Section, wie ursprünglich
          gedacht).
          – **Vergleich-Karten getauscht:** Lesify-Karte (`.cmp-card--a`)
          jetzt WEISS (`--bg-surface`, dunkler Text, Logo/Spark dunkel,
          Ampel-Icons in Hell-Theme, Primär-Button ohne `btn-on-dark`),
          Klassische Nachhilfe (`.cmp-card--b`) jetzt SCHWARZ (`#17191d`,
          heller Text, Ampel-Icons in Dunkel-Theme). Alle Textfarben je
          Karte gesetzt — vorher erbte `--b` hellen Text auf Weiß
          (unlesbar).
          – **Footer:** auf der Startseite (`body[data-page="index"]`,
          scoped in `landing-lab.css`) `margin-top: 0` + `border-top: 0`,
          obere Ecken `var(--section-radius)` rund mit zwei Radial-
          Zwickeln — schließt bündig an die schwarze CTA-Section an.
          Andere Marketing-Seiten laden `landing-lab.css` nicht, dort
          bleibt der Footer unverändert.
          – Im Browser (:4327) geprüft: Reihenfolge, TLDR rendert
          (6 Zeilen, 4 Zahlen, h2 hell), kv-Radius 48/48/48 + 4 Zwickel,
          Footer-Radius 48 + 2 Zwickel + `margin-top:0` (bündig,
          `ctaBottom === footerTop`), Vergleich-Karten A hell / B dunkel
          mit lesbaren Texten, keine Konsolenfehler.
        · **Nachbesserung 2 (2026-09-10):**
          – **Vergleich:** Callout („Ehrlich bleibt ehrlich") aus v9
          entfernt; Button auf der Lesify-Karte weg (`cmpCard('a',
          {cta:false})`); Logo = `assets/img/logo.png` (statt `LOGO_MARK`,
          `CMP_SPARK` als `<img class="cmp-card__logo">`, 24×24, r 6px) —
          die PNG ist bereits ein fertiges schwarzes App-Icon.
          – **Preise – Bestseller-Band:** Gelb → Weiß (`--paper`) auf der
          schwarzen Premium-Karte.
          – **Preise – Buttons:** auf allen weißen Karten schwarz
          (`priceCard` immer `btn-primary` statt `btn-secondary`; die
          schwarze Premium-Karte hat weiter ihren hellen Button-Override).
          – **Preise – 10 Picker-Varianten** (`priceControls(pv)`,
          `localStorage['lesify:pctrl:v']`): Standard · Gestapelt ·
          Segment · Tabs · Karte · Groß · Betreff · Chips · Track ·
          Minimal. Umschalter-Stile (`.price-toggle--pill|tabs|chips|
          text|big`) + Kinderzahl als Stepper (`.price-seats--pill|bare|
          big|track`) oder Segment-Reihe 1–4 (`.price-seats--seg|chips`,
          neues `data-seats-set`, in `priceInit` absolut ausgewertet +
          `is-on` markiert).
          – **Preise – 10 Stimmen-Varianten** (`priceVoices(tv)`,
          `localStorage['lesify:pvoice:v']`): Grid · Reihe · Marquee ·
          Groß · Zahl · Avatare · Liste · Dunkel · Bubbles · Minimal.
          Avatare jetzt fach-getönt (`--t` je `TEST_TONES`).
          – **Dev-Panel „Preise-Lab"** (`mountPriceDev`, nur `index`,
          `.layout-dev.is-price`): zwei Achsen `picker` / `stimmen`,
          klickt → `localStorage` + `LAB_API` price neu bauen.
          – Im Browser (:4331) geprüft: kein Button/Callout im Vergleich,
          Logo-PNG lädt (24×24), Band weiß, weiße Karten mit schwarzem
          Button; alle 10 Picker- und 10 Stimmen-Varianten rendern,
          Segment-Auswahl skaliert Preis (1→3 Kinder 19,99 → 49,97 €) +
          Jahres-Toggle funktioniert, keine Konsolenfehler.
        · **Nachbesserung 3 (2026-09-10):**
          – **Picker:** frühere v3 (Pill-Umschalter + Segmentreihe 1–4)
          ist die neue v1. Alle 10 Varianten nutzen jetzt denselben
          Inhalt und unterscheiden sich nur im Placement (`priceControls`
          vereinfacht, `priceSeatStepper` bleibt ungenutzt):
          1 Zentriert · 2 Links · 3 Rechts · 4 Verteilt (space-between) ·
          5 Band (volle Fläche) · 6 Karte · 7 Beschriftet (Label vor
          jeder Gruppe) · 8 Gestapelt · 9 Sticky-Leiste (`position:
          sticky`, ab ≤860 px statisch) · 10 Kompakt. `PRICE_CTRL_LABELS`
          angepasst.
          – **Stimmen:** frühere v6 (Avatar-Reihe + „+9.994" + ein
          hervorgehobenes Zitat) ist die neue v1. 9 weitere Varianten im
          selben Stil (`pvAvRow()` / `pvLead()` / `pvFirst()`):
          2 Zahl groß · 3 +2 Mini-Karten · 4 Aside (Avatare/Zahl links,
          Zitat rechts) · 5 Sterne · 6 +3 Mini-Karten · 7 Drift
          (laufende Avatar-Leiste) · 8 Dunkel · 9 Trust-Zeile · 10 Stapel
          (alle 4 Kurzzitate). `PRICE_VOICE_LABELS` angepasst; alte
          Grid/Marquee/Bubbles-Varianten + deren CSS entfernt.
          – Im Browser (:4333) geprüft: alle 10 + 10 Varianten rendern,
          Picker behält int-Toggle + 4 Segment-Buttons + Note, Segment
          skaliert Preis (1→4 Kinder 19,99 → 61,97 €), v9 `sticky` bei
          1280 px, v8-Stimmen dunkel mit hellem Text, keine
          Konsolenfehler.
        · **Nachbesserung 4 (2026-09-10):** Stimmen fest auf frühere v1
          (Avatar-Reihe + „+9.994" + Leitzitat). `priceVoices()` ohne
          Parameter, andere Stimmen-Varianten + `PRICE_VOICE_LABELS` +
          Helfer `pvFirst/pvAvRow/pvLead` entfernt; „stimmen"-Zeile aus
          dem „Preise-Lab"-Panel raus (nur noch „picker"). Überschrift
          `.price-voices__h` aus dem Markup entfernt; `.price-voices`
          ohne `border-top` / `padding-top` (nur noch `margin-top` +
          `text-align:center`). Im Browser (:4334) geprüft: keine
          Überschrift, kein Rahmen/Padding oben, 4 Avatare + Zitat +
          Cite, Dev-Panel nur „picker", keine Konsolenfehler.
        · **Nachbesserung 5 (2026-09-10):** 10 neue Picker-Varianten,
          ALLE mit Abrechnungs-Umschalter + Kinderzahl (1–4-Segment) in
          EINER horizontalen Reihe (`priceControls` neu; `flex-wrap:
          nowrap`, ab ≤620 px `wrap`):
          1 Zwei Pillen · 2 Eine Leiste (durchgehende helle Pille) ·
          3 Umrandet (Fläche über die Breite, `space-between`) ·
          4 Beschriftet (Inline-Label je Gruppe) · 5 Tabs
          (Unterstrich) · 6 Minimal (dünne Text-Buttons) · 7 Dunkle
          Leiste (schwarze Pille) · 8 Verteilt (`space-between`) ·
          9 Chips (kleine umrandete Buttons) · 10 Segmentiert (Umschalter
          im Segment-Stil der Kinderzahl, gemeinsamer Balken).
          `PRICE_CTRL_LABELS` angepasst. **Bug gefixt:** `.price-toggle`
          erbte aus `marketing.css` `margin: 0 auto 3rem` → im
          Landing-Lab-`.price-toggle` jetzt `margin: 0; border: 0`, sonst
          brach die Reihe um. Alte Placement-CSS (Band/Karte/Sticky/…)
          und toter Stimmen-Variantencode/-CSS (v2–v10) entfernt.
          Im Browser (:4335, 1280 px) geprüft: alle 10 Varianten auf
          EINER Zeile (`ctrlH` 32–68 px), Segment + Jahres-Toggle
          skalieren den Preis (2 Kinder + jährlich → 28,78 €),
          `is-on`-Zustände korrekt, keine Konsolenfehler.
        · **Nachbesserung 6 (2026-09-10):** Picker fest auf „Zwei Pillen"
          (Abrechnungs-Umschalter + Kinderzahl-Segment in einer Reihe):
          `priceControls()` ohne Parameter, `priceIntToggle`/
          `priceSeatSegment` ohne `style`-Arg; `priceSeatStepper`,
          `devVar`, `PRICE_CTRL_LABELS`, `mountPriceDev` + Aufruf und die
          Placement-CSS v2–v10 entfernt → „Preise-Lab"-Panel ist ganz
          weg. `.price-ctrl--v1` Spalten-Gap 20 → **48 px**. Grün im
          Familien-Zustand (2+ Kinder) aus dem Kinderzahl-Control
          entfernt: `.price-seats--seg.is-family` ohne grüne Fläche/
          Rahmen, `.price-seats__cap` bleibt `--ink-500`, aktive Zahl
          bleibt `--ink-950`. **Bug am Rande:** `.price-toggle` erbte aus
          `marketing.css` `margin: 0 auto 3rem` → im Landing-Lab jetzt
          `margin: 0; border: 0`. Im Browser (:4336) geprüft:
          Umschalter + Kinderzahl auf einer Zeile, Gap 48 px, kein
          Dev-Panel, im Familien-Zustand kein Grün (Text/Zahl/Fläche),
          Preis skaliert (3 Kinder → 49,97 €), keine Konsolenfehler.
        · **Unterseiten Preise / Über uns / FAQ komplett auf die
          Startseiten-Optik umgebaut (2026-09-10):** Alle drei laden jetzt
          zusätzlich `landing-lab.css` und bauen ihr `<main>` als Wechsel
          schwarzer Vollflächen-Abschnitte und weißer Abschnitte mit
          rundem Rand + schwarzem Eck-Zwickel — dieselbe Technik wie die
          `.sv-sec[data-*]` der Startseite, nur über generische Modifier
          in `landing-lab.css`:
          – `.mkt-dark` (schwarzer Abschnitt, heller Text: eyebrow / h1–h4
            / section-head-p / .cta-band aufgelöst),
          – `.mkt-cut` + `.mkt-cut--all` / `--top` / `--bottom` (weißer
            Abschnitt, 4 bzw. 2 Radial-Zwickel je Ecke gegen die
            Nachbar-Schwarzfläche),
          – `.section.mkt-dark`/`.mkt-cut { padding-block: var(--section-y) }`
            (hebt den `.section + .section`-Merge auf),
          – `.about-values__grid` (Werte-Karten auf Schwarz),
          – `.faq-bold__group` (Gruppen-Zwischenüberschrift in der
            Landing-FAQ-Liste).
          **preise.html:** Hero(w) · Tarife(w, unten rund) · Familien-
          Pakete(SCHWARZ) · Feature-Matrix(w, oben rund) · Billing-FAQ(w,
          unten rund) · CTA(SCHWARZ). Premium-Karte behält die diagonale
          weiße „Bestseller"-Ecke wie `#price`; die weißen Familien-Karten
          im Schwarz-Abschnitt bekommen wieder dunklen Text
          (`.mkt-dark .pricing-grid .price-card:not(--featured)`-Overrides).
          Stripe-Familienraster + Monats/Jahres-Umschalter unverändert.
          **ueber-uns.html:** Hero(w) · Gründer+Werdegang(w, unten rund) ·
          Werte „KI als Helfer" (SCHWARZ, 4 Karten) · Ausblick+Zahlen (w,
          alle 4 Ecken rund) · CTA(SCHWARZ). `.principle`-Block ersetzt.
          **faq.html:** Hero(w) · FAQ (w, unten rund) mit der
          Landing-Komponente `.faq-bold` / `.faq-bcard` (nummerierte
          Karten, 4 `.faq-bold__group`-Überschriften) · CTA(SCHWARZ).
          **Kollision behoben:** `landing-lab.css` trug die Basis-Regeln
          `.price-card` / `.price-card__tag` / `.price-toggle` / `.price-*`
          unscoped → auf `preise.html` überschrieben sie die
          `marketing.css`-Preiskarten (weiße Schrift auf weißer Karte).
          Jetzt alle auf `.sv--price4 …` gescoped (Startseiten-`#price`
          liegt in `.sv--price4`, `preise.html` hat kein `.sv`); die
          `.sv--price4 .price-grid--darkfeat …`-Varianten-Regeln gewinnen
          weiterhin per Spezifität. Im Browser (:4337) geprüft: alle drei
          Seiten mit `landing-lab.css`, Abschnitte bündig (gap 0), Zwickel-
          `::before` (2 bzw. 4 Layer, `z-index:-1`), dunkle Section-Köpfe
          hell, `.cta-band` transparent, Tarif-/Familien-/Feature-/FAQ-
          Inhalte lesbar und interaktiv (Umschalter, Familienraster,
          Accordion), Startseiten-`#price` unverändert (dunkle Premium-
          Karte, weiße Ecke), keine Konsolenfehler (nur die vorbestehende
          404 auf `assets/img/ueber-uns/jannik.jpg`, per `onerror`-Fallback
          „JB" abgefangen).
  - [x] **Landing-Feinschliff: Reveal-Varianten + Dev-Panel zurück,
        Header-Hover gescrollt, KV-Tage, KI-Chat-Auto-Demo, Struktur =
        Deutsch, Fach-Farben, Eltern-Zugang 10 Rahmen (2026-09-10):**
        · **Reveal-Bewegung als Achse (global):** 10 Varianten über
        `:root[data-reveal-anim="2..10"] [data-reveal]` in `marketing.css`
        (1 Rise = Standard, dazu Fade · Weit · Links · Rechts · Zoom ·
        Blur · Clip · Kippen · Feder), gekapselt in
        `@media (prefers-reduced-motion: no-preference)`. `marketing.js`:
        `REVEAL_VARIANTS`, `revealVariant()` (`localStorage['lesify:reveal:v']`),
        `applyRevealAttr` / `applyRevealVariant` (Attribut setzen, alle
        `.is-in` zurücksetzen, `initReveal()` neu — `initReveal` trennt
        jetzt einen alten `revealIO` und legt ihn in einer Modul-Variablen
        ab). Attribut wird in DOMContentLoaded aus `localStorage` gesetzt.
        · **Dev-Panel (`mountLabDev`) wieder aktiv:** Aufruf zurück in
        DOMContentLoaded. Zwei Zeilen — „reveal" (10, `data-revealv`,
        eigener Handler vor `LAB_DEV_SEL`) und „parent" (10, automatisch
        über `LAB_API`, da `parent`-Eintrag in `LAB_SECTIONS` ohne `fixed`).
        `LAB_DEV_SEL`-Guard gegen leeren Selektor ergänzt.
        · **Header gescrollt (`marketing.css`):** „Anmelden"-Hover greift
        jetzt den Nav-Link-Hover des dunklen Headers ab
        (`background: rgba(255,255,255,.1)`, Schrift weiß) statt der
        deckenden Paper-Fläche. „Kostenlos starten" (`[data-hd="2"|"4a"]
        .is-scrolled … .btn-primary:hover`) wird „hohl": Fläche
        transparent, Rand + Schrift weiß, kein Ring-Shadow.
        · **Globale Button-Sprache auf Schwarz:** `.btn-on-dark.btn-primary`
        / `.btn-secondary` bekommen jetzt Pill-Form (`--radius-full`) +
        die analogen Hover (Primär: weißer Ring, kein Bewegung; Sekundär:
        1,5 px Rand + Micro-Lift + Schatten) — vorher `--radius-lg` +
        flacher Hover. Betrifft TLDR- und Abschluss-CTA-Buttons (und die
        Feature-Seiten).
        · **KV-Demo — Tage 2/4/6/7:** waren identische Kurzansicht
        (Themen-Liste + „freigeschaltet"-Hinweis). Jetzt jeder Arbeitstag
        eine eigene abhakbare Checkliste wie `lpChecklist`/`lpTagAufgaben`
        in `app/assets/js/app.js`: Tag 2 „Fehler klären / Beispiel /
        Verständnis-Check" (erledigt), Tag 4 „Feynman / Wiederholung /
        Transfer" (offen), Tag 6 „Lücke schließen / Auffrischen" (offen),
        Tag 7 Selbsttest + Lernzettel-Vorschau (`KVL.lz`, `.kvl__lz`).
        `kvlMainFor`-Checklist-Zweig: Fuß je Zustand (Erledigt / „Tag
        abschließen" / „Freigeschaltet an Tag N"), neue Pills
        `.kvl__pill--ok|--soon`.
        · **KI-Chat-Demo = automatische Live-Demo:** `chatAppMarkup({auto})`
        rendert keine Beispiel-Chips, Composer nur Attrappe (kein
        `data-demo-form`, Input `disabled`, `.chat-app--auto` dimmt + Puls-
        Punkt am Hinweis), `data-chat-auto` am Box. `initChatDemo`:
        `auto`-Zweig spielt `CHAT_AUTO` (zusammenhängende Deutsch-
        Unterhaltung Konjunktiv II) in Schleife — Frage in den Composer
        tippen → Nutzer-Blase → KI tippt → Pause → nächste; nach dem
        letzten Schritt Log leeren und neu. Pausiert bei verstecktem Tab.
        `#chat` (`chatDemoLg`) nutzt jetzt `auto:true`.
        · **KI-Chat Fach-Farben:** Chat-Kontext ist „Deutsch · Konjunktiv
        II" → `.chat-app__idtile` / `.chat-app .chat-demo__ava` von
        `--fach-amber` auf `--fach-rose` (App-Default Deutsch = rose),
        `CHAT_HISTORY` Deutsch-Zeile amber→rose, Physik rose→pink.
        · **Struktur-Demo = Fach Deutsch statt Mathe:** `ORG.fach` /
        `ORG.thema` auf die Deutsch-Seed-Daten (Gedichtanalyse /
        Erörterung / Satzglieder; Klausur „Deutsch — Gedichtanalyse" +
        geschriebene „Satzglieder & Grammatik"). Neuer Akzent `--oc`
        (`.orgx { --oc: var(--fach-rose) }`), alle `.orgx*`/
        `.org-cv__scard`-Bezüge von `--fach-blue` auf `--oc` bzw.
        `--fach-rose`. **Themen-/Klausur-Karten** an `.thema-card` /
        `.klausur-card` angelehnt: Themenkarte mit Kurzbeschreibung +
        Haarlinien-Fuß (Zählwerte), Klausur als Liste aus anstehender
        Karte (Chips + mono Datum + Noten-Box im Fuß) und gestrichelter
        „Geschrieben"-Karte. Dateien-Seite unverändert.
        · **Fach-Farben an die App-Voreinstellung angeglichen:**
        `marketing.css` `--fach-*` um `terracotta`/`pink`/`graphit`
        ergänzt (1:1 aus `Lesify.FACH_COLORS`). `SUBJ_LIST` + `orgFaecher`
        + `ORG.dateien`: Deutsch=rose, Englisch=amber, Biologie=teal,
        Geschichte=terracotta (Seed-Zuordnung), nicht geseedete Fächer
        violet/pink/graphit.
        · **Eltern-Zugang: 10 Rahmen statt fix.** `parent`-Eintrag in
        `LAB_SECTIONS` ohne `fixed` → Dev-Panel-Achse. `renderParent(v)`
        1–10: Split · Centered · Grid · Two-Col · Panel · Up-Down ·
        Numbered · Frame · Minimal · Accordion (Bausteine `parentKidCard`
        / `parentReport` / `parentCardsHtml`/`-Num`/`-Acc`), CSS-Block
        `.sv--parent2…10` in `landing-lab.css`. **„Eltern-Konto
        anlegen"-Button aus dem Abschnitt entfernt** (alle Varianten).
        · Im Browser (:4322) strukturell geprüft: Dev-Panel mit
        reveal/parent, alle 10 Reveal-Varianten setzen/löschen
        `data-reveal-anim` + `localStorage`, alle 10 Parent-Varianten
        rendern ohne CTA-Button, TLDR/CTA-Buttons `border-radius: 999px`,
        Header-Hover-Regeln (transparent/weiß bzw. hohl), KV-Tage 2/4/6/7
        vier verschiedene Checklisten + Tag-7-Lernzettel, Chat-Auto-Demo
        läuft (Composer inert), Struktur-Fach „Deutsch"/rose,
        Fächer-Farben blue/rose/amber/teal/pink/terracotta, keine
        Konsolenfehler. Volle visuelle Abnahme offen (Pane zeigt keine
        Screenshots).
  - [x] **Nachbesserung: Reveal wirklich global, KV-Lernzettel als
        Dokument statt Text, feste Demo-Höhen, Struktur-Thema zurück auf
        Mathe, Eltern-Zugang-Demo statt Layout-Varianten (2026-09-11):**
        · **Reveal war faktisch nur der Hero** — die Sections werden per
        JS-String gebaut und trugen gar kein `[data-reveal]`. Neue
        `markRevealBlocks(root)`: markiert nach jedem (Neu-)Bau die
        direkten Kinder jedes `.container` mit `[data-reveal]` +
        gestaffeltem `data-reveal-delay` und ruft `initReveal()` neu auf.
        Aufruf in `labSectionApi.build()` (deckt tldr/kv/org/cmp/price/
        parent/faq/cta) und `buildChatSection()`.
        · **KV Tag 7 — Lernzettel ist ein Dokument, kein Fließtext:**
        die eingebettete Absatz-Vorschau (`KVL.lz`, `.kvl__lz-row`) war
        sachlich falsch — der Lernzettel wird auf der echten Seite nicht
        inline angezeigt. Ersetzt durch eine einzelne „öffnen"-Zeile wie
        ein Datei-Link (`KVL.lzTitle`/`lzMeta`, `.kvl__lz-doc`).
        · **Demos wachsen nicht mehr mit dem Inhalt — feste Höhe,
        scrollt bei Bedarf** (galt vorher nur für `.orgx__main`):
        `.kvl__main` von `min-height` auf `height: 480px` +
        `overflow-y: auto`; `.chat-app` bekommt jetzt selbst eine feste
        `height` je Größe (560/480/620/680px — vorher nur Grid `1fr`
        ohne definierte Containerhöhe, dadurch griff `max-height` auf
        `.chat-app__thread` nicht zuverlässig), `.chat-app__thread`
        vereinfacht auf `flex:1; min-height:0; max-height:none` (füllt
        den Rest exakt, scrollt intern statt die Karte zu strecken).
        · **Struktur — Thema-Karte zurück auf Bruchrechnung/Mathe:**
        `ORG.thema` wieder die ursprünglichen Mathematik-Daten (Fach-
        Karte bleibt Deutsch). Akzent nicht mehr statisch `--oc: rose`
        auf `.orgx`, sondern **live pro aktiver Seite** gesetzt
        (`orgInit`.`show()`: `ORG_ACCENT = [rose, blue, ink-950]`) —
        Fach = rose, Thema = Mathe-Blau, Dateien = Schwarz (kein
        einzelnes Fach). Die drei Erklär-Karten (`org-cv__scard`) tragen
        jetzt feste Farben je `data-org-point` (0 rose/1 blau/2 schwarz)
        statt alle denselben Ton.
        · **Eltern-Zugang — nur noch EIN Seiten-Layout (Two-Col), die
        Dev-Panel-Achse „parent" wählt jetzt das Design der DEMO selbst:**
        `renderParent` baut immer dieselbe `.pt-2col`-Struktur (Text +
        Argumente links, Demo rechts); neu ist `eltDemo(v)` mit 10
        Designs (Kacheln · Split · Report · Bento · Stapel · Kompakt ·
        Zeitleiste · Ampel · Familie · Minimal) in derselben `.elt-demo`-
        Hülle (Browser-Chrome-Leiste + feste Höhe wie kvl/orgx/chat-app).
        Alte Layout-Varianten (v1/2/3/5/6/7/8/9/10 als Seiten-Anordnung)
        + zugehörige tote CSS (`.pt-grid`/`.pt-panel`/`.pt-ud`/`.pt-num`/
        `.pt-frame`/`.pt-accw` u. Ä., dazu ein bereits vorher totes
        Alt-Fragment `.pt-report`/`.pt-points`/`.pt-split`/…) entfernt;
        `parentKidCard`/`parentReport`(`.ptx-kid`/`.ptx-report`) bleiben
        nur noch als tote Helfer für die (inerten) Feature-Unterseiten.
        · Im Browser (:4322) geprüft: `[data-reveal]` jetzt in jeder
        Section (nicht nur Hero), Tag 7 zeigt die Dokument-Zeile statt
        Absatztext, `.kvl__main` bleibt bei jedem Tag 480 px hoch
        (Tag 2 mit 5 Punkten scrollt intern), `.chat-app` bleibt bei 15
        zusätzlichen Testnachrichten bei fixer Höhe (Thread scrollt),
        Struktur-Akzent live rose/blau/schwarz je Seite + Thema wieder
        „Bruchrechnung"/„Mathematik", alle 10 Eltern-Demo-Varianten
        rendern in derselben `.pt-2col`-Hülle ohne CTA-Button, keine
        Konsolenfehler.
  - [x] **Nachbesserung 2: Eltern-Demo = echte drei Kinder statt
        10 Design-Varianten, Reveal fest auf Zoom, Dev-Tool komplett
        raus (2026-09-11):**
        · **Eltern-Zugang — eine Demo, 1:1 `kindCard()`/`kzGrid()` aus
        app/eltern.html:** die 10 Design-Varianten (`eltDemo(v)`,
        `.elt-demo--1..10`) waren nicht das Ziel — ersetzt durch eine
        einzige Demo mit den drei echten Seed-Kindern
        (`SEED.familie.kinder` in app/assets/js/data.js): **Mara Berger**
        (8. Klasse, violet, aufgeklappt — 7-Kachel-Wochenüberblick 6
        Fächer/14 Themen/9 Chats diese Woche/63 Nachrichten diese
        Woche/11 Lernzettel gesamt/2 Testklausuren diese Woche/2
        Anstehende Klausuren, Ampel „Diese Woche aktiv" — echte Regel
        `nachrichtenDieWoche ≥ 30`), **Jonas Berger** (6. Klasse, teal,
        zu — Ampel „Wenig aktiv", 11 Nachrichten), **Lea Berger**
        (9. Klasse, amber, zu, `is-pending` — noch nicht eingeladen,
        „Einladung ausstehend" statt Ampel-Chip). Neue Bausteine
        `PARENT.kinder` + `eltKidCard()`/`eltDemo()` (kein Parameter
        mehr), CSS `.elt-kid-card*`/`.elt-kzgrid`/`.elt-kz`/`.elt-chip--
        gruen|gelb|rot` ersetzt den alten `.elt-*`-Variantensatz
        komplett. `renderParent` wieder ohne `v`-Verzweigung,
        `LAB_SECTIONS`: `parent` wieder `fixed: '1'` — raus aus dem
        Dev-Panel. Bleibt: feste `.pt-2col`-Seiten-Struktur, App-Fenster-
        Hülle mit fester Höhe (480 px, scrollt), kein CTA-Button.
        · **Reveal-Bewegung final auf 6 · Zoom:** `applyRevealAttr('6')`
        fest in DOMContentLoaded statt `revealVariant()` aus
        `localStorage`; `REVEAL_VARIANTS`/`revealVariant()`/
        `applyRevealVariant()` bleiben als tote Helfer (CSS-Block
        „Reveal-Varianten" in `marketing.css` bleibt komplett, dokumentiert
        die anderen 9 Bewegungen).
        · **Dev-Tool (Landing-Lab-Panel) komplett entfernt:** Jetzt sind
        ALLE `LAB_SECTIONS`-Einträge `fixed` und die Reveal-Achse ist
        hart codiert — `mountLabDev()`-Aufruf aus DOMContentLoaded raus
        (Funktion bleibt toter Helfer, wie beim Vorbild „Dev-Tool
        entfernt" vom 2026-09-09). Die `data-revealv`-Zeile/-Handler aus
        `mountLabDev()` entfernt.
        · Im Browser (:4322) geprüft: kein `.layout-dev`-Panel mehr im
        DOM, `data-reveal-anim="6"` fest gesetzt (frisches Test-Element
        zeigt `scale(0.9)`), Eltern-Demo zeigt genau 3 Kind-Karten (Mara
        offen mit 7 Kacheln, Jonas/Lea zu), Farben/Ampel/Pending-Zustand
        korrekt, feste 480-px-Höhe, kein CTA-Button, keine
        Konsolenfehler.
  - [x] **Echtes Logo + Header-Neuaufbau in 10 Varianten (2026-09-07):**
        · **Logo:** Die Marke im Marketing war bisher ein Platzhalter-SVG
        (Zwei-Blatt). Neu: das echte Lesify-Zeichen (Schallwellen-Swoosh,
        deckungsgleich mit `marketing/assets/img/logo.png`) als
        `LOGO_MARK`-Konstante (currentColor) in `marketing.js` —
        `ICON.mark` (Nav + Footer) und `CHAT_MARK` (KI-Chat-Avatar/Marke)
        zeigen es jetzt. Neue Asset-Datei `marketing/assets/img/logo-mark.svg`
        (currentColor). Auth-Seiten (`login`/`registrieren`/`checkout`/
        `passwort-vergessen`) nutzen `<img src="assets/img/logo-mark.svg">`
        im `.brand__mark`. `.brand__mark svg/img` auf 18 px. Favicon bleibt
        `logo.png`.
        · **Header (Runde 1, verworfen):** kurzzeitig 10 Nav-Designs als
        Dev-Achse „Header" — nach Feedback ersetzt (siehe unten).
  - [x] **Header-Runde 2: transparent oben, „normal" beim Scrollen —
        5 Designs (2026-09-07):** Feedback: über dem Hero soll die Leiste
        komplett transparent sein (kein Rand, kein Hintergrund, kein Blur),
        ab dem ersten Scrollen der „normale" Header; Favoriten aus Runde 1
        waren die Glas-Pille (v1) und die dunkle Pille (v7). Umsetzung:
        `HEADER_VARIANTS` → 5, `headerVariant()`-Regex `[1-5]`. Gemeinsamer
        Transparent-Zustand für `.mkt-nav[data-hd="1..5"] .mkt-nav__inner`
        (`background/border-color: transparent`, kein Shadow/Blur);
        `.is-scrolled` (JS-Handler unverändert, ab `scrollY>12`) blendet pro
        Variante den Zielzustand ein — `border-color` in die Transition der
        Basis aufgenommen. Die 5: **1 Glas** (helle Glas-Pille, Blur,
        Shadow) · **2 Dunkel** (Ink-950-Pille, helle Schrift/Links/CTA,
        invertierte Logo-Kachel — nur im gescrollten Zustand) · **3 Leiste**
        (immer flush & randlos, gescrollt Vollbreiten-Leiste mit Haarlinie
        unten + Blur, kein Layout-Sprung) · **4 Solid** (deckende weiße
        Pille, kräftigerer Rand, kein Blur) · **5 Kontrast** (helle Fläche
        mit 1,5 px Ink-Kontur, eckigere Ecken, kein Blur/Shadow). Alle 5
        per Computed-Style in beiden Zuständen geprüft (oben überall
        transparent; gescrollt je eigener bg/border/radius/blur), Variante 2
        zusätzlich per Screenshot; `window.scrollTo` schaltet `.is-scrolled`
        im eingeklappten Pane nicht selbst — manuell erzwungen. Keine
        Konsolenfehler. **Offen:** Header + restliche Achsen final wählen,
        Dev-Panel danach entfernen.
  - [x] **Hero-Foto → 4er-Slideshow mit echten Fotos (2026-09-07):**
        Neuer Bild-Ordner `marketing/assets/img/lesi-mgs-nw-hero/`
        (69–72.jpg, je 1500×1500, Person mit Tablet + Lesify-App). Das
        bisher statische `.hv9__photo` (ein Bild, `test-img.png` im CSS)
        wird zu vier gestapelten `.hv9__photo`-Ebenen in `.hv9__panel`
        (`index.html`), die per Cross-Fade (`opacity`/`.is-on`, 700 ms)
        synchron zur aktiven Karten-Folie laufen: Folie 0–3 → Bild 69–72.
        `setHeroPhoto()` in `marketing.js`, aufgerufen aus `show()` in
        `initHeroSlides()` (nur für die sichtbare Slideshow-Gruppe,
        `offsetParent !== null`). CSS: `background-image` aus der
        `.hv9__photo`-Basisregel entfernt (jetzt inline pro Ebene),
        Fade + reduced-motion-Guard ergänzt. Im Browser (frischer Port)
        geprüft: 4 Ebenen, alle 200, Sync bei Autoplay + Pfeil-Klick
        (69→70→71→72→wrap), keine Konsolenfehler.
  - [x] **Header-Feinschliff (Feedback zu v2, 2026-09-07):** gilt für
        alle 5 Header-Varianten (`.mkt-nav[data-hd]`). 1) **Marke oben
        größer, schrumpft beim Scrollen:** `.brand` bekommt im nicht
        gescrollten Zustand `transform: scale(1.22)` (Ursprung links,
        240 ms, kein Layout-Reflow) — beim Scrollen zurück auf 1. 2)
        **Nav über Hero lesbar:** weicher Seiten-Kopf-Schleier als
        `.mkt-nav[data-hd]::before` (heller Verlauf `bg-canvas` 0.82→0,
        Höhe 132 px, `blur(3px)`, `pointer-events:none`, `z-index:-1`),
        nur solange nicht gescrollt (fade-out via `.is-scrolled::before
        { opacity:0 }`); zusätzlich Links/`btn-ghost` im Top-Zustand auf
        `--ink-800`/`--ink-900` gedunkelt. Deckt weißen Hero UND
        diagonales Foto ab, ohne wie eine feste Leiste zu wirken.
        Im Browser (frischer Port) geprüft — v2: oben scale(1.22) +
        Schleier sichtbar, gescrollt scale(1) + Schleier weg + dunkle
        Pille; keine Konsolenfehler. (Impeccable-Hook markierte kurz
        Width/Height-Transitions — behoben, jetzt reine transform-/
        opacity-Animation.)
  - [x] **Header auf 2 Setups reduziert + Foto-Schleier-Flip
        (Feedback, 2026-09-07):** Der weiße Schleier + Blur hinter dem
        Header (`.mkt-nav[data-hd]::before` + Link-/CTA-Dunkelung) ist
        entfernt. Stattdessen steuert das Setup jetzt den **Foto-
        Schleier** (`.hv9__panel::after`): `applyHeaderVariant()` setzt
        zusätzlich `data-header` auf `<body>`; CSS in `landing-lab.css`.
        · **1 Standard** = bisheriger Stand: Schleier dunkelt nach unten
        ab, gescrollt helle Glas-Pille.
        · **2 Vorschlag** = `body[data-header="2"]`: Schleier wird
        stattdessen nach OBEN hell/weiß (linear-gradient to bottom,
        `#fff` 0.96 → 0 bei ~52 %), macht die transparente Nav über dem
        Foto lesbar; gescrollt dunkle Pille. Kein Bottom-Dark mehr in v2.
        Marke-Skalierung (scale 1.22 oben → 1 gescrollt) bleibt für beide.
        `HEADER_VARIANTS` → 2, Regex `[12]`, Dev-Achse „Header" zeigt nur
        noch „1 · Standard" / „2 · Vorschlag". CSS für die alten
        Varianten 3–5 (Leiste/Solid/Kontrast) entfernt. Im Browser
        (frischer Port) geprüft: Umschalten setzt `data-hd` + `data-header`,
        v1-Schleier `to top` dunkel / v2-Schleier `to bottom` weiß,
        Header-`::before` = `content:none`, keine Konsolenfehler.
  - [x] **Header +2 Setups auf 1-Basis (Feedback, 2026-09-07):**
        `HEADER_VARIANTS` → 1/2/3/4a/4b/4c, Regex `([123]|4[abc])`.
        · **3 Links** — Nav-Links linksbündig neben dem Logo
        (`.mkt-nav[data-hd="3"] .mkt-nav__links { margin:0 }`, Aktionen
        `margin-left:auto`), damit sie über dem weißen Hero-Bereich
        stehen; sonst = 1. · **4a/4b/4c Pills** — Nav-Links bekommen im
        Hero-Zustand (`:not(.is-scrolled)`) einen Hintergrund, „Anmelden"
        eine dezente Glas-Fläche: **4a** Track (alle Links in einer
        eingefassten Glas-Spur, aktiv = weiße Pille), **4b** Chips (je
        Link eigene Glas-Pille + Schatten, aktiv = Ink gefüllt), **4c**
        Outline (umrandete, fast durchsichtige Chips, aktiv = Ink
        gefüllt). Ab `.is-scrolled` fallen 3 + 4x auf den 1-Look zurück
        (klare Glas-Pille, schlichte Links — kein Pille-in-Pille). Shared
        Transparent-Oben + Glas-Pille-Regel um `[data-hd="3"]` /
        `[data-hd^="4"]` erweitert. 3/4x setzen `body[data-header]` auf den
        Wert, greifen aber nicht die `="2"`-Schleier-Regel → Foto-Schleier
        bleibt wie bei 1 (unten dunkel). Im Browser (frischer Port)
        geprüft: 6 Dev-Buttons, v3 Links linksbündig (linksLeft =
        brandRight), 4a Track-BG, 4b Chips, 4c Outline je sichtbar,
        gescrollt alle = Glas-Pille mit transparenten Links, keine
        Konsolenfehler.
  - [x] **4a scrollt jetzt in den dunklen 2-Look (Feedback, 2026-09-07):**
        `[data-hd="4a"]` aus der hellen Glas-Pille-Regel (jetzt nur
        `1/3/4b/4c`) entfernt und zu allen `[data-hd="2"].is-scrolled …`
        Regeln (Inner-BG `--ink-950`, `brand__word`/`brand__mark` invers,
        Links/`btn-ghost` hell, `btn-primary` weiß, `nav-toggle` dunkel)
        hinzugefügt. 4a im Hero-Zustand weiter transparent + Track-Pillen;
        gescrollt = dunkle Pille wie 2. Computed-Style geprüft: 4a +
        `.is-scrolled` → `.mkt-nav__inner` bg `rgb(16,18,20)`, gewinnende
        Regel `[data-hd="4a"].is-scrolled .mkt-nav__inner`; 4b/4c weiter
        helle Pille. Keine Konsolenfehler. (Screenshot des gescrollten
        Zustands im eingeklappten Pane unzuverlässig — per getComputedStyle
        + Rule-Match bestätigt.)
  - [x] **Header + Hero-Karte final gewählt, aus Dev-Panel entfernt
        (2026-09-07):** `LAB_DEV_AXES` nur noch `Chat` + `Chat-Farbe`
        (+ die 8 sv-Sections). **Header = "4a"** — `buildNav()` ruft fest
        `applyHeaderVariant('4a')`; `HEADER_VARIANTS`/`headerVariant()`
        entfernt. **Hero-Karte = "2b"** (Lower-Third im Foto, liegt im
        `.hv9__panel`, vom Diagonal-Schnitt beschnitten) — `buildHeroStage()`
        ruft fest `applyHeroCardVariant('2b')`; `HERO_CARD_VARIANTS`/
        `heroCardVariant()` entfernt. `mountLabDev()` ohne die beiden
        `applyX(LAB_DEV_MAP…)`-Zeilen. Die CSS-Rahmen der übrigen
        Header-Varianten (1/2/3/4b/4c) + Hero-Karten (2/3/3b) bleiben
        im Stylesheet (ungenutzt, reversibel). Im Browser (frischer Port)
        geprüft: Dev-Panel-Zeilen = Chat/Chat-Farbe/kv/…; `#mkt-nav`
        `data-hd="4a"` + Track-Pillen, `.hv9` `data-hero-card="2b"`, nur
        `data-hero-slides="2b"` sichtbar; keine Konsolenfehler.
  - [x] **Landing-Lab: Button-Stile + Hero-Farbe als Dev-Achsen
        (2026-09-07):** Drei neue Zeilen im „Landing-Lab"-Dev-Panel
        (`LAB_DEV_AXES` vorangestellt), je v1 = aktueller Stand.
        · **Btn prim** (`bp`, `data-btnp` auf `<body>`,
        `localStorage['lesify:btnprimary:v']`, Regex `[1-6]`): 5 neue
        Varianten des Haupt-Buttons (`.btn-primary`, z. B. „Kostenlos
        starten") — 2 Verlauf (Tiefen-Gradient + oberer Glanz, Hub),
        3 Pill (volle Rundung + Fokus-Ring-Glow), 4 Blau (`--fach-blue`
        statt Tinte), 5 Kontur (Umriss, füllt sich beim Hover), 6 Raise
        (dauerhafter Schatten + Translate).
        · **Btn sek** (`bs`, `data-btns` auf `<body>`,
        `localStorage['lesify:btnsecondary:v']`, Regex `[1-6]`): 5 neue
        Varianten des Zweit-Buttons (`.btn-secondary`, z. B. „So
        funktioniert's" / „Anmelden") — 2 Tinte (Ink-Umriss → Füllung),
        3 Ghost (nur Text), 4 Grau (weiche Graufüllung, kein Rand),
        5 Blau (Marken-Blau als Umriss), 6 Pill (volle Rundung,
        kräftigerer Rand). `.btn-on-dark` in allen Regeln per `:not()`
        ausgenommen. CSS-Block in `marketing.css` direkt hinter den
        Basis-Buttons.
        · **Hero-Farbe** (`hc`, `data-hero-color` auf `.hv9`,
        `localStorage['lesify:herocolor:v']`, Regex `[1-9]|10`): 9 neue
        Fassungen der Hero-Auszeichnung — steuert gemeinsam die Markierung
        von `<em>Nachhilfe</em>` (`h1 em::after`) und den Akzent der
        Foto-Leiste (`.hs-c2 { --hs-accent }`, überschreibt die per Folie
        von `initHeroSlides()` gesetzte Fach-Farbe). v1 = gelb + Fach-Farbe
        je Folie. **Farbig:** 2 Blau, 3 Grün, 4 Violett, 5 Verlauf
        (Blau→Violett-Unterstrich + Progress-Gradient). **Nur Lesify-
        Palette (kein Buntton):** 6 Tinte (grauer Marker-Block hinter dem
        Wort), 7 Linie (dünner Ink-Unterstrich), 8 Marker invers (Wort
        auf Ink gesetzt, `::after` aus), 9 Fog (blaugrauer `--ink-300`-
        Block), 10 Doppel (`double`-Unterstrich). CSS-Block in
        `landing-lab.css` hinter der Hero-Text-Sektion. Init in
        DOMContentLoaded (`applyBtnPrimary/-Secondary/-HeroColor`), gilt
        auf allen Marketing-Seiten (Dev-Panel selbst nur `index.html`).
        Im Browser (frischer Port :4322) je Variante per Computed-Style
        geprüft (Buttons mit deaktivierten Transitions, weil das
        eingeklappte Pane die Transition-Timeline einfriert; Hero-Farbe +
        Screenshots direkt), alle Achsen greifen, keine Konsolenfehler.
        **Offen:** je Achse eine Variante final wählen, Dev-Panel danach
        entfernen.
  - [x] **Landing-Lab-Runde 2: Button-Grund-Stil fixiert, Achsen auf
        reine Hover-Animation umgestellt; Hero-Farbe v1 folgt der
        Folienfarbe (Feedback, 2026-09-07):**
        · **Btn prim = v1 fest:** solide Tinte (Basis `.btn-primary`,
        keine Regel). · **Btn sek = v1 fest:** Pill mit kräftigerem
        1,5-px-Rand (früher „v6") — jetzt Grund-Stil für ALLE Achsen-Werte
        (`body[data-btns] .btn-secondary:not(.btn-on-dark)`). Der
        Header-„Anmelden"-Button ist `btn-ghost`, nicht `btn-secondary`,
        und bleibt davon unberührt.
        · **Beide Achsen jetzt 10 Werte, Regex `[1-9]|10`,
        `BTN_HOVER_VARIANTS` (geteilt).** v1–v10 sehen im Ruhezustand
        IDENTISCH aus (per Computed-Style bestätigt: Primär bg/color/
        radius, Sekundär Pill/1,5-px-Rand über v1/4/7/10 gleich),
        Unterschied NUR in der Hover-Animation:
        1 Standard · 2 Snappy (90 ms, harter Micro-Lift) · 3 Smooth
        (340 ms ease-out-expo, −2 px) · 4 Spring (federnd,
        `cubic-bezier(.34,1.56,.64,1)`, −4 px + `--shadow-lg`) ·
        5 Press (`translateY(2px) scale(.985)`, taktil) · 6 Zoom
        (`scale(1.05)`) · 7 Shine (`::after`-Lichtstreifen wandert einmal
        durch, `overflow:hidden`; heller Streifen für Primär, dunkler für
        Sekundär; `@keyframes btnShine`) · 8 Puls (pulsierender Ring
        solange gehovert, `@keyframes btnPulse`, `infinite`) · 9 Ring
        (Kontur-Ring `box-shadow 0 0 0 4px` wächst weich) · 10 Wackeln
        (`@keyframes btnWobble`, kurzer Rotations-Wobble). `@media
        (prefers-reduced-motion: reduce)` schaltet `animation`/`transform`
        der Hover-Zustände ab. Impeccable-Hook meldet die Overshoot-/
        Bounce-Easing in v4 + v10 — hier bewusst: „Spring" und „Wackeln"
        sind gerade die Varianten, die diesen Charakter zeigen sollen
        (Auswahl-Lab). CSS-Block in `marketing.css` ersetzt die alten
        Button-Varianten.
        · **Hero-Farbe v1:** wie bisher (Karten-Akzent je Folie), aber die
        Auszeichnung von `<em>Nachhilfe</em>` (`h1 em::after`) läuft jetzt
        mit der Karten-/Slider-Farbe mit: `show()` in `initHeroSlides()`
        legt den Akzent der aktiven Folie zusätzlich als `--hero-accent`
        auf die `.hv9`-Section (nur für die sichtbare Gruppe,
        `offsetParent`-Guard), `.hv9[data-hero-color="1"] h1 em::after`
        nimmt ihn auf (`var(--hero-accent, var(--gelb))`, opacity 0.5,
        `transition: background 420ms`). Per Computed-Style bestätigt:
        Akzent blau→amber→teal→violet → Auszeichnung folgt exakt (im
        Screenshot Wechsel gelb→farbig sichtbar; das eingeklappte Pane
        friert die 420-ms-Transition ein und zeigt kurzzeitig noch den
        Alt-Wert — Live-Timeline korrekt). v2–v10 unverändert.
        **Namens-Labels** im Panel angepasst (Btn-Achsen:
        Standard/Snappy/…/Wackeln; Hero-Farbe v1 „Gelb→Akzent").
        **Offen:** je Achse eine Variante final wählen, Dev-Panel danach
        entfernen.
  - [x] **Landing-Lab-Runde 3: Buttons rund, Sekundär fixiert, Primär =
        10 minimalistische Hover-Varianten, Header nutzt die Button-Stile
        (Feedback, 2026-09-07):**
        · **Rundung:** beide Buttons jetzt `border-radius: var(--radius-full)`
        (Primär über `body[data-btnp] .btn-primary:not(.btn-on-dark)`,
        Sekundär über `.btn-secondary:not(.btn-on-dark)`).
        · **Sekundär-Button final gewählt, aus dem Dev-Panel entfernt:**
        Pill + 1,5-px-Rand + „Snappy"-Hover (`translateY(-1px)` +
        `--shadow-md`, Rand zieht auf `--ink-950`). Achse `bs` /
        `BTN_SECONDARY_VARIANTS` / `btnSecondaryVariant` / `applyBtnSecondary`
        / `localStorage['lesify:btnsecondary:v']` raus; feste Regeln in
        `marketing.css`.
        · **Primär-Button: 10 NEUE Hover-Varianten** (Achse `bp` bleibt,
        `BTN_PRIMARY_VARIANTS`, Regex `[1-9]|10`). Ruhezustand für alle
        10 IDENTISCH (Pill, solide Tinte — per Computed-Style über v1–v10
        bestätigt: bg/color/radius gleich, `transform: none`).
        **Minimalistisch, der Button selbst bewegt sich nicht** (kein
        `transform` auf `.btn-primary` in irgendeinem `:hover` — nur der
        `prefers-reduced-motion`-Block nennt `transform`, und der setzt es
        auf `none`). Die 10: 1 Standard (Tinte → `--ink-800`) · 2 Hell
        (→ `--ink-600`) · 3 Schatten (`--shadow-md`) · 4 Ring (`box-shadow
        0 0 0 3px`) · 5 Puls (`@keyframes btnRingPulse`, atmender Ring,
        `infinite`) · 6 Glow (diffuser Schein) · 7 Invert (Farbtausch
        Tinte↔Papier, kein Move) · 8 Unterstrich (`::after`-Linie am Fuß
        blendet per `opacity` ein) · 9 Sheen (`::after`-Lichtstreifen
        `@keyframes btnSheen`, `overflow:hidden`, Button bleibt) ·
        10 Kontrast (`filter: brightness(1.22)`). `prefers-reduced-motion`
        schaltet Hover-`animation`/`transform` ab. Alte Varianten-Keyframes
        (`btnShine`/`btnPulse`/`btnWobble`) ersetzt.
        · **Header nutzt Primär/Sekundär:** „Anmelden" im
        `.mkt-nav__actions` von `btn-ghost` → `btn-secondary` (Markup in
        `marketing.js`), „Kostenlos starten" bleibt `btn-primary`. Nav-CSS
        (`marketing.css`): die drei `.mkt-nav__actions .btn-ghost`-Regeln
        auf `.btn-secondary` umgestellt — Hero-Zustand
        (`[data-hd^="4"]:not(.is-scrolled)`): halbtransparente weiße Fläche
        + Blur; gescrollt (`[data-hd="4a"]/[="2"].is-scrolled`):
        transparent + heller Text + heller Rand (On-Dark-Outline);
        Mobile-Ausblenden (`@media 960px`) ebenfalls auf `.btn-secondary`.
        Im Browser (frischer Port :4322) geprüft: Dev-Panel ohne „Btn sek",
        beide Buttons `999px`, v1–v10 Ruhezustand gleich + kein Hover-Move,
        „Anmelden"/„Kostenlos starten" Pillen im Hero- UND gescrollten
        Header-Zustand korrekt, keine Konsolenfehler.
        **Offen:** Primär-Hover final wählen, Dev-Panel danach entfernen.
  - [x] **Landing-Lab-Runde 4: Buttons final, „Anmelden" = Nav-Link,
        Hero-Grid vertikal zentriert (Feedback, 2026-09-07):**
        · **Primär-Button = „Ring"-Hover final gewählt**, Achse `bp` aus
        dem Dev-Panel entfernt (`BTN_PRIMARY_VARIANTS` / `btnPrimaryVariant`
        / `applyBtnPrimary` / `data-btnp` / `localStorage['lesify:btnprimary:v']`
        raus). Feste Regel in `marketing.css`: `.btn-primary:not(.btn-on-dark)`
        = Pill + Transition, `:hover` = `box-shadow: 0 0 0 3px rgba(16,18,20,.16)`
        (kein `transform` — verifiziert). Sekundär-Button unverändert
        (Pill + 1,5-px-Rand + Snappy-Hover). Die 10 Varianten-Blöcke +
        `@keyframes btnRingPulse`/`btnSheen` entfernt.
        · **„Anmelden" im Header** von `btn-secondary` → `mkt-nav__link`
        (Markup in `marketing.js`): kein Button mehr, sondern eine
        eigenständige Pille im Stil der Nav-Link-Spur. `.mkt-nav__actions
        .mkt-nav__link` — Hero (`:not(.is-scrolled)`): Fläche
        `rgba(255,255,255,.62)` + `1px solid var(--line)` + `--shadow-sm`
        + `blur(10px)` (= gleiche Fläche/Rand wie `.mkt-nav[data-hd="4a"]
        :not(.is-scrolled) .mkt-nav__links`), Text `--ink-700`.
        `.mkt-nav.is-scrolled`: Fläche + Rand + Shadow weg, Text
        `rgba(255,255,255,.7)` (wie die Nav-Links auf der dunklen Pille).
        **Hover (beide Zustände):** `background: var(--paper)` +
        `color: var(--ink-950)`. Tote `.mkt-nav__actions .btn-secondary`-
        Regeln entfernt; Mobile-Ausblenden (`@media 960px`) auf
        `.mkt-nav__link`. `.btn-ghost` wird nirgends mehr verwendet (nur
        noch die Basis-Klasse in `marketing.css`). (Computed-Style-Check
        mit deaktivierten Transitions: Hero-Rest = Track-Fläche/-Rand,
        Hover = `#f8fafb` + `rgb(16,18,20)`, gescrollt analog.)
        · **Hero-Grid vertikal mittig — nur über die Paddings** (`.hv9`
        in `landing-lab.css`, Höhe bleibt inhaltsgetrieben, KEIN
        `min-height` / kein Flex): `padding-top: clamp(7.5rem, 5.5rem +
        6vw, 10.5rem)`, `padding-bottom: clamp(2rem, 6vw, 5rem)` — so
        gewählt, dass `padding-top − padding-bottom` an JEDER
        Viewport-Breite genau 5,5 rem (≈ Header-Höhe) ist. Damit sitzt
        `.hv9__grid` optisch mittig zwischen Header-Unterkante und
        Section-Ende. Im Browser geprüft: 1280×800 → 77 px = 77 px,
        1024×768 → 62 px ≈ 61 px; `display: block`, `min-height: 0`.
        Dev-Panel jetzt ohne „Btn prim" / „Btn sek"; Primär-Hover = Ring
        ohne Move, „Anmelden" wie Nav-Link im Hero + gescrollt, Grid
        zentriert — im Browser geprüft, keine Konsolenfehler.
  - [x] **`funktionen.html` durch 5 Feature-Unterseiten + Header-Mega-Menü
        ersetzt (2026-09-08):** Die einzelne Funktionen-Seite ist raus.
        · **Mega-Menü:** `NAV_LINKS[0]` (`Funktionen`) ist kein Link mehr,
        sondern ein `<button class="mkt-nav__mega-btn" aria-haspopup
        aria-expanded aria-controls>` mit Panel `#mkt-mega` (`role="menu"`,
        5 `menuitem`-Links aus neuer Liste `FEATURE_LINKS` in
        `marketing.js`). Desktop: Hover (120 ms Delay) / Klick / Enter /
        ArrowDown öffnet, Escape schließt + Fokus zurück, Klick außerhalb +
        `focusout` aus dem Item + `hashchange`/`pagehide` schließen; bewusst
        KEIN `focusin`-öffnet (sonst Re-Open nach Escape). Touch
        (`hover:none`): nur Klick. Mobile: Sheet-Akkordeon
        (`.sheet-acc__btn` + `.sheet-acc__panel`, `initSheetAccordion`).
        CSS neu in `marketing.css` (Mega + Akkordeon, inkl. `data-hd`-
        Scroll-/Hero-Zustände + `prefers-reduced-motion`).
        · **Feature-Seiten:** `feature-chat.html`,
        `feature-klausurvorbereitung.html`, `feature-lernplaene.html`,
        `feature-testklausuren.html`, `feature-lernzettel.html` — je nur
        Shell mit `<body data-feature="…">` + `<div id="feature-page">`.
        EIN gemeinsames Schritt-Layout (`buildFeaturePage` / `FEATURE_PAGES`
        in `marketing.js`, CSS in neuer `marketing/assets/css/feature.css`):
        normales Scrollen, kein Snap; je Schritt Nummer + Eyebrow + H2 +
        Text links, Demo rechts (Desktop) bzw. Text über Demo (Mobile,
        `@media 900px`) — über alle 5 Seiten identisch. Demos sind die
        vorhandenen Bausteine der Startseite: `chatDemoMarkup`/`initChatDemo`,
        `chatAppMarkup`, `kvxMock`/`kvInit`, `kvxDays`, `kvxAmpelCards` +
        daraus zusammengesetzte hellflächige Karten (`.feat-demo-card`,
        `.feat-modes`, `.feat-rows`, Upload-/Suche-Mock, `.lab-grade`).
        Init je Schritt-Instanz über `.feat-step__demo`-Scan. `initReveal`
        um einen gedrosselten Scroll-Fallback ergänzt (lange, komplett aus
        `[data-reveal]` gebaute Seiten).
        · **Weiterleitung:** `funktionen.html` → Meta-Refresh +
        `location.replace('feature-chat.html')` (Flaggschiff AI Chat),
        `rel=canonical`, `noindex`. Interne Links: Footer-Spalte „Produkt"
        listet jetzt die 5 Feature-Seiten (aus `FEATURE_LINKS`) statt eines
        „Funktionen"-Links.
        · Im Browser (:4322) geprüft: Panel öffnet/schließt (Hover, Klick,
        Escape+Fokus, Klick-außerhalb), Navigation in jede Feature-Seite,
        `/funktionen.html` leitet auf `/feature-chat.html`, Mobile-Akkordeon,
        alle 5 Seiten bauen (Schritte, Demos, Chat-/kvx-Init), Mobile-
        Stapelung Text→Demo, keine Konsolenfehler.
  - [x] **Frontend auf vier Seiten reduziert (2026-09-08):** Nach Entscheidung
        des Inhabers hat die Website nur noch vier Navigations-Seiten:
        **Home** (`index.html`), **Preise** (`preise.html`), **Über uns**
        (`ueber-uns.html`), **FAQ** (`faq.html`).
        · **Nav/Footer:** `NAV_LINKS` in `marketing.js` = vier flache Links,
        kein „Funktionen"-Mega-Menü mehr; `FEATURE_LINKS` entfernt.
        Footer-Spalte „Produkt" listet jetzt Überblick / So funktioniert’s /
        Preise / FAQ statt der Feature-Seiten; kein `vergleich.html` mehr.
        Das Mega-Menü-/Feature-Seiten-Gerüst (`initMegaMenu`,
        `initSheetAccordion`, `FEATURE_PAGES`, `buildFeaturePage`) bleibt im
        Code, ist aber inert (kein Nav-Eintrag mit `.mega`, keine Seite mit
        `#feature-page`).
        · **Gelöscht:** `funktionen.html`, `feature-chat.html`,
        `feature-klausurvorbereitung.html`, `feature-lernplaene.html`,
        `feature-testklausuren.html`, `feature-lernzettel.html`,
        `vergleich.html`. `marketing/assets/css/feature.css` wird von keiner
        Seite mehr geladen (Datei bleibt vorerst liegen).
        · **Vergleich:** Die `cv2`-Sektion in `index.html` hat `id="vergleich"`
        bekommen; frühere `vergleich.html`-Links in `faq.html` und `preise.html`
        zeigen auf `index.html#vergleich`.
        · **`ueber-uns.html` neu:** persönliche Gründer-Seite (Jannik Born) —
        Story Abitur-Lernsystem 2023 → Studium (mit KI weiterentwickelt) → App
        für die Schwester → Unternehmen; Leitsatz „KI als Helfer, nicht als
        Löser" + vier Grundsätze; Foto `assets/img/ueber-uns/jannik.jpg` mit
        Initialen-Fallback (`onerror`) im Markup. Scoped `<style>` im
        Seitenkopf, nur Fog-Blue-Tokens, kein neuer Akzent.
        · Im Browser (:4322) geprüft: Desktop-Nav + Mobile-Sheet zeigen die vier
        Links, Footer sauber, kein toter Link auf eine gelöschte Seite (alle
        13 verbliebenen HTML-Seiten gefetcht und geprüft), `ueber-uns.html`
        rendert inkl. Reveal + Initialen-Fallback, keine Konsolenfehler.

### Architekturfragen — entschieden am 2026-09-04

- [x] **`Lernplan.chatMap` → A: eigenes JSON-Feld am `Lernplan`** (Override-Muster
      wie im Prototyp, gepflegt über `PATCH /lernplaene/:id` bzw. gebündelt in
      `POST /chats/:id/nachrichten`). Nicht aus Nachrichten-Metadaten rekonstruiert.
      → Phase 2 (Spalte), Phase 4 (Endpunkt).
- [x] **Datei-Status → A: Client-Polling** von `GET /dateien/:id` (kurzer Backoff,
      Stopp bei `bereit`/`fehler` oder ~60 s Timeout). Kein Websocket/SSE.
      → Phase 5 (Server), Phase 11 (Frontend).
- [x] **Suche → A: DB-Substring** (`ILIKE '%q%'`) über **Titel-/Namensfelder**.
      Kein Volltext-Index, kein Suchen in Lernzettel-Inhalt / Datei-Zusammenfassung /
      Nachrichtentext. Später auf Postgres-Volltext hebbar. → Phase 4.
- [x] **Rate-Limiting & Missbrauchsschutz → es gibt beides.** Konkrete Regeln
      stehen jetzt in `backend-planning.md` §7 „Rate-Limiting & Missbrauchsschutz":
    - Request-Rate pro Endpunkt-Klasse (Auth streng, KI-Calls moderat, Lesen locker,
      `/kontakt` sehr streng), Schlüssel User + IP, Überschreitung → `429` +
      `Retry-After`.
    - **Vorab-Filter vor jedem KI-Call** (kein Usage-Verbrauch, jeweils
      **Popup-/Toast-Meldung**): Themen-Guard (nur schulrelevant), Größen-Guard
      (zu große Anfrage/Kontext → gar nicht an die KI), Spam-Guard (Flooding /
      Wiederholungen).
    - Missbrauchs-Signale (viele Guard-Treffer, fehlgeschlagene Logins,
      Upload-Flooding) → Logging + temporäre Sperre.
    - _Default, änderbar:_ Auth-Fehlversuche → IP-Drosselung + Backoff, **kein**
      harter Account-Lockout. `/kontakt` → IP-Limit + Honeypot, **kein Captcha**.
    → Phase 6 (Vorab-Filter), Phase 15 (Rate-Limiting produktiv).
- [x] **DB-Anbieter → Supabase (EU-Region)** für PostgreSQL **und** Objektspeicher.
      Nur als Postgres + Storage genutzt, **nicht** Supabase Auth. → Phase 2 / §0.
- [x] **Row-Level-Security → nein (App-Ebene + FK-Constraints).** Datentrennung
      rein über die `userId`-gescopte Query-Schicht (Auth-Middleware, Phase 3).
      Supabase-RLS scheidet aus, weil es Supabase-Auth voraussetzt. RLS als
      spätere Härtung offen. → Phase 2, `backend-planning.md` §1/§8.
- [x] **ORM/Migrationen → Prisma.** `api/prisma/schema.prisma`, `prisma migrate`.
      → Phase 2 / §0.

- [x] **`ueber-uns.html` neu strukturiert: Hero → Timeline → Stand → CTA,
      10 Design-Varianten je Achse per Dev-Panel (2026-09-12):** Layout auf
      Wunsch von vier Blöcken umgestellt — **Hero(w)** · **Timeline(SCHWARZ)**
      · **Wo Lesify jetzt steht(w, alle 4 Ecken rund)** · **CTA(SCHWARZ)**.
      Der bisherige Werte-Abschnitt „KI als Helfer, nicht als Löser" (4 Karten)
      entfällt; die Werdegang-Story (2023 → Studium → Schwester → Heute) zieht
      vom weißen Gründer-Block in einen eigenen schwarzen Timeline-Abschnitt.
      · **Neue Datei `marketing/assets/css/ueber-uns.css`:** je 10 Layout-
      Varianten für Hero und Timeline (volle eigene Komposition, z. B. Split-
      Foto, Gründer-Zitat, Marquee-Hintergrund, Akkordeon, Zickzack-Linie,
      horizontale Scroll-Karten) und 10 für den Stand-Abschnitt (Kopf mit
      Überschrift/Absatz bleibt fix, nur die Stat-/Status-Darstellung wechselt:
      Fortschrittsbalken, Ampel-Checkliste, Heute/Ziel-Tabelle, Roadmap-
      Schritte, Icon-Kacheln u. a.).
      · **Markup:** `.au-group[data-group="hero|timeline|stand"][data-active="N"]`
      umschließt 10 Kind-Blöcke mit `data-variant="1..10"`; CSS zeigt nur das
      zum `data-active`-Wert passende Kind. Eigenes `<script>` am Seitenende
      (kein Ausbau von `LAB_API`/`mountLabDev`, da die Achsen hier fest 10
      Varianten haben und nichts mit der Landing-Lab-Logik teilen): Dev-Panel
      unten rechts (`.layout-dev.is-about`, wiederverwendet aus
      `landing-lab.css`) mit drei Zeilen „Hero/Timeline/Stand" ×
      1–10-Tasten, Auswahl in `localStorage['lesify:about:hero'|'timeline'|'stand']`,
      Panel per `data-dev-min` einklappbar wie beim Landing-Lab-Panel.
      · Im Browser (temporärer lokaler Server) geprüft: alle 30 Varianten
      schalten korrekt um (genau ein Kind je Achse sichtbar, Rest
      `display:none`), Auswahl übersteht Reload (`localStorage`), Foto lädt
      (`assets/img/jborn-uberuns.jpg`), keine Konsolenfehler.
      · **Nachjustiert (2026-09-12, gleicher Tag):** Stand-Achse entschieden
      → fest auf die 4-Kacheln-Variante (`.au-stand__stats`), Dev-Panel-Zeile
      „Stand" entfernt, die anderen 9 Stand-Layouts aus HTML/CSS gelöscht.
      Timeline-Achse auf die zwei besten Layouts eingedampft (Zickzack
      `.au-tl-1`, große verblasste Jahreszahl `.au-tl-2`; die 8 anderen
      gelöscht) und die Stationsnamen „Studium/Schwester/Heute" durch echte
      Jahre ersetzt (2023 → 2024 → 2025 → 2026, passend zum aktuellen Datum).
      Hero-Achse komplett neu entworfen — alle 10 Varianten binden jetzt
      `assets/img/jborn-uberuns.jpg` ein (Split links/rechts mit
      Akzent-Rahmen, Vollbild-Foto mit Verlauf, großer runder Avatar,
      Editorial-Rahmen mit Passermarken, Polaroid, Sprechblase, Visitenkarte,
      Foto-Collage über der Headline, Foto-Banner mit Namens-Tag). Dev-Panel
      zeigt jetzt nur noch „Hero" (1–10) und „Timeline" (1–2);
      `getVariant()` klemmt gespeicherte Werte über dem neuen Maximum auf 1,
      damit alte `localStorage`-Stände (z. B. `timeline: "7"`) nicht zu
      einer leeren Sektion führen.
      · **Zweite Nachjustierung (2026-09-12, gleicher Tag):**
      **Eck-Passermarken auf allen vier Abschnitten:** neue Komponente
      `.au-frame-mark` (vier `<span>` je Section, `--tl/--tr/--bl/--br`),
      dunkel auf Weiß (Hero/Stand), hell auf Schwarz
      (`.mkt-dark .au-frame-mark`) — auf Screens < 640px ausgeblendet.
      **Timeline final** → nur noch die Variante mit der großen verblassten
      Jahreszahl (`.au-tl__item`/`.au-tl__big`, vorher `.au-tl-2`), Zickzack-
      Variante gelöscht, Dev-Panel-Zeile „Timeline" entfernt (Achse jetzt
      wieder fix). **Hero komplett neu (2. Anlauf, 1. Anlauf gefiel nicht):**
      alle 10 Varianten aus Anlauf 1 gelöscht, 10 grundlegend andere
      Kompositionen statt Foto-Platzierungs-Varianten: diagonaler Split
      (`clip-path`), großes „J" mit Foto als Buchstaben-Maske
      (`background-clip:text`), Zeitungs-Titelseite mit Masthead +
      Foto-Credit, Farbfeld-Split mit dunkel getöntem Foto im Tinten-Panel,
      Magazin-Umfluss (Foto als `shape-outside`-Drop-Bild), Gründer-Memo mit
      Textmarker-`<mark>` + Ausweis-Badge, Scrapbook mit Washi-Tape auf
      Punktraster-Hintergrund, Ticker-Leiste mit pulsierendem „Live"-Avatar,
      Foto-Maske im ersten Headline-Wort (groß + eigene Zeile, sonst
      innerhalb der Buchstaben kaum erkennbar), Interview-Karte mit
      Tonspur-Balken. **Bug gefunden + gefixt:** vier der neuen Varianten
      (v1/v4/v6/v7) hatten `display:grid` direkt auf dem `[data-variant]`-
      Element gesetzt — die generische Sichtbarkeits-Regel
      `.au-group>[data-variant]{display:block}` gewann per Spezifität
      dagegen und warf die Spalten übereinander. Fix: Grid immer auf einen
      inneren `.au-hero-N__grid`-Wrapper, nie auf das `[data-variant]`-
      Element selbst. Im Browser (temporärer lokaler Server) geprüft: alle
      10 Hero-Varianten je genau 1 sichtbares Kind, alle 16 Eck-Marken
      (4 Sections × 4 Ecken) vorhanden, Dev-Panel zeigt nur noch „Hero",
      keine Konsolenfehler.

- [x] **Dritte Nachjustierung `ueber-uns.html` + sauberere URLs +
      404-Seite + Auth-Seiten (2026-09-12, gleicher Tag):**
      · **Eck-Passermarken wieder entfernt** — `.au-frame-mark` war ein
      Alleingang ohne Vorbild auf der Startseite; der einzige tatsächlich
      site-weit genutzte „Rahmen-Effekt" ist der bestehende Rundungs-/
      Zwickel-Übergang (`.mkt-cut`/`.mkt-dark`, gleiche Technik wie
      `index.html`s `.sv-sec[data-*]`), der auf `ueber-uns.html` unverändert
      weiterläuft. Keine Ersatz-Dekoration hinzugefügt.
      · **Hero, 3. Anlauf** — alle 10 Varianten aus Anlauf 2 (Diagonal-Split
      ausgenommen, der gefiel) durch 9 neue ersetzt, diesmal um ein groß
      eingesetztes, randloses Foto statt Layout-Spielereien: Vollbild-Split
      bis zum Viewport-Rand (`position:absolute` verankert an `.au-hero`,
      dem einzigen `position:relative`-Vorfahren, der die volle Section
      statt nur die schmale `.container--narrow`-Spalte umfasst), riesige
      zentrierte Figur mit Headline oben/unten, Split mit überformatierter
      Display-Type, weicher organischer Farbfleck (`border-radius`-Blob)
      hinter dem Foto, enger Zoom-Crop, großes gedrehtes Foto (mit
      reserviertem Textbereich, siehe Bug unten), unten angeschnittenes
      Foto (`overflow:hidden` + `object-position:top`), hoher Bildstreifen
      als Vollhöhen-Backdrop rechts (Text strikt links, kein Überlapp),
      Foto zum Großteil jenseits des Viewport-Rands (von
      `main.overflow-x-hidden` abgeschnitten). **Zwei Bugs beim Testen
      gefunden + gefixt:** (1) das gedrehte Foto lag über der Headline und
      machte sie unleserlich → `padding-right` + schmalere `h1` reserviert;
      (2) der Vollbild-Backdrop lag unter dem Fließtext, Kopf/Kleidung
      der Person verschluckte die Schrift → Backdrop auf eine reine
      rechte Bildspalte (56 %) reduziert, Text bleibt strikt links ohne
      Überlappung.
      · **Timeline** auf die Jahreszahl-Variante fixiert (Zickzack
      gelöscht), Dev-Panel zeigt jetzt nur noch die Achse „Hero".
      · **Saubere URLs site-weit:** alle Marketing-Seiten außer
      `index.html` von `pagename.html` nach `pagename/index.html`
      verschoben (`git mv`) — `/pagename/` löst über die normale
      Verzeichnis-Index-Auflösung auf (GitHub Pages wie lokaler
      `python3 -m http.server`), kein Rewrite/Redirect nötig. Alle
      internen Links (NAV_LINKS/FOOTER + Inline-`href`/`src` in jeder
      Seite + `marketing.js`) auf root-absolute Pfade umgestellt
      (`/kontakt/`, `/#price`, `/assets/css/marketing.css` …) — Assets
      mussten mit, sonst hätten die verschachtelten Seiten `assets/…`
      relativ zur eigenen Unter-URL gesucht. `app/dashboard.html` bleibt
      `.html` (App-Unterseite `/app` ist von dieser Umstellung nicht
      betroffen). **Mitgezogene Folgefixe:**
      `currentBasename()`/`samePageHash()` in `marketing.js` verglichen
      bisher Dateinamen (`location.pathname.split('/').pop()`) — bricht
      bei `/#price`-Ankern seit die Seite unter `/` statt `index.html`
      läuft; jetzt Vergleich über den vollen `location.pathname`.
      `checkout.js`s Stripe-Return-URL baute bisher per
      `location.pathname.replace('checkout.html','checkout-erfolg.html')`
      — jetzt direkt `location.origin + '/checkout-erfolg/'`.
      `app/assets/js/auth-gate.js`s (noch inaktiver, Phase-11-)
      Login-Redirect zeigte ohnehin fälschlich auf `../marketing/login.html`
      → korrigiert auf `/login/`. `app/README.md` Pfad-Erwähnungen
      nachgezogen.
      · **`marketing/404.html`** neu — GitHub Pages serviert das
      automatisch für jeden nicht gefundenen Pfad unterhalb der Domain.
      Eigener Minimal-Nav-Modus (`data-nav="minimal"`, vorher ungenutzt),
      große „404"-Ziffer, kurzer Text, CTA zurück zur Startseite/Kontakt.
      · **Login/Registrieren: größeres Logo** im dunklen Aside-Panel
      (`.auth__aside .brand`) — Marke 30→44 px, Icon 18→26 px, Wortmarke
      1.16→1.55 rem — gilt für alle drei Auth-Seiten (Login, Registrieren,
      Passwort vergessen), da sie dieselbe Komponente teilen.
      · **Registrieren: linke Spalte fixiert, rechte scrollt.** Das
      Formular ist länger als bei Login (Rollen-Wahl + mehr Felder) und
      lief bisher komplett aus dem Viewport. Ab 961 px (darunter blendet
      `.auth__aside` ohnehin aus) `body[data-page="registrieren"] .auth`
      auf `height:100dvh` + `overflow:hidden`, `.auth__aside` `height:100%`
      + `overflow:hidden` (kein Scroll), `.auth__main` `height:100%` +
      `overflow-y:auto` (scrollt für sich); `align-items` dort von
      `center` auf `flex-start`, weil zentrierte Flex-Items bei Overflow
      am oberen Rand sonst nicht erreichbar scrollen.
      · Im Browser (temporärer lokaler Server, `python3 -m http.server`
      simuliert die Verzeichnis-Index-Auflösung 1:1 wie GitHub Pages)
      geprüft: alle 11 Seiten (`/`, `/ueber-uns/`, `/login/`,
      `/registrieren/`, `/kontakt/`, `/agb/`, `/datenschutz/`,
      `/impressum/`, `/checkout/?plan=…`, `/checkout-erfolg/`,
      `/passwort-vergessen/`, `/404.html`) laden ohne Konsolenfehler,
      Nav-/Footer-Links zeigen ausschließlich saubere Pfade, `/#price`
      löst weiterhin als In-Page-Scroll auf (kein Reload), Registrieren-
      Formular scrollt sichtbar unabhängig von der fixierten linken
      Spalte.

- [x] **Vierte Nachjustierung `ueber-uns.html`: Footer-Rundung, Hero auf
      6 Content-Varianten reduziert, neues Freisteller-Foto, App-
      Dashboard-Wasserzeichen (2026-09-12, gleicher Tag):**
      · **Footer-Rundung war nicht „geerbt":** die `.mkt-cut`-Rundung/
      Zwickel-Technik lief auf `ueber-uns.html` zwar schon für die
      Sections, aber der Footer selbst hatte die abgerundete Ecken-Optik
      der Startseite nie bekommen — die Regel in `landing-lab.css` war
      hart auf `body[data-page="index"]` gescoped, obwohl
      `ueber-uns.html` `landing-lab.css` längst mitlädt. Selektor auf
      `body[data-page="index"], body[data-page="ueber-uns"]` erweitert
      (Regel + `::before`-Zwickel) — Footer sitzt jetzt randlos (kein
      `margin-top`) mit runden oberen Ecken direkt an der schwarzen
      CTA-Section, exakt wie auf der Startseite.
      · **Neues Foto `assets/img/jborn-ptrt-nw.png`:** im Gegensatz zum
      bisherigen `jborn-uberuns.jpg` ein echter Freisteller mit Alpha-
      Kanal (1500×1500, transparenter Hintergrund) — dadurch
      `object-fit:contain` statt `cover` möglich, kein Zuschneiden, der
      transparente Rand verschmilzt direkt mit `--bg-canvas`. Alle
      Hero-Vorkommen von `jborn-uberuns.jpg` ersetzt; keine anderen
      Fundstellen im Repo (geprüft per Grep).
      · **Hero radikal eingedampft:** von 10 Layout-Varianten auf 6
      Content-Varianten derselben Basis-Geometrie. Grund: v9 („großer
      Bildstreifen rechts") gefiel im Prinzip, aber zu groß und
      seitenverkehrt. Neue gemeinsame Komponente `.au-hero-portrait`
      (ersetzt alle vorherigen `.au-hero-1…10`-Einzelkompositionen):
      kleines freigestelltes Foto links (`clamp(150px,16vw,210px)`,
      1:1, `position:absolute` an `.au-hero` verankert — bewusst NICHT
      an `.au-hero-portrait` selbst, sonst nur bis zur schmalen
      `.container--narrow`-Spalte statt bis zur vollen Section, plus
      Kollision mit der generischen Sichtbarkeits-Regel), Text rechts
      (`padding-left` reserviert den Bildplatz). v1 minimal (Eyebrow +
      Headline + Absatz) → v2 (+Signatur) → v3 (+Faktenleiste) → v4
      (+Chip-Reihe) → v5 (+Zitat-Zeile +Signatur) → v6 maximal (Chips +
      Zitat + Faktenleiste + Signatur zusammen). Dev-Panel-Achse
      „Hero" jetzt `max:6` statt `max:10`.
      · **App-Dashboard-Wasserzeichen:** existierte technisch schon
      (`renderPageWatermark()` in `app/assets/js/app.js`, mountet
      `#page-watermark` mit `assets/img/lesify-watermark.svg` in
      `.main`), lief aber mit `opacity:0.045` — praktisch unsichtbar,
      daher wirkte es, als fehle es ganz. Dashboard-spezifische
      Verstärkung ergänzt: `body[data-page="dashboard"] .page-watermark`
      auf `340px`/`opacity:0.12` (vorher `250px`/`0.045`), restliche
      Seiten (Fächer/Themen/Klausuren/Dateien/Chat/Suchen/Einstellungen)
      unverändert dezent, da deren Icon-Wasserzeichen bewusst kaum
      wahrnehmbar bleiben sollen.
      · Im Browser (temporärer lokaler Server) geprüft: alle 6 Hero-
      Varianten je genau 1 sichtbares Kind, Foto sitzt nahtlos auf dem
      Seitenhintergrund (kein sichtbarer Bildrand mehr), Footer-Radius
      + Zwickel greifen (`border-top-left-radius:48px`,
      `margin-top:0px` per Computed Style bestätigt), Dashboard-
      Wasserzeichen oben rechts deutlich sichtbar, keine Konsolenfehler
      auf `ueber-uns/`, `index.html` oder `dashboard.html`.
      · **Beide Ergebnisse laut Feedback trotzdem unzureichend
      (2026-09-12, gleicher Tag, direkt danach):** Foto war trotz
      Vergrößerung noch zu klein und stand nicht mehr bodenbündig,
      Wasserzeichen war live auf `lesify.de/app/dashboard` weiterhin
      praktisch unsichtbar. **Nachgebessert:**
      `.au-hero-portrait__photo` von `clamp(150px,16vw,210px)` +
      vertikal zentriert (`top:50%`+`translateY(-50%)`) auf
      `clamp(260px,30vw,400px)` + `bottom:0` (bodenbündig an `.au-hero`)
      umgestellt, `.au-hero-portrait__body`s `padding-left` passend auf
      `clamp(290px,33vw,430px)` nachgezogen, mobiles Foto von 150px auf
      220px. **Dashboard-Wasserzeichen** von `340px`/`opacity:0.12` auf
      `480px`/`opacity:0.28` (mobil-breakpoint 240px→340px) — jetzt
      unübersehbar statt nur „technisch vorhanden". Live auf
      `lesify.de` per direktem Besuch + Pixel-Messung geprüft: Foto-
      Unterkante deckt sich exakt mit `.au-hero`-Unterkante (Differenz
      0 px), Wasserzeichen deutlich sichtbar — beides tatsächlich
      korrekt deployed.

      **Eigentliches Missverständnis geklärt (2026-09-12, gleicher Tag,
      noch später):** Der Nutzer wollte gar keine Verstärkung auf dem
      Dashboard — er wollte das (unveränderte, dezente) Dashboard-
      Wasserzeichen zusätzlich auf `ueber-uns.html` sehen. Deshalb:
      · **Dashboard-Verstärkung komplett zurückgerollt** —
      `body[data-page="dashboard"] .page-watermark`-Override (beide
      Anläufe, 340px/0.12 und 480px/0.28) aus `app/assets/css/style.css`
      entfernt. `.page-watermark` ist wieder exakt der Ursprungszustand
      (250px, -28px, `opacity:0.045`, 190px ab 1180px, ausgeblendet ab
      860px) — auf allen App-Seiten inkl. Dashboard wieder einheitlich
      dezent.
      · **Dieselbe Komponente 1:1 auf `ueber-uns.html` ergänzt:**
      `assets/img/lesify-watermark.svg` nach `marketing/assets/img/`
      kopiert, neue Klasse `.au-watermark` in `ueber-uns.css` mit exakt
      denselben Maßen/Opacity/Breakpoints wie `.page-watermark`
      (250px/-28px/`opacity:0.045`, 190px ab 1180px, ausgeblendet ab
      860px, `z-index:-1`). `.au-hero` bekommt zusätzlich `z-index:0`
      (analog zu `.main`/`.main-inner` im Dashboard), damit der negative
      z-index einen sauberen lokalen Stacking-Context hat statt hinter
      den Seitenhintergrund zu rutschen. Markup: `<div class="au-watermark"
      aria-hidden="true"><img src="/assets/img/lesify-watermark.svg"></div>`
      als erstes Kind der Hero-Section, vor `.container`.
      · Im Browser (lokale Server für marketing/ + app/ parallel)
      geprüft: Dashboard zeigt wieder exakt `250px`/`0.045`/`-28px`
      (Computed Style bestätigt), `ueber-uns.html` zeigt dieselben
      Werte (Breite 190px statt 250px nur weil die Testbreite unter dem
      1180px-Breakpoint lag — dieselbe Logik wie im Dashboard), keine
      Konsolenfehler auf beiden Seiten.

- [x] **Fünfte Nachjustierung `ueber-uns.html`-Hero: Wasserzeichen-
      Position, breitere Textspalte, größeres Foto (2026-09-12, später
      am selben Tag):** Drei Feinschliffe auf Basis von Feedback.
      · **Wasserzeichen saß hinter/über dem Header und lief rechts aus
      dem Viewport:** `.au-watermark` hatte `top:-28px;right:-28px` 1:1
      vom Dashboard übernommen — dort sitzt es in einer Karte mit
      eigenem `overflow:hidden`-Rahmen, auf `ueber-uns.html` dagegen
      direkt in der vollen, randlosen `.au-hero`-Section, wo der
      negative `right`-Wert es über den echten Viewport-Rand hinaus
      schiebt und `main.overflow-x-hidden` es abschneidet. Jetzt
      `top:115px;right:20px` — sitzt sauber unterhalb der schwebenden
      Nav-Pille (geprüft: `wmRect.top` > `nav.getBoundingClientRect().bottom`)
      und vollständig innerhalb des Viewports (`wmRect.right` <
      `innerWidth`).
      · **Breitere Textspalte:** `.au-hero-portrait__body` von
      `max-width:680px` auf `820px`, `h1` von `15ch` auf `20ch`, `p` von
      `46ch` auf `56ch`. Zusätzlich bekommt nur der Hero-Abschnitt einen
      breiteren Container: `.au-hero .container--narrow { max-width:
      1080px }` (Timeline/Stand bleiben bei 860px) — sonst hätte die
      breitere Body/H1-Vorgabe nichts gebracht, weil der Elternrahmen
      der Flaschenhals war.
      · **Größeres Foto:** `.au-hero-portrait__photo` von
      `clamp(260px,30vw,400px)` auf `clamp(320px,36vw,480px)`,
      `__body`s `padding-left` passend von `clamp(290px,33vw,430px)`
      auf `clamp(350px,39vw,510px)` nachgezogen, mobiles Foto von
      220px auf 260px.
      · **Diesmal mit echtem visuellem Check statt nur Computed-Style-
      Vergleich:** erster Versuch zeigte in Screenshots einen
      scheinbaren Overlap mit der schwarzen Timeline-Section — Ursache
      war kein Layout-Bug, sondern ein veralteter Screenshot-Frame,
      weil der Browser-Pane-Tab nicht im Vordergrund war (bekanntes
      Verhalten dieser Session: `computer screenshot` liefert im
      Hintergrund-Zustand einen stehenden alten Frame). Nach
      `tabs_select` (Tab in den Vordergrund) und Kontrolle von
      `window.scrollY` (war 0, nicht wie im stehenden Frame vermeintlich
      verschoben) zeigte der Screenshot den korrekten Zustand: Foto
      größer, Text breiter, Wasserzeichen sauber unter dem Header,
      keine Überlappung. Zusätzlich bei 1000px, 1280px und mobil
      (375px) geprüft — Wasserzeichen bleibt wie im Dashboard unter
      860px ausgeblendet.

- [x] **Sechste Nachjustierung `ueber-uns.html`-Hero: v2 (mit Signatur)
      wird neue Baseline, 9 systematische Bildgröße×Textbreite-
      Varianten (2026-09-12, gleicher Tag):** Feedback: Wasserzeichen
      gut, Foto/Text dürfen aber noch größer/breiter — außerdem sollte
      die bisherige v2 (Eyebrow+Headline+Absatz+Signatur) die neue v1
      werden und alle anderen Content-Varianten (Fakten/Chips/Zitat)
      entfallen, dafür 9 neue Varianten, die nur Bildgröße × Textbreite
      durchspielen.
      · **Inhalt vereinheitlicht:** alle 10 Varianten zeigen jetzt
      denselben Inhalt (bisherige v2). Statt 10 unterschiedlicher
      Composings gibt es jetzt zwei Stufen-Achsen als zusätzliche
      Klassen auf demselben `[data-variant]`-Element: `.au-img-1..4`
      (Fotobreite + passend reservierter `padding-left`) und
      `.au-txt-1..4` (Body-/Headline-/Absatzbreite). v1 = `au-img-1
      au-txt-1` (bisherige Baseline-Größe), v2–v10 kreuzen die drei
      größeren Stufen jeder Achse (img2/3/4 × txt2/3/4 = 9 Kombinationen).
      · **Reiner Größen-Bug beim ersten Durchlauf gefunden + gefixt:**
      `padding-left` skaliert nur mit der Bild-Stufe, `max-width` des
      Textblocks nur mit der Text-Stufe — bei den ursprünglichen
      Zahlen ergab das bei großen Bild- + kleineren Text-Stufen (z. B.
      img-4 + txt-2) eine Textspalte von nur ~190px (per
      `getBoundingClientRect` gemessen, nicht nur geschätzt). Die
      Textbreiten-Stufen 2–4 daraufhin kräftig angehoben (920→1150,
      1020→1250, 1120→1350px plus größere ch-Werte), Container auf
      1450px verbreitert. Nachmessung: schlechtester Fall (v8, img-4+
      txt-2) jetzt ~420px Textspalte statt ~190px.
      · **Zweiter Bug: `min-height` war bislang eine einzige, geteilte
      Regel** (`clamp(360px,44vw,620px)`), unabhängig von der
      Bild-Stufe — bei img-4 (Foto bis 720px hoch, bodenbündig) hätte
      das Foto oben über die Section hinausgeragt. Jetzt
      `.au-hero-portrait.au-img-1..4` (compound-Selektor, da beide
      Klassen auf demselben Element sitzen — nicht verschachtelt)
      setzt je eine zur Fotohöhe passende `min-height`
      (560px…800px). Mobile-Override entsprechend nachgezogen
      (`.au-hero-portrait.au-img-N { min-height:0 }` in der
      720px-Media-Query, sonst hätten dort dieselben vw-Werte per
      Spezifität gewonnen).
      · Dev-Panel/`.au-group`-Sichtbarkeitsregel wieder auf `max:10`
      erweitert. Im Browser (lokaler Server, Tab bewusst in den
      Vordergrund geholt vor jedem Screenshot) geprüft: alle 10
      Varianten je 1 sichtbares Kind, keine Überlappung von Foto und
      Section-Rand (`photoTop - sectionTop` durchweg negativ, kein
      Bild-Überstand nach oben), Headline-Breite bei allen 10
      Kombinationen zwischen ~320px (v1) und ~610px (breiteste
      Kombination), mobil (375px) einheitlich und unverändert über
      alle Varianten, keine Konsolenfehler.

---

## Phase 1 — Stack-Entscheidung & Projekt-Setup

- [x] **Backend-Stack wählen** — _2026-09-04: entschieden & in `backend-planning.md`
      §0 „Stack" dokumentiert. TypeScript-Monorepo (pnpm-Workspaces), PostgreSQL +
      Objektspeicher über Supabase (EU-Region), Auth selbst gebaut, Stripe, E-Mail
      zurückgestellt. Umsetzungs-Ebene (Fastify/Prisma/Vitest/GitHub Actions) als
      revidierbarer Vorschlag._ Kriterien, nach denen entschieden wurde:
  - Sprache: TypeScript end-to-end senkt Reibung (Frontend ist bereits JS, `data.js`-Signaturen lassen sich 1:1 als Client nachbauen).
  - Datenbank: relational (Postgres) — das Datenmodell in §1 ist stark relational (FKs, Enums, Arrays).
  - Hosting: managed vs. self-hosted; EU-Region wegen DSGVO/Minderjährigendaten **Pflicht**.
  - Objektspeicher: S3-kompatibel mit signierten URLs (AWS S3, Cloudflare R2, Scaleway, Supabase Storage).
  - Auth: selbst bauen vs. Bibliothek/BaaS — muss Rollen (`schueler`/`elternteil`) und `parentUserId`-Scoping abbilden.
  - Zahlungen: **Stripe** (Phase 0 — Trial → Subscription, Proration, Familien-Sitze).
  - E-Mail: **zurückgestellt.** Zahlungs-/Abo-/Beleg-Mails laufen über Stripe; ob
    und wie Double-Opt-in-/Reset-Mails versendet werden, wird später entschieden
    (Token-Flow wird aber jetzt schon gebaut).
  - Ein Repo oder getrennt: Monorepo (Marketing + App + API) hält Design-Tokens und Typen synchron.
  - _Pragmatische Default-Empfehlung, falls nichts dagegen spricht: TypeScript-Monorepo, Postgres (managed, EU), S3-kompatibler Objektspeicher, Stripe, ein EU-Hoster mit Staging + Prod._
- [x] **Repo initialisieren:** — _2026-09-04: `git init` (war vorher kein Repo).
      Monorepo-Umbau: `frontend/` → `marketing/`, Root-`*.html` + `assets/` +
      `lesifylog.png` → `app/`, neu `api/` (Fastify-Stub `api/src/index.ts` mit
      `/health`) + `shared/` (leerer `@lesify/shared`-Platzhalter, echte Formeln
      erst Phase 7). `.gitignore`, `README.md`, `LICENSE` (proprietär),
      `app/README.md`, `marketing/README.md` angelegt. Pfad-Referenzen in
      `CLAUDE.md` und `backend-planning.md` (`frontend/`→`marketing/`,
      `assets/`→`app/assets/`) nachgezogen. Noch offen: erster Commit._
- [x] **Tooling:** — _2026-09-04: `pnpm`-Workspace (`pnpm-workspace.yaml`),
      `package.json` (Scripts `dev`/`lint`/`format`/`typecheck`/`test`),
      `tsconfig.base.json` + je `tsconfig.json` in `api/`/`shared/`,
      ESLint 9 Flat-Config (`eslint.config.js`), Prettier
      (`.prettierrc.json`/`.prettierignore`), `.editorconfig`, `.nvmrc`,
      Pre-Commit-Hook via `simple-git-hooks` + `lint-staged`. Aktiv nach dem
      ersten `pnpm install` (Lockfile + `node_modules` stehen dann)._
- [x] **Umgebungen definieren:** — _2026-09-04: `local`/`staging`/`production`
      in `backend-planning.md` §0 + `README.md` beschrieben (je eigene DB,
      eigener Supabase-Bucket, eigene Secrets). `.env.example` im Root committet
      (alle Variablennamen, ohne Werte)._
- [x] **Secret-Management:** — _2026-09-04: Secret-Liste in `backend-planning.md`
      §0 + `.env.example` (`ANTHROPIC_API_KEY`, `DATABASE_URL`, `SUPABASE_URL`,
      `SUPABASE_SERVICE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
      `SESSION_SECRET`). `.env`/`​.env.*` in `.gitignore`, nur `.env.example`
      ausgenommen. Konkreter Secret-Store pro Umgebung wird mit dem Hoster in
      Phase 16 festgelegt._
- [x] **CI-Pipeline (Grundgerüst):** — _2026-09-04: `.github/workflows/ci.yml`
      (GitHub Actions) — bei jedem Push/PR: `pnpm install --frozen-lockfile` →
      `format:check` → `lint` → `typecheck` → `test`. Läuft grün, sobald das
      Lockfile committet ist. Deploy kommt Phase 16._
- [x] **Lokales Dev-Setup dokumentieren:** — _2026-09-04: `pnpm dev`
      (`scripts/dev.mjs`) startet parallel API (:3000), App (:4001),
      Marketing (:4002). Dokumentiert in `README.md`. Eine echte lokale DB
      hängt an der Supabase-Einrichtung (Phase 2)._

---

## Phase 2 — Datenmodell & Datenbank

Grundlage: `backend-planning.md` §1. Reihenfolge so, dass FKs immer schon existieren.

- [x] **Migrations-Werkzeug einrichten** — _2026-09-04: Prisma (`api/prisma/`),
      Scripts `db:migrate`/`db:deploy`/`db:seed`/`db:studio`/`db:reset` in
      `api/package.json`. Migrations-Ordner wird beim ersten `db:migrate`
      angelegt und committet; `db:deploy` läuft später in CI/Deploy (Phase 16).
      Prisma-Migrationen sind vorwärtsgerichtet („down" bei Bedarf als eigene
      Migration)._
- [x] **Enums anlegen** — _2026-09-04: alle 12 als Prisma-Enums in
      `schema.prisma` (`Rolle`, `AboPaket`, `AboArt`, `AboIntervall`,
      `AboStatus`, `DateiTyp`, `DateiStatus`, `NachrichtRolle` (= auch
      `LernzettelRevision.rolle`), `ChatModus` (nullable), `TestklausurStatus`,
      `Ampel`, `KiTonfall`)._
- [x] **Kern-Tabellen** — _2026-09-04: alle 17 Modelle in `schema.prisma`,
      Feldnamen/-typen/`nullable` nach §1. Kein `Thema.mastery`, kein
      `Klausur.note`. `Lernplan.chatMap`/`checklist` als `Json`-Spalten.
      Migration `20260904083856_init` gegen Supabase (eu-west-1) angewandt,
      `api/prisma/migrations/` committet._
- [x] **`parentUserId`-Scoping** — _2026-09-04: `userId` auf **allen**
      nutzergebundenen Tabellen denormalisiert (nicht nur Fach/Einstellungen/
      Usage), plus `User.parentUserId` (self-FK) für Kind-Profile. Datentrennung
      über die `userId`-gescopte Query-Schicht (Auth-Middleware, Phase 3) +
      FK-Constraints. **Kein DB-RLS** (Entscheidung 2026-09-04: Supabase-RLS
      braucht Supabase-Auth, die wir nicht nutzen) — als spätere Härtung offen._
- [x] **Indizes** — _2026-09-04: `@@index` auf allen FK-Spalten,
      `Chat.aktualisiertAm`, `Datei.status`, `Klausur.datum`;
      `@@unique([userId, monat])` auf `Usage`._
- [x] **Seed-Skript** — _2026-09-04: `api/prisma/seed.ts` gegen Supabase
      gelaufen — Demo-User + Einstellungen + Abo + Usage, alle 5 Fächer /
      15 Themen, 6 Chats (+14 Nachrichten), 5 Lernzettel (+4 Revisionen),
      6 Dateien, 11 Klausuren, Testklausuren (+Aufgaben/Ergebnis/
      Vorbereitungsstand) und Lernpläne — Rest kam mit `2ba8c35` (Phase 7).
      Checkbox war stehen geblieben, obwohl der Code seit Phase 7 vollständig
      ist — 2026-09-12 beim Doku-Abgleich aufgefallen und nachgezogen._
- [x] **Dev-Account mit Screenshot-Content befüllen** — _2026-09-18:
      `api/prisma/seed-dev-account.ts` (idempotent, nur `dev@lesify.de`,
      Login bleibt) leert den Account und legt realistischen Beispiel-Content
      an: „Lena M.", Premium-Abo, 5 Fächer / 15 Themen, 9 Chats (36
      Nachrichten), 5 Lernzettel, 9 Dateien (`seed://`, ohne Storage-Inhalt),
      6 Klausuren (1 geschrieben), 4 Testklausuren, 3 Lernpläne in
      verschiedenen Zuständen (fertig / Tag 4 / Tag 2). Aufruf:
      `pnpm --filter ./api exec tsx prisma/seed-dev-account.ts`. Für Ads/
      Website-Screenshots; Datums-Offsets relativ zu „heute" → bei Bedarf
      neu laufen lassen._
- [x] **backend-planning.md aktualisieren** — _2026-09-04: §1 um „Umsetzung:
      Prisma-Schema" ergänzt (userId-Denormalisierung, `email` nullable+unique,
      1:1-`unique` auf Lernplan-Testklausur-FKs, Enum-Namen, Löschverhalten,
      RLS-Entscheidung). §0 „Umsetzungs-Ebene" auf „Prisma in Benutzung"
      aktualisiert._

---

## Phase 3 — Auth

Beliefert `marketing/login.html`, `registrieren.html`, `passwort-vergessen.html`.
Endpunkte: `backend-planning.md` §4 „Auth", Regeln §5.

- [x] **Passwort-Hashing** — _2026-09-04: argon2id via `@node-rs/argon2` (prebuilt,
      kein Build-Step), `m=19456,t=2,p=1`. `api/src/lib/password.ts`, Unit-Tests._
- [x] **`POST /auth/registrieren`** — _2026-09-04: `{rolle,name,klassenstufe,email,
      passwort}` → `User` + leerer `Einstellungen`-Satz, `trialEndetAm = +14 Tage`,
      kein `Abo`. `VerificationToken` (email_bestaetigung, 7 Tage). Doppelte
      E-Mail → 409. Dev gibt den Token in der Antwort zurück (kein Mailversand)._
- [x] **`POST /auth/email-bestaetigen`** — _2026-09-04: `{token}` → `emailVerifiedAt`,
      Einmal-Token (`eingeloestAm`), abgelaufen/verbraucht → 400._
- [x] **`POST /auth/login`** — _2026-09-04: `{email,passwort,angemeldetBleiben?}` →
      opaker Bearer-Token, DB-`Session` (7 bzw. 90 Tage). Timing-Angleich gegen
      Dummy-Hash bei unbekannter E-Mail. Falsch → 401._
- [x] **`POST /auth/logout`** — _2026-09-04: löscht die `Session`-Zeile zum
      Bearer-Token (idempotent, immer 200)._
- [x] **`POST /auth/passwort-vergessen`** — _2026-09-04: immer 200, entwertet
      offene Reset-Token, legt neuen an (1 Tag); Dev gibt `resetToken` zurück._
- [x] **`POST /auth/passwort-zuruecksetzen`** — _2026-09-04: `{token,neuesPasswort}`,
      Token einmalig + befristet, setzt Passwort **und löscht alle Sessions**._
- [x] **Schul-SSO gestrichen** — _kein `/auth/sso/*`; `marketing/login.html` hat
      keinen SSO-Block mehr (schon Phase 0)._
- [x] **Auth-Middleware** — _2026-09-04: `app.requireAuth` (preHandler) prüft den
      Bearer-Token gegen `Session`, setzt `request.userId`. `GET /auth/me` nutzt
      sie bereits; ab Phase 4 hängt sie an allen Ressourcen-Endpunkten.
      Eltern-Aggregat-Sicht: Phase 12._
- [x] **E-Mail-Verifikation + Trial testen** — _2026-09-04: `api/src/routes/auth.test.ts`
      fährt den kompletten Flow gegen die echte Supabase-DB (registrieren →
      login → /me → bestätigen (2×) → vergessen → zurücksetzen → logout),
      23 Tests grün. DB-Tests via `describe.runIf(DATABASE_URL)` — in CI
      übersprungen, bis dort eine Test-DB steht (Phase 14/16)._
- [x] **backend-planning.md §1/§5** — _2026-09-04: §1 „Auth-Tabellen" (Session,
      VerificationToken) ergänzt, §5 „Umsetzung" mit Hashing/Session-/Token-/
      Timing-Details, §4 um `GET /auth/me`. Eltern-Kind-Mechanik bleibt
      zurückgestellt (nur `rolle` gespeichert)._

---

## Phase 4 — Kern-API ohne KI

Alles aus `backend-planning.md` §4 außer den KI-Workflows. Ziel: die App läuft
echt mit Multi-User, KI-Antworten noch als deterministischer Platzhalter.

> _2026-09-04: umgesetzt in 3 Commits — 4a `d676fb0` (CRUD), 4b/4c `6540aa7`
> (Chats + Klausuren/Lernplan/Testklausur-Skelett). Alle Endpunkte
> `userId`-gescoped, `requireAuth` als Plugin-preHandler. Tests: 401-ohne-Token
> + volle Flows gegen Supabase (`runIf DATABASE_URL`), 55 grün._

- [x] **Fächer** — _`GET/POST /faecher`, `PATCH /faecher/:id` (nur `farbe`,
      Default reihum aus `FACH_COLOR_KEYS`), `GET /faecher/:id/themen`. `icon`
      nur bei Erstellung, geprüft gegen `FACH_PRESETS`._
- [x] **Themen** — _`GET /themen` (Aggregat mit Fachname/Farbe), `POST /themen`,
      `GET /themen/:id` inkl. echter Zählwerte + Kurzlisten (5 je Typ)._
- [x] **Chats** — _`GET /chats(?fachId=)`, `POST /chats` (leere Zeile; Client
      ruft erst beim ersten Senden), `GET /chats/:id` inkl. Nachrichten,
      `POST /chats/:id/nachrichten` (User-Nachricht + deterministische
      Platzhalter-KI-Antwort, Titel-Kürzung beim 1. Mal, `nachrichtenUsed++`,
      `chatMap` bei `lernplanKontext` idempotent)._
- [x] **Lernzettel (CRUD-Teil)** — _`GET /lernzettel/:id` (Content + Revisionen
      + `freeMessagesUsed`). Erstell-/Revisions-KI: Phase 6._
- [x] **Dateien (Metadaten-Teil)** — _`GET /dateien(?themaId=)`,
      `GET /dateien/:id`. Upload/`/inhalt`: Phase 5._
- [x] **Klausuren + Lernplan** — _`POST /klausuren` legt in **einer** Transaktion
      `Klausur` + Testklausur 1 (+ Platzhalter-Aufgaben) + `Lernplan` an.
      `GET /klausuren(/:id)`. Kein `PATCH /klausuren/:id`. „Geschrieben" bleibt
      client-seitig aus `datum`._
- [x] **Lernplan-Endpunkte** — _`GET /lernplaene/:id` + `/klausuren/:id/lernplan`
      liefern den **Rohzustand** (berechneter Zustand = Phase 7),
      `PATCH /lernplaene/:id/checklist` (`{tag,key,checked}` → `checklist`-JSON;
      `{tag,checked}` → `tageErledigt`-Legacy bis Phase 7),
      `PATCH /lernplaene/:id` (`chatMap`-Eintrag),
      `GET /lernplaene/:id/lernzettel/dokument` (Markdown).
      `testklausur2` / `.../lernzettel`: Phase 6._
- [x] **Testklausuren (Skelett)** — _`GET /testklausuren/:id` (+`/dokument`),
      `POST /testklausuren/:id/loesung` (JSON-Skelett `{geloesteDateiId}` →
      Status `geloest`; multipart = Phase 5). `POST /testklausuren` + `/analyse`
      + 3.-Aufruf-Riegel: Phase 6._
- [x] **Usage** — _`GET /usage` → vier `{used,limit}` + `resetDatum` + `planName`
      + `paket`. Zähl-/Reset-/Durchsetzungs-Logik: Phase 8. Zähler wird bereits
      hochgezählt (`lib/usage.ts`, Upsert)._
- [x] **Profil & Einstellungen** — _`GET/PATCH /user`, `GET/PATCH
      /user/einstellungen` (Teilupdate, `upsert`, jeder Toggle einzeln)._
- [x] **Suche** — _`GET /suche?q=` über Fach-/Themen-Name + Chat-/Lernzettel-/
      Klausur-/Testklausur-Titel + Datei-Name via `contains`+`mode:'insensitive'`,
      Antwortform `[{type,label,icon,items:[{title,sub,href,fachId,fachName}]}]`._
- [x] **Kontakt** — _`POST /kontakt` (kein Login), Honeypot-Feld `website` +
      In-Memory-IP-Limit; Ziel (Support-Postfach/Ticket) noch offen → nur
      strukturiertes Logging (`TODO` im Code + §8)._
- [x] **Alle Endpunkte gegen `backend-planning.md` §4 abgleichen** — _§4
      angemerkt: `GET /auth/me` neu; `POST /chats` legt eine leere Zeile an
      (Lazy-Verhalten Client-seitig); Lösung-Upload-Skelett nimmt JSON statt
      multipart bis Phase 5; berechneter Lernplan-Zustand explizit Phase 7._

---

## Phase 5 — Datei-Speicherung & async Verarbeitung

`backend-planning.md` §6.

> _2026-09-05: komplett umgesetzt. `api/src/lib/storage.ts`
> (`SupabaseStorageGateway` + `FakeStorageGateway`, wie die anderen
> Fake-Adapter), `api/src/lib/dateiExtraktion.ts` (pdf-parse/mammoth),
> `api/src/lib/dateiVerarbeitung.ts` (Call-01-Orchestrierung + Testklausur-
> Lösungs-Extraktion), `api/src/lib/upload.ts` (Größenlimit-Fehlerbehandlung).
> `KiClient` um Bild-Input (Vision) erweitert (`client.ts`, `calls.ts`).
> Tests: `storage.test.ts` (5), `dateiExtraktion.test.ts` (6, echte PDF/DOCX
> via `pdfkit`/`docx`), `dateien.test.ts` (7), `testklausuren-upload.test.ts`
> (1) — gesamt api jetzt 149 Tests. Storage-Layer zusätzlich live gegen das
> echte Supabase-Projekt verifiziert (Bucket-Anlage, Upload, signierte URL,
> Lesen, Löschen)._
- [x] **Objektspeicher-Bucket je Umgebung** (EU-Region), Zugriff nur über
      **zeitlich begrenzte signierte URLs**, nie öffentliche Links. —
      _`SupabaseStorageGateway` legt den konfigurierten Bucket
      (`SUPABASE_STORAGE_BUCKET`) beim ersten Zugriff automatisch an, falls er
      fehlt — kein manueller Dashboard-Schritt nötig. Für `local` bereits live
      verifiziert (`lesify-local`, `public: false`); `staging`/`production`
      bekommen beim ersten echten Request denselben automatischen Bootstrap._
- [x] **`POST /themen/:id/dateien`:** multipart, **5-MB-Limit serverseitig hart
      validiert** (zusätzlich zum Client), MIME → `typ` (`pdf`/`doc`/`img`),
      Objekt-Key in `Datei.speicherPfad`, Status `verarbeitung`. — _`typAusMime()`
      lehnt HEIC und alles außer pdf/docx/png/jpeg/webp ab
      (`dateityp_nicht_unterstuetzt`); Größenlimit übersetzt den
      `@fastify/multipart`-Fehler in `413 datei_zu_gross`._
- [x] **Verarbeitungs-Queue/Job:** Datei → KI-Zusammenfassung (Phase 6, Prompt 01)
      → Status `bereit`; bei Fehler Status `fehler`. — _kein externer
      Queue-Dienst: fire-and-forget direkt nach der Upload-Antwort
      (`themenDateiVerarbeiten`), „nichts optimieren, bevor es weh tut"._
- [x] **Status-Abfrage durch den Client:** **Polling** von `GET /dateien/:id`
      (kurzer Backoff, Stopp bei `bereit`/`fehler` oder ~60 s Timeout) — kein
      Websocket/SSE (Entscheidung 2026-09-04). — _Client-Seite (`pollDateiStatus`)
      stand schon aus Phase 11-Vorarbeit, Server liefert jetzt echte
      Statuswechsel._
- [x] **`GET /dateien/:id/inhalt`:** signierte URL / Stream der Originaldatei
      (PDF inline, Bild-Vorschau, Download-Button). Ersetzt die simulierte
      Vorschau des Prototyps. — _302-Redirect auf eine 60 s gültige signierte
      URL; eigener Plugin-Scope ohne `requireAuth`-Hook, weil die URL direkt in
      `<a href>`/`<img src>` verwendet wird (Auth via Header **oder**
      `?token=`, `api.js` → `dateiInhaltUrl()` angepasst)._
- [x] **Testklausur-Lösungs-Uploads** laufen über denselben Mechanismus, landen
      aber **nicht** in der Themen-Dateiliste und zählen **nicht** gegen das
      Content-Aufnahmen-Limit (Phase-0-Entscheidung). — _neues Feld
      `Datei.zweck` (`thema`/`testklausurLoesung`); `POST
      /testklausuren/:id/loesung` erkennt multipart zusätzlich zum
      JSON-Bridge-Pfad, extrahiert synchron (Bild-Uploads über eine eigene
      Vision-Transkription statt Zusammenfassung)._
- [x] **backend-planning.md §6/§8** auf den umgesetzten Stand gebracht. —
      _§1 (`Datei.mime`/`Datei.zweck`), §4 (Endpunkt-Details), §6 (ganzer
      Umsetzungsabschnitt), §8/Phase-10-Notiz (Objektspeicher-Cleanup im
      Aufbewahrungs-Job **und** in `POST /user/loeschen`) nachgezogen._

---

## Phase 6 — KI-Integration (Claude API)

Prompt-Entwürfe: `Konzept-texts/prompts/01`–`12` + `00-overview.md`.
Preise/Modellwahl-Prinzipien: `00-overview.md` §7.

> _2026-09-04: Elf der zwölf Calls (alle außer 01) end-to-end verdrahtet und
> gegen einen deterministischen `FakeKiClient` getestet (ohne
> `ANTHROPIC_API_KEY` läuft kein echter Call — wie `FakeZahlungsGateway`,
> Phase 9). Tests: `api/src/lib/ki/*.test.ts` (26) + `api/src/routes/ki.test.ts`
> (13, DB-gated). Details siehe `backend-planning.md` §3 „Umsetzung Phase 6"._
>
> _2026-09-05: Dev-only-Alternative zum Testen ohne `ANTHROPIC_API_KEY`
> ergänzt — `ClaudeAgentSdkKiClient` über die persönliche Claude-Subscription
> (`claude setup-token` → `CLAUDE_CODE_OAUTH_TOKEN`), aktiv nur bei
> `NODE_ENV=development` + `KI_DEV_ADAPTER=claude-agent-sdk`. Verifiziert
> gegen echte Lesify-Calls, ~0,3–0,5 Cent/Call — Details + der Befund zu
> `claude -p` (CLI-Modus lädt immer das teure Tool-Preset) in
> `backend-planning.md` §3._
>
> _2026-09-05: Call 01 (Datei-Zusammenfassung) mit Phase 5 nachgezogen — jetzt
> alle zwölf Calls end-to-end verdrahtet. `KiClient` zusätzlich um Bild-Input
> (Vision) erweitert, für Bild-Uploads (Call 01) und die Testklausur-
> Lösungs-Transkription._

- [x] **Anthropic-Client kapseln** — _`api/src/lib/ki/client.ts`:
      `AnthropicKiClient` (`@anthropic-ai/sdk`, Retry+Timeout aus den
      SDK-Client-Optionen) + `FakeKiClient` (Fallback ohne Key). Beide
      loggen `response.usage` strukturiert. Modellwahl als Config
      (`env.KI_MODELL_GUENSTIG`/`KI_MODELL_STANDARD`, je Call-Klasse
      zugeordnet in `calls.ts`, nicht fest verdrahtet)._
- [x] **KI-Vorab-Filter** — _`api/src/lib/ki/guard.ts`: Themen-Guard
      (Regelwerk-Variante), Größen-Guard (`KI_ANFRAGE_MAX_ZEICHEN`,
      Default 6000 Zeichen), Spam-Guard (In-Memory-Fenster pro User). Laufen
      vor `POST /chats/:id/nachrichten` + `POST /lernzettel/:id/revisionen`,
      kein Usage-Verbrauch bei Treffer. Trefferquoten-Logging/-Kalibrierung
      noch offen (Phase 15/17)._
- [x] **Prompt-Templates 01–12 als Code-Vorlagen** — _`api/src/lib/ki/calls.ts`,
      feste JSON-Schemas für alle DB-schreibenden Calls, Freitext nur für die
      Chat-Antworten (03–06/frei) und `antwortText` der Revision (09)._
- [x] **Notenableitung strikt deterministisch** — _unverändert aus Phase 7:
      Call 11 gibt nur `prozent`, `note`/`ampel` rechnet `prozentZuNote`/
      `noteAmpel` im Backend._
- [x] **Prompt Caching** — _`cache: true` auf den Chat-Calls (03–06/frei),
      `cache_control` ans Ende des kompletten System-Prompts._
- [x] **Call 01 — Datei-Zusammenfassung** — _2026-09-05 (Phase 5): verdrahtet an
      `POST /themen/:id/dateien` (`themenDateiVerarbeiten()`), inkl.
      Bild-Uploads über Vision (`KiClient.bilder`, neu in `client.ts`)._
- [x] **Call 02 — Themen Memory** — _`themenMemoryBlock()` in
      `api/src/lib/ki/kontext.ts`, Grundfall = Konkatenation, keine
      Verdichtung (kommt erst bei echtem Bedarf, Phase 17)._
- [x] **Calls 03–06 + frei — Chat-Antworten** — _`chatAntwortErzeugen()` in
      `POST /chats/:id/nachrichten`, modusabhängiger System-Prompt inkl.
      neutralem „freie Frage"-Fall. **Streaming steht noch aus** — Antwort
      kommt komplett zurück, nicht token-weise (Nachholbedarf, kein Blocker)._
- [x] **Call 07 — Chat-Titel** — _`chatTitelErzeugen()`, an den ersten
      `POST /chats/:id/nachrichten` angehängt; schlägt der Call fehl, Fallback
      auf eine einfache Kürzung statt den Chat zu blockieren._
- [x] **Call 08 — Lernzettel-Erstellung** — _`POST /themen/:id/lernzettel`,
      Usage `lernzettel` (Limit-Check vor, Zählung nach dem Call)._
- [x] **Call 09 — Lernzettel-Revision** — _`POST /lernzettel/:id/revisionen`
      (neuer Endpunkt), `wendePatchesAn()` wendet Such-/Ersetzen-Paare an
      (Fehler → Fallback-Antwort statt Absturz), erste 10 gratis
      (`revisionZaehltGegenLimit`, Phase 8), danach `nachrichten`-Limit._
- [x] **Call 10 — Testklausur-Erstellung** — _`testklausurErstellen()` in
      `api/src/lib/testklausur.ts`, gemeinsam genutzt von `POST /klausuren`
      (Testklausur 1) und `POST /testklausuren` (direkt bzw. Testklausur 2
      über `POST /lernplaene/:id/testklausur2`). 3.-Aufruf-Riegel je
      `klausurId` dort umgesetzt (`409 testklausur_limit_erreicht`)._
- [x] **Call 11 — Testklausur-Analyse** — _`POST /testklausuren/:id/analyse`,
      braucht `status=geloest` + `Testklausur.loesungsText` (neue Spalte,
      Bridge bis Phase 5 — s. u.). Schreibt `TestklausurErgebnis` +
      `Vorbereitungsstand` in einer DB-Transaktion, Status → `analysiert`._
- [x] **Call 12 — Lernplan-Lernzettel** — _`POST /lernplaene/:id/lernzettel`
      (neuer Endpunkt), hängt an (`Lernplan.lernzettel`), nutzt
      `TestklausurErgebnis.erklaerung` als Fehler-Hinweis, wenn vorhanden._
- [x] **Niveau-Hinweis** — _`klassenstufeFuer()` (`Fach.klasse`, sonst
      `User.klassenstufe`) fließt in jeden generierenden Call._
- [ ] **Kosten-Log auswerten** — _erst sinnvoll mit echtem `ANTHROPIC_API_KEY`
      und realer Nutzung._
- [x] **backend-planning.md §1/§3/§4** auf den umgesetzten Stand gebracht.

**Bridge bis Phase 5:** `Testklausur.loesungsText` (Migration) hält den
Klartext der hochgeladenen Lösung; `POST /testklausuren/:id/loesung` nimmt
ihn direkt entgegen. Sobald Phase 5 echte Datei-Extraktion liefert, füllt
sie dieses Feld automatisch — Call 11 selbst ändert sich nicht.

---

## Phase 7 — Notenlogik & Lernplan-Berechnung serverseitig

Der gesamte abgeleitete Zustand muss **bit-genau** zu `data.js` passen.

> _2026-09-04: umgesetzt in `2ba8c35`. Bit-genauer data.js-Port in
> `@lesify/shared`; 39 Paritäts-Tests + Route-Test grün._

- [x] **`shared/`-Modul für die reinen Formeln** — _`shared/src/noten.ts`:
      `prozentZuNote`, `noteAmpel` (≤2.5/≤4.0), `noteLabel`,
      `AMPEL_GRUEN_MAX_NOTE`/`AMPEL_GELB_MAX_NOTE`, `TIER_LABEL`. Wird von
      Frontend (später) und Backend genutzt._
- [x] **`lernplanStatus` serverseitig nachbauen** — _`shared/src/lernplan.ts` als
      reine Funktion `lernplanStatus(eingabe)`: aktueller Tag, `schwacheThemen`
      (sortiert rot→gelb, dann schlechtere Note), `fokusThemen`/`kurzThemen` ab
      `LERNPLAN_FOKUS_LIMIT = 3`, `intensitaet`, Tag-5-Verfügbarkeit,
      „nichts zu tun"-Kurzschluss, `stubborn`/`aufgefrischt`,
      `letzteTestNote`/`letzteTestNr`._
- [x] **`klausurNote(klausurId)`** — _`klausurNote(tks)` in shared +
      `klausurNoteFuer(prisma, klausurId)` in `api/src/lib/lernplan.ts` →
      `{note, testNr} | null`; `GET /klausuren(/:id)` liefern `note`._
- [x] **Checklist-Keys je Lerntag** — _`aufgabenKeys(n)` in
      `shared/src/lernplan.ts` — identische Keys wie `lpTagAufgaben()` in
      `app.js` (Prefix `fehler:`/`beispiel:`/`check:`/`abfragen:`/`gemischt`/
      `loesungen`/`kurzabfragen`/`feynman:`/`wiederholung`/`transfer`/`luecke:`/
      `frisch:`/`selbsttest`, plus `kurz`)._
- [x] **`GET /lernplaene/:id`** — _liefert jetzt `{…persistiert, status}` mit dem
      voll berechneten Zustand (auch `GET /klausuren/:id/lernplan`)._
- [x] **Paritäts-Tests** — _`shared/src/noten.test.ts` (30) + `lernplan.test.ts`
      (9) mit den SEED-Szenarien lp1…lp6 als Fixtures; berechnete
      `aktuellerTag`-Werte == SEED-Kommentare (3/1/1/6/7/fertig). Dazu ein
      Route-Test in `flow2.test.ts` (Analyse → `status.aktuellerTag`)._
- [x] **Weiche Tagesübergänge** — _kein Zugriffs-Gate in `lernplanStatus`;
      `tag5.verfuegbar = tk1Analysiert`, Tage in beliebiger Reihenfolge
      abhakbar (`checklist` je Tag)._

---

## Phase 8 — Usage-Tracking & Limits

`backend-planning.md` §7.

> _2026-09-04: Kern umgesetzt. `@lesify/shared` um `USAGE_ZAEHLER`,
> `usageRatio`, `usageStufe`, `GRATIS_REVISIONEN_PRO_LERNZETTEL` +
> `revisionZaehltGegenLimit` ergänzt. `api/src/lib/usage.ts`: `usageStand`
> (einzige Quelle, Live-Limits + Ring), `pruefeUsageLimit` (→ `403
> limit_erreicht`), `inkrementiereUsage` (Art-Param). Nachrichten-Zähler in
> `POST /chats/:id/nachrichten` hart durchgesetzt. `GET /usage` neu geformt.
> Tests: `shared/src/usage.test.ts` (7) + `api/src/routes/usage.test.ts` (2,
> inkl. 403-Fall + „Klausur läuft weiter") grün, gesamt 46/58._

- [x] **`Lesify.PLAN_LIMITS` serverseitig spiegeln** — _`PLAN_LIMITS`/`PLAN_NAMES`
      in `@lesify/shared` (seit Phase 2), Phase 8 zusätzlich `USAGE_ZAEHLER`
      (`nachrichten|dateien|lernzettel|testklausuren`) + Ring-Helper._
- [x] **Zähl-Logik** — _jede User-Chat-Nachricht zählt (`inkrementiereUsage`);
      Revisionen erst ab der 11. je Lernzettel → `revisionZaehltGegenLimit`
      (Helper steht, Verdrahtung mit dem Revisions-Endpunkt in Phase 6); jede
      Datei als Content-Aufnahme → Verdrahtung in Phase 5; Testklausur-
      Lösungs-Uploads ausgenommen (nichts zu zählen)._
- [x] **Monatlicher Reset** — _implizit: `Usage` ist über `@@unique([userId,
      monat])` (`monat` = `YYYY-MM`) gekeyt. Neuer Monat = neuer Schlüssel =
      Zähler 0, kein Übertrag. Kein Cron nötig; alte Zeilen räumt die
      1-Jahres-Löschung (Phase 13) mit ab._
- [x] **Harte serverseitige Durchsetzung** — _`pruefeUsageLimit` vor der teuren
      Aktion; Limits kommen live aus `paketFuerUser` → beim Upgrade gelten die
      neuen Grenzen sofort, verbrauchte Zähler bleiben stehen. Aktiv am
      Nachrichten-Zähler; `dateien`/`lernzettel`/`testklausuren` hängen sich in
      Phase 5/6 mit demselben Muster an._
- [x] **Limit-erreicht-Verhalten** — _pro Zähler `403 limit_erreicht` mit
      `details: { zaehler, used, limit, resetDatum }`; nur das betroffene Feature
      stoppt (Test: Chat blockiert, `POST /klausuren` läuft weiter). Kein
      Soft-Warning, keine Upgrade-Erzwingung._
- [x] **Trial** — _in der 14-Tage-Testphase gelten die Premium-Kontingente
      (`paketFuerUser` → `TRIAL_PAKET`). **Offen (Phase 9):** Zugang nach
      Trial-Ende ohne Abo / nach Kündigung — aktuell Rückfall auf `starter`
      statt „Schreib-Aktionen gesperrt" (braucht Abo-/Kündigungs-Status)._
- [x] **`GET /usage`** — _`{ paket, planName, resetDatum, nachrichten, dateien,
      lernzettel, testklausuren, ring: { ratio, stufe } }`, jede Quote
      `{ used, limit, resetDatum }`. `ring.ratio` = Max der vier Quoten
      (`null`-Limit = 0), `ring.stufe` grün/gelb/rot nach 0.33 / 0.66 (wie
      `usageRatioClass` in `app.js`)._

---

## Phase 9 — Abo & Abrechnung

`backend-planning.md` §4 „Abo & Abrechnung", §1 `Abo`/`KindProfil`. Anbieter: **Stripe** (Phase 0).

> _2026-09-04: Endpunkt-Schicht + Datenmodell-Logik komplett gegen einen
> **deterministischen `FakeZahlungsGateway`** (`api/src/lib/zahlung.ts`,
> `app.zahlung`, in Tests ersetzbar) — wie die Platzhalter-KI in Phase 4. Er
> bildet Trial → Abbuchung, Wechsel, Kündigung, Pause und Webhooks vollständig
> ab, legt aber keine echten Stripe-Objekte an. Preise/Regeln als Code in
> `shared/src/abo.ts` (Spiegel `stripe-config.js`). Tests: `shared/src/abo.test.ts`
> (6) + `api/src/routes/abo.test.ts` (18, DB-gated), gesamt shared 52 / api 76._
>
> _2026-09-12: **`StripeZahlungsGateway` (echt) ergänzt** — aktiv sobald
> `STRIPE_SECRET_KEY` gesetzt ist (`getZahlungsGateway()`), Fake bleibt Default
> ohne Key **und immer in `abo.test.ts`** (dort per `buildApp({zahlung: new
> FakeZahlungsGateway()})` erzwungen, sonst würden Tests echte Stripe-Calls
> auslösen). Preise laufen dynamisch über `price_data` (kein manueller
> Preis-Katalog nötig), nur drei Produkte (je Paket eins) legen sich beim
> ersten Gebrauch selbst an. Webhook-Signaturprüfung jetzt echt (`stripe.
> webhooks.constructEvent`, dafür `req.rawBody` in `app.ts` mitgeschnitten).
> `marketing/assets/js/checkout.js` ruft jetzt wirklich `POST /abo` (inkl.
> `checkout-erfolg.html`, neu). Lokal komplett gegen echtes Stripe Test-Mode
> verifiziert (Anlegen/Wechsel/Pause/Kündigen/Webhook, per Stripe CLI).
> Details: `backend-planning.md` §4 „Umsetzungsstand (Phase 9 …; Stripe-Adapter
> 2026-09-12)". Noch offen: `api/` öffentlich hosten (Webhook braucht
> erreichbare HTTPS-URL), echte Registrierung/Login auf der Marketing-Seite,
> Live-Mode → Phase 16._

- [x] **Stripe-Konto (Test-Modus):** _bereits vorhanden, Secret Key liefert
      echte Test-Mode-Objekte (siehe oben). Produkte legen sich selbst an,
      kein manueller Preis-Katalog nötig (dynamisches `price_data`)._
- [ ] **Stripe-Konto Live-Modus** + Umschalten auf Live-Keys, Rechnungsstellung.
      _Ops-Schritt, sinnvoll erst mit öffentlich gehostetem `api/` (Phase 16)._
- [x] **Trial-Modell (Phase 0):** _`POST /abo` legt über `zahlung.subscriptionAnlegen`
      sofort ein Trial-Abo an (`status = test`, `trialEndetAm = +14 Tage`,
      `aktuellerZeitraumEnde` nach Trial). Webhook `trial_beendet` → `status =
      aktiv`. Auto-Abbuchung selbst macht später echtes Stripe._
- [x] **`GET /abo`** — _`aboDTO`: `paket, planName, art, sitze, intervall,
      angebot, status, trialEndetAm, aktuellerZeitraumEnde, kontingente`;
      `404`, wenn kein Abo._
- [x] **`POST /abo`** — _`{paket, intervall, sitze?}` → `art` aus `sitze`,
      `aboPreis` aufgelöst, Abo-Zeile + `User.aboId`, `angebot` fixiert,
      `zahlungsanbieterRef = fake_sub_…`. Zweiter Aufruf → `409 abo_vorhanden`.
      Antwort 201. MwSt. wird nirgends ausgewiesen._
- [x] **`PATCH /abo`** — _Paket-/Intervall-/Sitz**erhöhung** sofort (Proration
      beim Anbieter). Sitz**verringerung** → `409
      sitzverringerung_zum_zeitraumende` (`details.wirksamAm`); volle Mechanik
      Phase 12._
- [x] **`POST /abo/kuendigen`** (`status = gekuendigt`, Zugang bis
      `aktuellerZeitraumEnde`) **+ `POST /abo/pausieren`** (`status = pausiert`).
- [x] **`POST /abo/webhook`** — _kein Login, Body `{typ, aboRef}`,
      `stripe-signature` bei gesetztem `STRIPE_WEBHOOK_SECRET` geprüft (echte
      HMAC-Prüfung Phase 16). `typ` → `status`, idempotent, unbekannte `aboRef`
      → `200 {ok, ignoriert}`._
- [x] **`GET/POST/DELETE /abo/kinder`** — _Kind-Profile = `User` mit
      `parentUserId` + `aboId`, `rolle = schueler`,
      `passwordHash = "kind:kein-login"`. `POST` nur bei `art = familie`,
      gedeckelt auf `Abo.sitze` → `409 sitze_ausgeschoepft`. `DELETE` → `User`-Zeile
      weg → **Cascade löscht alle Inhalte des Sitzes.** Einladungs-/Passwort-Flow
      Phase 12._
- [ ] **Rechnungsstellung** + Umgang mit fehlgeschlagenen Zahlungen (Retry,
      Mahnlogik, Zugriff bei `zahlung_offen`). _Braucht echtes Stripe-Adapter →
      Phase 16._
- [x] **backend-planning.md §1/§4/§8** — _§4 „Umsetzungsstand Phase 9", §1 `Abo`/
      `KindProfil`-Notizen, §8 Preis-Feinheiten + „Abrechnung produktiv"
      nachgezogen. Limits (§7) unverändert._

---

## Phase 10 — Benachrichtigungen & Cron

Zahlungs-/Abo-/Beleg-Mails übernimmt weiterhin Stripe. Double-Opt-in-/
Passwort-Reset-Mails laufen seit 2026-09-17 über Resend (siehe unten). Eigener
Versand von Klausur-Erinnerung und Wochenreport ist **weiterhin
zurückgestellt** — die Toggles `erinnerungVorKlausuren` /
`woechentlicheZusammenfassung` bleiben in den Einstellungen, aber ohne Wirkung,
bis das Thema wieder aufgemacht wird.

> _2026-09-04: Job-Funktionen + CLI-Runner gebaut (`api/src/lib/jobs.ts`,
> `api/src/jobs/run.ts`, `pnpm --filter @lesify/api job <name>`). Alle
> idempotent, geben eine JSON-Zusammenfassung fürs Monitoring aus. Tests
> `api/src/lib/jobs.test.ts` (3). Das **Einhängen in einen echten Scheduler**
> (Hosting-Cron / Supabase `pg_cron` / Worker) bleibt ein Ops-Schritt für
> Phase 16._

- [ ] **Stripe-Mails konfigurieren** (Beleg-/Zahlungs-/Kündigungs-Mails im
      Stripe-Dashboard aktivieren, Wording prüfen). _Ops, Phase 16._
- [x] **Double-Opt-in-/Reset-Versand** — _siehe Abschnitt „E-Mail-Versand" oben:
      Resend über `api/src/lib/mailer.ts`, seit 2026-09-17._
- [x] **Job-Funktionen + Runner** — _`inhalte-aufbewahrung` (löscht Lernpläne,
      Testklausuren, Klausuren, Chats, Lernzettel, Dateien > 365 Tage, Cascade
      räumt Kind-Tabellen; seit Phase 5 räumt der Job danach auch die
      zugehörigen Objektspeicher-Objekte auf, best effort), `usage-historie`
      (Usage-Zeilen > 12 Monate), `token-hygiene` (abgelaufene
      Sessions/Verification-Token), `abo-geplante-aenderungen` (Phase 12),
      `ki-kosten-alarm` (2026-09-16, siehe Phase 15 unten). Aufruf:
      `pnpm --filter @lesify/api job inhalte-aufbewahrung|usage-historie|token-hygiene|abo-geplante-aenderungen|ki-kosten-alarm|all`._
- [x] **Usage-Reset** — _kein eigener Job nötig: der Monatszähler resettet
      implizit über den `Usage.monat`-Schlüssel (Phase 8). `usage-historie`
      räumt nur die Altlasten weg._
- [ ] **Scheduler + Monitoring** — _die fünf Kommandos in Hosting-Cron/`pg_cron`
      eintragen (Vorschlag: `inhalte-aufbewahrung`/`usage-historie`/
      `abo-geplante-aenderungen`/`ki-kosten-alarm` täglich, `token-hygiene`
      stündlich), Exit-Code != 0 alarmiert. → Phase 16._
- [ ] _(zurückgestellt)_ `erinnerungVorKlausuren`, `woechentlicheZusammenfassung`,
      Trial-Reminder.

---

## Phase 11 — Frontend an das echte Backend anbinden

Ziel: `assets/js/data.js` wird durch einen API-Client **mit identischer
Funktionssignatur** ersetzt (`backend-planning.md` §9). Die Seiten bleiben
sonst unverändert.

> _2026-09-04: Client-Bausteine gebaut. Der eigentliche **Seiten-Cut-over**
> (sync → async, Formulare verdrahten, Dev-Switcher entfernen) bleibt offen —
> er braucht das laufende Backend auf `staging` zum Prüfen und geht Seite für
> Seite, siehe `app/README.md` → „Phase 11"._
>
> _2026-09-12: **Marketing-Formulare verdrahtet** (siehe unten) — dabei fiel
> auf, dass die API noch **kein CORS** hatte (Marketing/App laufen lokal auf
> anderem Port als `api/`, produktiv auf anderer Domain); ohne das wäre auch
> der `app/`-Seiten-Cut-over später am selben Problem gescheitert. Jetzt
> nachgerüstet (`@fastify/cors`)._
>
> _2026-09-12: **`dashboard.html` als erste Seite umgestellt** (siehe unten) —
> dabei kam eine ganze Reihe zusätzlicher Bausteine ans Licht, die
> `assets/js/api.js` noch fehlten, weil `app.js`s geteilte Renderer
> (`badge`/`fachColorVars`/`fachBadge`/`cardWatermark`/`klausurCard`/…)
> Fach-/Thema-Daten **synchron** per ID lesen (`Lesify.getFach(id)`,
> `Lesify.label(themaId)`) — genau wie im data.js-Prototyp, wo ohnehin alles
> im Speicher liegt. `api.js` bekam dafür einen kleinen Fächer-/Themen-Cache
> (gefüllt von `faecher()`/`themen()`) mit synchronen Lookups obendrauf, plus
> die reinen Formeln/Design-Tokens aus `data.js` gespiegelt
> (`prozentZuNote`/`noteAmpel`/`noteLabel`/`tierLabel`/`klausurVergangen`,
> `FACH_COLORS`/`getFachColor`/`FACH_PRESETS`/`getFachIconSvg`) und eine neue
> `relativeTime()`-Berechnung für `.updated`-Anzeigen (in data.js nur ein
> fest verdrahteter Seed-Text). `Lesify.getUser()` bekam zusätzlich
> `.klasse`/`.initials`, `Lesify.getFach(id)` (vorher ein nicht existierender
> Endpunkt, also immer 404) wurde zum sync Cache-Lookup umgebaut. Die
> Sidebar-Chrome (`app.js` → `renderChrome()`) rendert den Profil-Chip jetzt
> mit einem Platzhalter und füllt ihn nach, sobald `getUser()` (Promise unter
> api.js) aufgelöst ist — synchrones data.js-Verhalten bleibt unverändert.
> `klausurNoteBox()` nutzt das mit `GET /klausuren` eingebettete `note`-Feld,
> statt (wie data.js) einen flachen Testklausur-Index zu durchsuchen, den es
> im echten Backend so nicht gibt. Backend-seitig kam eine fehlende
> `GET /lernzettel(?themaId=)`-Listen-Route dazu (für den „Zuletzt
> bearbeitet"-Feed) sowie ein Bugfix in `GET /suche`: die `href`-Felder waren
> **absolut** (`/fach.html?id=…`) statt relativ — hätte in Produktion (App
> unter `/app/`) auf die falsche Seite verlinkt. Alles gegen die echte
> Supabase-DB im Browser durchgeklickt (Dashboard-Feed, Live-Suche,
> Rollen-Redirect, ausgeloggt → Redirect zu `login/?weiter=…`), Test-User
> danach gelöscht. **Bekannte, bewusst zurückgestellte Lücke:** Dark-Mode
> (`settings.darkMode`) existiert nur im data.js-Prototyp, nicht im
> `Einstellungen`-Datenmodell — auf `dashboard.html` unter api.js also ohne
> Effekt (kein Crash, `applyTheme()` scheitert still). Wird beim Cut-over von
> `einstellungen.html` nachgezogen oder vorher entschieden, ob das Feature
> überhaupt bleibt. Tests: `api/src/routes/ki.test.ts` (+1),
> `api/src/routes/kern.test.ts` (+2)._
>
> _2026-09-12: **`faecher.html` als zweite Seite umgestellt.** Fach-Karten
> (Zähler, Farbe, Icon, anstehende Klausur), Fach-Farbe ändern
> (`LesifyUI.openFachColorPicker`) und neues Fach anlegen alle live gegen
> Supabase geprüft. Zähler (`anzahlThemen`/`anzahlKlausuren`) kommen mit
> `GET /faecher` bereits eingebettet (`fachDTO`) — kein eigener
> `Lesify.countsForFach()`-Aufruf nötig, anders als im data.js-Prototyp.
> `openFachColorPicker()` (app.js, geteilt mit dem noch nicht umgestellten
> `fach.html`) rief `Lesify.updateFach()` bisher ungeawaitet auf — unter
> api.js (Promise statt synchronem Rückgabewert) schloss das Modal, bevor
> die Farbe gespeichert war. Jetzt: Thenable-Check wie bei `renderChrome()`,
> data.js-Pfad unverändert synchron. Fach-Formular schickte testweise
> `icon: null` mit — die Zod-Validierung (`erstellen`-Schema in
> `faecher.ts`) lehnt explizites `null` bei einem `.optional()`-Feld ab
> (`400 validierung`); Fix: `icon` nur mitschicken, wenn tatsächlich eins
> gewählt wurde.
>
> **Dabei ein ernsterer, bis dahin unentdeckter CORS-Bug gefunden:**
> `@fastify/cors` erlaubt ohne explizite `methods`-Option nur
> `GET,HEAD,POST` — jeder `PATCH`- und `DELETE`-Endpunkt (Fächer-Farbe,
> Lernplan-Checklist, Abo ändern/kündigen/pausieren, Einstellungen,
> Kind-Profile entfernen, …) lief lautlos ins Leere: der Preflight (`OPTIONS`)
> antwortete mit `204`, aber der Browser schickte den eigentlichen Request
> gar nicht erst ab (`net::ERR_FAILED`, keine Server-Log-Zeile danach). Weder
> die Marketing-Formulare (nur `POST`) noch `dashboard.html` (nur `GET`)
> hätten das je ausgelöst — erst der Fach-Farbe-Test auf `faecher.html`
> (`PATCH /faecher/:id`) hat es sichtbar gemacht. Fix: `methods: ['GET',
> 'HEAD', 'POST', 'PATCH', 'DELETE']` explizit in `api/src/app.ts`. **Betrifft
> jede künftige Seite, die etwas ändert oder löscht — beim nächsten
> Cut-over sofort eine schreibende Aktion mittesten, nicht nur Lesen.**
> Tests: `api/src/app.test.ts` (+2, Preflight erlaubt PATCH/DELETE).
>
> _2026-09-12: **`fach.html` als dritte Seite umgestellt** (Fach-Detail:
> Kopf/Zähler, Themen-Grid, Klausur-Liste, neues Thema anlegen, Farbe ändern
> — alles wiederverwendet aus `faecher.html`/`dashboard.html`). Zwei weitere
> generische Lücken gefunden und im Cache-Layer gefixt (`assets/js/api.js`,
> betrifft **jede** künftige Seite):
> (1) `GET /faecher/:id/themen` hatte keine Zählwerte — anders als
> `GET /faecher` (das schon `anzahlThemen`/`anzahlKlausuren` einbettet) fehlte
> das Pendant für Themen. Neu: `anzahlChats`/`anzahlLernzettel`/`anzahlDateien`
> via `_count` (Klausuren/Testklausuren bleiben außen vor — die hängen über
> `themaIds`-Array-Felder, nicht über eine echte Relation, `_count` kann das
> nicht). `themaCard()` (`app.js`) nutzt die eingebetteten Werte, wenn
> vorhanden, sonst wie bisher `Lesify.countsForThema()` (data.js-Pfad
> unverändert). (2) **Teil-Listen aktualisierten den Cache nicht richtig:**
> `themenFuerFach(fachId)` schrieb nirgends in den Themen-Cache, den
> `label()`/`badge()` lesen — Klausur-Badges zeigten „—·—" statt Fach/Thema.
> `api.js` hat jetzt `mergeCache()` (fügt/aktualisiert per `id`, statt den
> ganzen Cache zu ersetzen) — `faecher()`/`themen()`/`themenFuerFach()`
> nutzen es alle; `themenFuerFach()` ergänzt zusätzlich `fachName`/`farbe`
> aus dem bereits geladenen Fächer-Cache, weil die Server-Antwort dafür
> keinen `fach`-Include hat. **Nebenbei eine echte Race Condition in
> `fach.html` selbst gefunden**, nicht im Cache-Layer: `Promise.all([drawHead(),
> drawThemen(), drawKlausuren()])` lief parallel, aber `drawKlausuren()`
> braucht den von `drawThemen()` gefüllten Themen-Cache für seine
> Klausur-Badges — ohne Sequenzierung (`await drawThemen()` zuerst) manchmal
> noch leer. **Faustregel für die nächste Seite:** wenn ein `Promise.all([…])`
> mehrere Draw-Funktionen parallelisiert und eine davon einen sync-Cache
> befüllt, den eine andere synchron liest, zuerst die Cache-füllende Funktion
> einzeln awaiten. Tests: `api/src/routes/kern.test.ts` (+1, `anzahlChats`
> u. a. im `GET /faecher/:id/themen`-Response).
>
> _2026-09-12: **`klausuren.html` als vierte Seite umgestellt** (Liste + Fach-
> Filter + Klausur anlegen, inkl. neues Fach/neues Thema im selben Formular).
> Drei weitere generische Lücken gefixt, wieder alle im Cache-Layer bzw. im
> Seiten-Muster, nicht seitenspezifisch:
> (1) `fachFilterChips()` (app.js) rief `Lesify.faecher()` synchron auf —
> unter api.js ein Promise. Neu: `Lesify._faecherCache()` (Sync-Snapshot des
> Fächer-Caches) in `api.js`, `fachFilterChips()` nutzt es, wenn vorhanden,
> sonst (data.js) unverändert den alten Pfad.
> (2) `Lesify.themen(fachId)` (gefiltert) gibt es unter api.js nicht — nur
> `themenFuerFach(fachId)` (async). Das „neue Klausur"-Formular lädt die
> Themen-Pillen jetzt einmal pro Fach-Wechsel in eine lokale Variable, statt
> sie bei jedem Render synchron neu abzufragen.
> (3) **Wieder eine Cache-Warm-Lücke wie bei `fach.html`, diesmal fächer-
> übergreifend:** die Klausur-Liste zeigte „—·—" auf allen Karten, weil die
> Seite nur `Lesify.faecher()`, aber nie `Lesify.themen()` awaitete, bevor
> `klausurCard()`/`badge()` synchron aus dem (leeren) Themen-Cache lasen.
> **Faustregel geschärft:** jede Seite, die Karten/Zeilen mit
> Thema-Badges rendert, muss vorher **sowohl** `Lesify.faecher()` **als auch**
> `Lesify.themen()` (oder eine Seiten-lokale Teilmenge wie
> `themenFuerFach()`) geawaitet haben — nicht nur Fächer.
> Backend: `POST /klausuren` legt Klausur + Testklausur 1 (echter KI-Call) +
> Lernplan in einem Request an — `Lesify.starteLernplan()` aus dem
> data.js-Prototyp entfällt unter api.js ersatzlos, die Seite liest
> `ergebnis.lernplan.id` direkt aus der Antwort. Live mit echtem
> `ANTHROPIC_API_KEY` durchgeklickt (neues Fach + neues Thema + Klausur in
> einem Formular-Durchlauf, danach Weiterleitung zu `lernplan.html` mit
> echter Lernplan-ID) — Testdaten/-user danach gelöscht.
>
> _2026-09-12: **`lernplan.html` als fünfte Seite umgestellt — mit Abstand
> der größte Umbau bisher**, weil `app.js`s Lernplan-Renderer
> (`lernplanSeite`/`lpVariantSplit`/`lpTag1Body`…`lpTag7Body`/`wireLernplan`/
> `lernplanNaechsteAufgabe`/`lernplanTeaser`/`lernplanFocusTag`/
> `lernplanSplitMain`) alle synchron auf `Lesify.lernplanStatus(id)` und
> das darin verschachtelte `s.klausur`/`s.testklausur1`/`s.testklausur2`
> zugreifen — genau die data.js-Prototyp-Form (`{lernplan, klausur,
> testklausur1, testklausur2, tag1..tag7, aktuellerTag, letzteTestNote,
> letzteTestNr, gesamtnoteAktuell}`), nicht nur die reine
> `shared/src/lernplan.ts`-Berechnung. `GET /lernplaene/:id` lieferte bis
> dahin nur `{...persistiert, status}` — **`status` allein reichte dem
> UI nicht**, weil dort keine vollen `klausur`/`testklausur1`/`testklausur2`-
> Objekte drinstecken (nur die daraus abgeleiteten `tag1..tag7`-Felder).
> Backend-Fix: `api/src/lib/lernplan.ts` → neue `testklausurFuerLernplanUI()`
> (lädt Aufgaben+Ergebnisse+Vorbereitung und formt sie in die verschachtelte
> `{ergebnis: {note, prozent, proThema}, vorbereitung: {note, proThema}}`-
> Form um — **anders** als die flachen `ergebnisse`/`vorbereitung`-Arrays von
> `GET /testklausuren/:id`); `lernplaene.ts`s `mitStatus()` bettet jetzt
> zusätzlich `klausur`/`testklausur1`/`testklausur2` ein (rein additiv, die
> gut getestete reine `berechneLernplanStatus()`/`lernplanStatus()`-Funktion
> bleibt unangetastet). `api.js` bekam dafür einen Lernplan-Cache
> (`_cache.lernplaene`, Objekt statt Array — Lernpläne werden immer per ID
> abgefragt, nie als Liste) + einen sync `lernplanStatus(id)`, der die
> API-Antwort auf die exakte data.js-Form zusammenfaltet, plus
> `getLernplanChatId()` (liest `chatMap` **im Backend-Key-Format**
> `tag|modus|themaId` mit leerem statt `"null"`-String bei fehlendem Modus
> — data.js verwendet dort `String(modus)`, das würde bei fehlendem Modus
> nicht zu dem passen, was der Server tatsächlich unter `chatMap` speichert).
> `wireLernplan()` (Checklisten-Haken, „Tag abschließen", Lernzettel starten,
> Testklausur 2 starten, Tag-Fokus wechseln) ist jetzt komplett `async` mit
> explizitem Re-Fetch (`Lesify.getLernplan(id)`) vor jedem Re-Render — auf
> synchronen Rückgabewerten (data.js) läuft `await` einfach einen Mikrotask
> später durch, technisch folgenlos bei Klick-/Change-Events, darum **kein**
> Thenable-Check nötig (anders als bei `renderChrome()`, wo ein sichtbarer
> Lade-Flash vermieden werden sollte). Live durchgeklickt: kompletter
> Diagnose-Kurzschluss-Pfad (beide Themen nach Testklausur-1-Analyse grün →
> Tag 2–6 „nichts zu tun", Tag 7 aktiv), Tag-Fokus-Umschalten, Checkbox
> abhaken → Fortschrittsbalken/Status/„Lernplan abgeschlossen"-Meldung
> aktualisieren sich sofort und korrekt, Server-seitig per direktem
> `GET /lernplaene/:id` verifiziert. **Bekannte, bewusst zurückgestellte
> Lücke:** `lpKlasse()` (Chat-Prompt-Formulierung „für die 8. Klasse")
> fällt unter api.js auf den Fach-Wert zurück, weil `Lesify.getUser()` dort
> async ist — der User-Klassenstufe-Fallback greift nicht mehr. Betrifft nur
> die Prompt-Formulierung, keine Funktion; wird bei Bedarf mit einem
> User-Cache (analog Fächer/Themen) nachgezogen. Tests: `api/src/routes/
> flow2.test.ts` (+1, prüft die eingebetteten `klausur`/`testklausur1`-Felder).
>
> _2026-09-12: **`klausur.html` als sechste Seite umgestellt — wie erhofft
> deutlich leichter**, weil die gesamte Lernplan-Sektion (`fmRailPills`,
> `lernplanFocusTag`, `lernplanSplitMain`, `wireLernplan`,
> `lernplanNaechsteAufgabe`) unverändert aus dem `lernplan.html`-Umbau
> weiterläuft — **kein Backend-Change nötig für diese Seite.** Nur zwei neue
> Kleinigkeiten: `k.note` kommt mit `GET /klausuren/:id` eingebettet, ersetzt
> den nicht existierenden `Lesify.klausurNote(kId)`. Und `Lesify.getThema(id)`
> (Thema-Detail für die „Zugehörige Themen"-Karten) lieferte Zählwerte unter
> `.stats.chats` statt der sonst verwendeten `anzahlChats`-Konvention (dritte,
> andere Form nach `GET /themen` ohne Zähler und `GET /faecher/:id/themen`
> mit `anzahlX`) — `api.js` spiegelt `stats.*` jetzt zusätzlich als
> `anzahlChats`/… und merged das Thema ins Themen-Cache (badge()/label()
> finden es danach auch). `renderAll()` awaitet `drawThemen()` zuerst (füllt
> den Themen-Cache über genau diese `getThema()`-Aufrufe), bevor die
> Lernplan-Sektion ihre Tag-1/5-Diagnose-Chips rendert — dieselbe
> Sequenzierungs-Faustregel wie bei `fach.html`/`klausuren.html`. Live
> durchgeklickt: Kopf/Zähler/Themen-Karte, Schnellzugriff-Kacheln
> („Nächste Lernplan-Aufgabe" korrekt verlinkt), eingebettete Lernplan-
> Sektion inkl. Tag-Fokus-Wechsel — alles wie auf `lernplan.html`.
>
> _2026-09-12: **`lernplan-lernzettel.html` als siebte Seite umgestellt —
> ebenfalls kein Backend-Change nötig.** `lp.klausur` kommt mit
> `Lesify.getLernplan()`/`getLernplanFuerKlausur()` bereits eingebettet, kein
> eigener `Lesify.getKlausur()`-Aufruf mehr. Ein neuer Bug im selben
> Cache-Muster: `R.lernzettelSeite(lernplanId)` (app.js) rief
> `Lesify.getLernplan(lernplanId)` synchron auf — unter api.js ein Promise;
> jetzt Thenable-Check, der bei einem Promise auf `Lesify.lernplanStatus(id)
> .lernplan` ausweicht (sync, Cache-basiert), data.js-Pfad unverändert.
> **Der Download-Button brauchte einen echten Rewrite, kein reines
> `await`:** data.js erzeugt den Markdown-Text clientseitig
> (`Lesify.lernzettelDokument`) und triggert `Lesify.downloadText` (Blob aus
> einem String); api.js hat stattdessen `GET /lernplaene/:id/lernzettel/
> dokument` — der Endpunkt sitzt aber **hinter dem normalen
> `requireAuth`-Hook ohne `?token=`-Fallback** (anders als
> `dateiInhaltUrl()`/`testklausurDokumentUrl()`, die einen eigenen Plugin-
> Scope mit Query-Token haben) — eine einfache `<a href>`-Navigation hätte
> also ohne Authorization-Header eine 401 bekommen. Lösung: der Button holt
> den Text jetzt selbst per `fetch()` mit Bearer-Header (`Lesify._base`/
> `Lesify._getToken()`), baut daraus einen Blob + eine
> `URL.createObjectURL`-basierte Download-`<a>`. Live verifiziert: leerer
> Zustand („Noch kein Lernzettel"), nach `POST /lernplaene/:id/lernzettel`
> echter Inhalt gerendert, Download-Button lädt den exakten
> Server-Markdown-Text (per Netzwerk-Log geprüft).
>
> _2026-09-12: **`thema.html` als achte Seite umgestellt — bisher der größte
> Umbau nach `lernplan.html`**, weil die Seite fünf Inhaltstypen
> (Chats/Lernzettel/Dateien/Klausuren + Übersicht) parallel zeigt und einen
> echten Datei-Upload + eine Klausur-Anlage-Modal hat. Wichtigste
> Architektur-Entscheidung: `chatItems()`/`lzItems()`/`dateiItems()`/
> `klausurItems()` lasen im Original JEDES Mal frisch (auch beim Wechsel
> zwischen Übersicht und Einzel-Tab) — unter api.js hätte das pro
> Seitenaufruf 4× wiederholte Netzwerk-Fetches bedeutet. Neu: `loadDaten()`
> lädt Chats (fach-gefiltert, dann clientseitig auf `themaId` eingeengt —
> `GET /chats` kennt keinen `themaId`-Filter)/Lernzettel/Dateien (beide
> serverseitig `themaId`-gefiltert)/Klausuren (ungefiltert, dann
> clientseitig eingeengt) **einmal**, `drawTabs`/`drawUebersicht`/die vier
> Einzel-Tab-Draws bekommen die fertigen Listen als Parameter — behebt
> nebenbei einen Staleness-Bug (die alten Tab-Zähler kamen aus
> `Lesify.countsForThema()`, hätten nach einem Upload nicht ohne
> Neu-Fetch der Themen-Objekts aktualisiert werden können).
> **Datei-Upload komplett neu geschrieben, kein Await-Umbau:** data.js
> simuliert Upload+Verarbeitung rein clientseitig (`Lesify.addDatei` +
> `setTimeout` + `Lesify.markDateiBereit`); api.js hat den echten Weg
> `Lesify.uploadDatei(themaId, file)` (multipart) + `Lesify.pollDateiStatus()`
> (Backoff-Polling bis `bereit`/`fehler`) — inkl. serverseitiger MIME-Prüfung,
> die die alte Client-Extension-Heuristik (`ext === 'pdf' ? …`) ersetzt.
> Live mit einer absichtlich kaputten Test-PDF geprüft: Upload → Status
> `verarbeitung` → Polling → Status `fehler` mit
> „Dateiformat wird nicht unterstützt." — der Fehlerpfad greift genauso
> sauber wie der Erfolgspfad. **Neue `api.js`-Lücke gefunden:** `GET
> /dateien` lieferte `groesseBytes` (Zahl) statt der von `dateiCard()`/
> `dateiRow()` erwarteten formatierten `groesse`-Zeichenkette ("1.2 MB") —
> neue `formatBytes()`/`mitDateiForm()` in `api.js`, jetzt in
> `dateien()`/`getDatei()`/`uploadDatei()` einheitlich angewandt.
> Klausur-Anlage-Modal nutzt dasselbe `themenFuerFach()`-Cache-Muster wie
> `klausuren.html`. Live komplett durchgeklickt: Tabs mit korrekten
> Zählern, Datei-Upload (Fehlerpfad), Lernzettel erstellen (echter KI-Call,
> Weiterleitung mit echter ID), Klausur im Modal anlegen (echter KI-Call,
> Weiterleitung zu `lernplan.html` mit echtem Lernplan).
>
> Der Rest des `app/*.html`-Seiten-Cut-overs (`chat.html`,
> `testklausur.html`, `lernzettel.html`,
> `themen.html`, `dateien.html`, `suche.html`, `einstellungen.html`, die vier
> `eltern-*.html`) bleibt offen. Grundbausteine (Cache inkl.
> `mergeCache`/`_faecherCache`/`_cache.lernplaene` + CORS inkl. PATCH/DELETE)
> stehen für alle bereit.
>
> _2026-09-12: **`themen.html` als neunte Seite umgestellt** — mit Abstand die
> kleinste Konvertierung bisher (49 Zeilen, nur `R.fachFilterChips()` +
> `Lesify.themen()` → `R.themaCard(t)` je Thema), aber sie deckte eine
> Backend-Lücke auf: `R.themaCard(t)` ohne `opts` nutzt den Default-`countKeys`
> mit `'klausuren'`, doch `GET /themen` (fächerübergreifend) hatte bisher gar
> keine eingebetteten Zählwerte — hätte entweder gecrasht (unbekannte
> `Lesify.countsForThema()`) oder eine falsche hartcodierte 0 gezeigt. Statt
> eines Workarounds im Frontend echte serverseitige Zählung nachgezogen: neue
> `klausurenAnzahlProThema(prisma, userId)` in `api/src/lib/themen.ts` (ein
> Batch-Read über `Klausur.themaIds`, da das ein String-Array-Feld ist, kein
> `_count` möglich), `themaDTO()` um optionales `klausuren`-Feld erweitert,
> sowohl `GET /themen` als auch `GET /faecher/:id/themen` liefern jetzt
> `anzahlChats`/`anzahlLernzettel`/`anzahlDateien`/`anzahlKlausuren`
> vollständig eingebettet (`chats`/`lernzettel`/`dateien` per `_count`,
> `klausuren` per neuem Helfer). `themaCard()` in `app.js` liest jetzt
> `t.anzahlKlausuren || 0` statt der alten hartcodierten 0. Live verifiziert:
> Testnutzer mit einem Fach/Thema, einem Chat und einer Klausur angelegt —
> Themen-Übersicht zeigt korrekt "1 Chats · 0 Lernzettel · 0 Dateien ·
> 1 Klausuren", Fach-Filter-Chip filtert richtig. Regressionstest in
> `flow2.test.ts` (`GET /themen` → `anzahlKlausuren: 1`).
>
> _2026-09-12: **`chat.html` als zehnte Seite umgestellt — größter Umbau der
> gesamten Phase-11-Cutover-Reihe.** Die Seite simulierte im Prototyp den
> gesamten KI-Chat client-seitig (Platzhalter-Antworten aus festen Textpools,
> `Lesify.incrementUsage()` fürs Kontingent, `Lesify.setLernplanChatId()` als
> separater Zweitschritt) — all das ersetzt jetzt der **eine** echte Endpunkt
> `POST /chats/:id/nachrichten`, der Guard-Prüfung + Limit-Durchsetzung +
> echten KI-Call + Titel-Generierung + Usage-Inkrement + (bei Lernplan-Kontext)
> das chatMap-Update atomar in einem Request erledigt — der separate
> `Lesify.setLernplanChatId()`-Aufruf aus data.js entfällt dadurch komplett,
> `lernplanKontext: {lernplanId, tag}` im Request genügt. Architektur: ein
> lokaler `chatList`-Cache (`await Lesify.chats()`) ersetzt data.js' synchrones
> `Lesify.chats()` für die Verlauf-Spalte + den Fach-Filter (`GET /chats`
> liefert bereits neueste zuerst — das alte `.reverse()` musste weg, sonst
> falsche Reihenfolge). Die client-seitige „Eröffnungsnachricht" (freundlicher
> Begrüßungstext vor der ersten echten Nachricht) bleibt rein lokal/UI —
> wird nie ans Backend gesendet, genau wie im Prototyp. Datei-Anhänge laufen
> jetzt über den echten Upload-Pfad: `Lesify.uploadDatei()` +
> `Lesify.pollDateiStatus()` vor dem Senden, `anhangDateiId` der bereiten
> Datei geht in den `nachrichten`-Request; beim Laden eines bestehenden Chats
> wird der Dateiname pro `anhangDateiId` einmalig nachgeladen
> (`normalizeMessages()`). Guard-Fehler (`nicht_schulrelevant`/
> `anfrage_zu_gross`/`spam_erkannt`) und Limit-Fehler (`limit_erreicht`)
> landen als Toast (`Lesify.fehlerText()`) statt die Seite zu blockieren.
> **Nebenbei entdeckter Bug (nicht durch diese Seite verursacht, aber hier
> zum ersten Mal sichtbar, weil `chat.html` die erste Seite ist, die den
> Nutzungs-Ring tatsächlich rendert):** `GET /usage` liefert `resetDatum` als
> volles ISO-Datetime (Prisma `Date` → `toJSON()`), `formatDatum()` (app.js)
> erwartet aber ein reines "YYYY-MM-DD" wie bei `Klausur.datum` — Ergebnis war
> "Setzt sich zurück am NaN. undefined NaN". Fix in `api.js`s `usage()`:
> `resetDatum` auf die ersten 10 Zeichen gekürzt. Live mit einem Testnutzer
> (echtem Fach/Thema) durchgespielt: neuen Chat per Fach/Thema-Picker
> gestartet, echte Nachricht gesendet (Server ohne `ANTHROPIC_API_KEY` in
> dieser Dev-Server-Instanz — lief über den deterministischen
> `FakeKiClient`, das bestätigt aber genau denselben Endpunkt-Pfad wie ein
> echter Call), Sidebar-Titel kam per `chatTitelErzeugen` zurück, Reload über
> `?chat=<id>` stellte den vollen Verlauf wieder her, „Neuer Chat" setzte
> sauber zurück, zweite Nachricht im selben Chat fortgesetzt, Nutzungs-Ring
> zeigte nach Fix korrekt "2 / 250" Nachrichten + richtiges Reset-Datum.
>
> _2026-09-12: **`testklausur.html` als elfte Seite umgestellt.** Kein
> `GET /testklausuren`-Bulk-Endpunkt (anders als `/klausuren`) — die Seite
> erwartet immer `?id=`, ohne gültige id geht's zurück aufs Dashboard.
> `GET /testklausuren/:id` liefert flache `ergebnisse`-Zeilen
> (`TestklausurErgebnis`), aber die UI erwartet ein genestetes
> `t.ergebnis = {note, prozent, proThema}` — neue `reshapeTestklausur()` in
> `api.js` baut das 1:1 wie `testklausurFuerLernplanUI()` im Backend (gleiche
> Formel: `prozentZuNote(round(avg(prozent)))`, siehe `testklausurGesamtNote`
> in `shared/`). Datei-Anhänge (Lösungs-Upload) laufen jetzt über den
> echten Multipart-Pfad `POST /testklausuren/:id/loesung` (neue
> `Lesify.ladeTestklausurLoesungHoch()`), der serverseitig synchron
> Text extrahiert und `status: 'geloest'` setzt — kein Zwei-Schritt
> `uploadDatei`+`loeseTestklausur` nötig. Download läuft wie bei
> `lernplan-lernzettel.html` per `fetch` + Blob (`GET
> /testklausuren/:id/dokument` hat keinen `?token=`-Fallback). Live komplett
> durchgespielt: Testklausur 1 einer echten Klausur erstellt, Download
> geprüft (200 OK), Lösungs-Upload mit falschem MIME-Typ korrekt mit 400
> abgefangen (Toast, Zone zurückgesetzt), echter PNG-Upload erfolgreich
> (Status → "geloest", Dateiname angezeigt), Analyse gestartet — Ergebnis
> zeigt Testklausurnote 2.5/"gut", Aufgabe-für-Aufgabe-Karten mit Ampelfarbe
> und den echten Lernplan-Teaser ("Tag 7 von 7"), Reload über `?id=`
> stellt den analysierten Zustand korrekt wieder her.
>
> _2026-09-12: **`lernzettel.html` als zwölfte Seite umgestellt — kleinste
> Konvertierung seit `themen.html`.** Der simulierte Revisions-Chat (feste
> `AI_REPLIES`-Textliste, `replyIndex`) weicht dem echten `POST
> /lernzettel/:id/revisionen` (Call 09: Such-/Ersetzen-Patches statt
> Vollersatz, inkl. Gratis-Kontingent-Zählung). Feldnamen-Anpassung:
> `lz.revisionMessages`/`m.role` (data.js) → `lz.revisionen`/`m.rolle`
> (Server). `getLernzettel()` in `api.js` bekam `mitUpdated()` nachgezogen
> (fehlte bisher — `.updated` für die Kopfzeile). Kein `id`-Fallback über
> eine Bulk-Route wie bei `klausuren.html`, sondern über die ungefilterte
> `GET /lernzettel` (schon nach `aktualisiertAm desc` sortiert) — `[0]` ist
> automatisch der zuletzt bearbeitete. Ungültige/fehlende id → zurück aufs
> Dashboard (gleiches Muster wie `testklausur.html`). `send()` sperrt
> Eingabefeld+Button während des echten KI-Calls (kein Duplicate-Submit),
> Fehler landen als Toast. Live durchgespielt: Lernzettel per `POST
> /themen/:id/lernzettel` erzeugt, Seite geladen (Titel/Inhalt/Fach-Badge
> korrekt), eine echte Revision gesendet — Nutzernachricht + KI-Antwort im
> Thread, Gratis-Zähler korrekt von "10 von 10" auf "9 von 10" runter.
>
> _2026-09-12: **`dateien.html` als dreizehnte Seite umgestellt.** Nutzt
> denselben echten Upload+Polling-Pfad wie `thema.html`
> (`Lesify.uploadDatei()` + `Lesify.pollDateiStatus()`), aber mit Fach/Thema
> frei wählbar über das Zuordnungs-Modal statt fest vorgegeben — Fach-/
> Themen-Selects nutzen jetzt `_faecherCache()`/`themenFuerFach()` wie
> `chat.html`s Picker. Client-seitige MIME-aus-Dateiendung-Heuristik und
> manuelle `groesse`-String-Berechnung entfallen (Server erkennt den
> echten Typ, `mitDateiForm()` formatiert die Größe). **Nebenbei
> gefundener, seitenübergreifender Bug:** die geteilte
> `openDateiModal()` (app.js, von der globalen Klick-Delegation auf
> `[data-datei-id]` ausgelöst — betrifft auch `thema.html`s Dateien-Tab)
> rief `Lesify.getDatei()` noch **synchron** auf, obwohl das in `api.js`
> ein Promise liefert — hätte beim Öffnen eine leere/kaputte Datei-Vorschau
> gezeigt statt eines Fehlers (Promise hat kein `.themaId`/`.status` etc.,
> alle Felder wären `undefined` gewesen). Fix: Thenable-Check wie bei
> `themaCard()`/`klausurNoteBox()`, Rendering in neue `renderDateiModal(d)`
> ausgelagert. Zweiter Fund in derselben Funktion: der Download-Button rief
> `Lesify.downloadText()` auf, das es nur in `data.js` gibt — Fallback auf
> lokalen Blob-Download, wenn die Funktion fehlt (das Dokument wird ohnehin
> nur aus bereits geladenen Feldern zusammengesetzt, kein Server-Roundtrip
> nötig). Live durchgespielt: echter PNG-Upload mit frei gewähltem
> Fach/Thema, Polling bis "bereit", Datei-Modal geöffnet (zeigt jetzt
> korrekt Fach/Thema/Größe/Status/Zusammenfassung), Download-Button ohne
> Fehler ausgelöst, Grid-/Listenansicht-Umschalter geprüft.
>
> _2026-09-12: **`suche.html` als vierzehnte Seite umgestellt.** Die
> client-seitige `searchAll()` (app.js) durchsuchte sechs `Lesify.*`-Listen
> synchron — unter `api.js` alles Promises, ein sync-Reindex ist nicht mehr
> möglich. `dashboard.html` hatte das bei seiner eigenen Umstellung bereits
> gelöst: `Lesify.suche(q)` ruft echt `GET /suche` (serverseitiges
> ILIKE über alle Typen, dieselbe `{type,label,icon,items}`-Form)
> — `suche.html` übernimmt jetzt dasselbe Muster (inkl. `anfrageN`-
> Race-Guard gegen veraltete Antworten bei schnellem Tippen). Da
> `searchAll()` danach von KEINER Seite mehr aufgerufen wurde, komplett
> aus `app.js` entfernt (toter Code). **Nebenbei gefundener,
> seitenübergreifender Bug (betraf `dashboard.html`s bereits laufende
> Schnellsuche mit):** `GET /suche`s Gruppen-`icon`-Werte
> (`fach`/`thema`/`chat`/`lernzettel`/`datei`/`klausur`/`testklausur`) sind
> Entity-Namen, keine `Icons`-Schlüssel — `searchRow()` fiel für alles außer
> „chat" auf das generische Lupen-Icon zurück. Neue `SEARCH_ICON_MAP` in
> `app.js` übersetzt korrekt. Live geprüft: `suche.html?q=Bruch` zeigt drei
> Gruppen (Themen/Klausuren/Testklausuren) mit korrekten, unterscheidbaren
> Icons; dieselbe Prüfung auf `dashboard.html`s Dropdown-Schnellsuche zeigt
> jetzt ebenfalls die richtigen Icons statt durchgehend der Lupe.
>
> _2026-09-12: **`einstellungen.html` als fünfzehnte Seite umgestellt —
> mehrere Konzept-Differenzen zwischen Prototyp und echtem Backend
> aufgedeckt.** (1) Feldnamen: `settings.ki_tonfall` → `kiTonfall`
> (camelCase, Server-Konvention). (2) **„Dunkles Design" hat serverseitig
> gar kein Feld** — `Einstellungen`-Zod-Schema kennt nur
> `erinnerungVorKlausuren`/`woechentlicheZusammenfassung`/`kiTonfall`; ein
> `darkMode`-Patch wäre serverseitig verworfen worden (oder hätte bei
> alleinigem Feld die „nichts zu ändern"-Validierung ausgelöst). Als reine
> Geräte-Einstellung neu gelöst: eigener `localStorage`-Key
> `lesify:darkmode` (`'1'`/`'0'`), unabhängig vom Account — dafür das
> Boot-Skript im `<head>` **aller 20 `app/*.html`-Seiten** (nicht nur
> konvertierte) von `localStorage['lesify_db_v2'].settingsOverride.darkMode`
> (data.js-Store, unter api.js nie befüllt) auf den neuen Key umgestellt.
> **Dabei zweiten, gravierenderen Bug gefunden:** `applyTheme()` (app.js,
> läuft auf JEDER Seite beim Boot) rief `Lesify.getSettings().darkMode`
> **synchron** auf — unter `api.js` ein Promise, `.darkMode` also immer
> `undefined` → `applyTheme()` hat das dunkle Design auf **jeder bereits
> umgestellten Seite** beim Laden automatisch wieder abgeschaltet, ohne
> Fehler (stiller Bug seit `dashboard.html`s Umstellung, nie aufgefallen,
> weil Dark Mode nie visuell geprüft wurde). Fix: `applyTheme()` liest jetzt
> direkt aus `localStorage['lesify:darkmode']`, unabhängig von `Lesify.*`.
> (3) **„Ansicht" (Schüler ⇄ Eltern-Bereich) komplett entfernt** — hatte im
> Prototyp einen freien Rollen-Umschalter, aber es gibt keinen echten
> Endpunkt, mit dem ein Schüler-Konto sich selbst zum Elternteil macht (das
> ist bei der Registrierung fest und ändert sich nur über echte
> Eltern-Kind-Konten, siehe `abo/kinder`); die Sidebar/Chip-Verzweigung
> (`user.rolle === 'elternteil'`) in `renderChrome()` liest ohnehin schon
> direkt vom Account, unabhängig von diesem Schalter — bestätigt, dass der
> Schalter für „Live-Betrieb" nie gebraucht wurde. (4) **Tarif ist jetzt
> echt**: `Lesify.getAbo()`/`Lesify.aendernAbo({paket})` statt
> Prototyp-`Lesify.plan()`/`setPlan()` — Karte blendet sich aus, wenn der
> User (noch) kein Abo hat (`GET /abo` 404, z. B. vor Checkout-Abschluss).
> `updateUser()` in `api.js` übersetzt `{name, klasse}` → `{name,
> klassenstufe}` fürs Backend und spiegelt `.klasse`/`.initials` in der
> Antwort zurück (fehlte bisher). Live durchgespielt: Profil gespeichert,
> Erinnerung/Zusammenfassung/Tonfall-Toggles persistiert (`PATCH
> /user/einstellungen` mit korrekten Feldnamen bestätigt), Dark Mode An/Aus
> geprüft — hält jetzt tatsächlich über einen Seitenwechsel (`dashboard.html`
> lädt dunkel), Tarifwechsel Starter → Premium mit echtem `PATCH /abo`
> aktualisiert sowohl Kontingent-Text als auch die Nutzungsbalken sofort.
>
> _2026-09-13: **`eltern.html` + `eltern-kinder.html` + `eltern-kind.html` +
> `eltern-abo.html` + `eltern-datenschutz.html` umgestellt — die letzten
> fünf Seiten, Phase 11 damit vollständig abgeschlossen.** Blockiert war das
> zuvor an fünf Produktentscheidungen (Aktivitäts-Ampel, „Eingeladen"-Status,
> „letzte Aktivität", Kind-Avatar-Farbe, Abo-Reaktivierung) — alle vom
> Nutzer beantwortet, siehe „Was jetzt noch von dir gebraucht wird" oben.
> **Backend-Ergänzungen:** `POST /abo/reaktivieren` (neu, hebt Kündigung/
> Pause auf) + `ZahlungsGateway.subscriptionReaktivieren()` (Fake: No-op;
> Stripe: `cancel_at_period_end=false` + `pause_collection=null`) — nur von
> `gekuendigt`/`pausiert` aus möglich, sonst `409
> abo_nicht_reaktivierbar`. `GET /abo/kinder` liefert jetzt `eingeladen:
> boolean` (aus `!!email`). `GET /abo/kinder/:id/zusammenfassung` liefert
> zusätzlich `faecherListe` (`{name, farbe, themen}[]`) und
> `anstehendeKlausurenListe` (`{fach, datum}[]`) — reine Metadaten, kein
> Chat-/Lernzettel-Inhalt, wie schon in der Kartentext-Zusicherung auf
> `eltern-datenschutz.html` versprochen; `eltern-kind.html` hatte diese
> Listen schon im Prototyp erwartet, der Endpunkt lieferte sie nur nie.
> `userDTO()` bekam `einwilligungAm` (fehlte, aber `eltern-datenschutz.html`
> zeigt es an). **`auth-gate.js`-Bug gefunden:** die Rollen-/Familie-Weiche
> erkannte nur `eltern.html` als Eltern-Seite (`hier === 'eltern.html'`) —
> ein Schüler-Account, der direkt auf `eltern-kinder.html` o. Ä. navigiert,
> wäre nicht abgefangen worden. Fix: `hier.indexOf('eltern-') === 0`
> zusätzlich geprüft, deckt jetzt alle fünf Seiten ab. Die
> Prototyp-Rollen-Umschalter (`Lesify.istElternteil()`-Gate-Karte auf
> `eltern.html` mit „Als Elternteil-Ansicht testen"-Button,
> `Lesify.setRolle`) sind komplett entfernt — `auth-gate.js` übernimmt das
> jetzt allein, echte Konten können die Rolle ohnehin nicht selbst wechseln.
> Kind-Avatar-Farbe: neue `Lesify.getKindColor(kindId)` in `api.js`
> (deterministischer Hash in `FACH_COLORS`), ersetzt den manuellen
> Farb-Picker im „Kind hinzufügen"-Modal. **„Benachrichtigungen"-Modal pro
> Kind entfernt** (`erinnerungVorKlausuren`/`woechentlicheZusammenfassung`
> je Kind) — es gibt keinen Endpunkt, über den ein Elternkonto die
> `Einstellungen` eines Kindes fernsteuert, und die Toggles waren im
> Prototyp selbst schon als „nur gemerkt, wirkt erst mit E-Mail-Versand"
> deklariert; kein Funktionsverlust. **„Als Kind ansehen" jetzt ein echter
> Kontextwechsel:** `Lesify.kinderSitzung(id)` → `Lesify._setToken(token)` →
> Redirect auf `dashboard.html`, live mit echten Kind-Daten geprüft (Chat +
> Klausur, die das Kind zuvor selbst angelegt hatte, erschienen korrekt).
> **„Daten exportieren"/„Familienkonto löschen" auf `eltern-datenschutz.html`
> von Fake-Toasts auf echte Endpunkte umgestellt** — `GET /user/export` per
> `fetch`+Blob-Download (kein `?token=`-Fallback, gleiches Muster wie
> `lernplan-lernzettel.html`/`testklausur.html`), `POST /user/loeschen`
> jetzt mit echter Passwort-Bestätigung statt „LÖSCHEN" eintippen (neue
> `Lesify.loeschenKonto(passwort)` in `api.js`). **Nebenbei gefundener,
> zweiter `formatDatum`-Bug** (gleiche Ursache wie `usage().resetDatum` bei
> `chat.html`): `userDTO().einwilligungAm` kommt als volles ISO-Datetime,
> zeigte „NaN. undefined NaN" — Fix in `getUser()`: auf die ersten 10
> Zeichen gekürzt. **Weiterer, unabhängig gefundener Bug in
> `eltern-abo.html`:** die Status-Anzeige kannte nur `aktiv`/`gekuendigt`/
> `pausiert` aus dem Prototyp, das echte `AboStatus`-Enum hat zusätzlich
> `test` (Trial) und `zahlung_offen` — ein Trial-Abo zeigte den Chip
> „Aktiv", aber den Button „Abo reaktivieren" (der nur bei gekündigt/
> pausiert erscheinen soll) — Live-Test deckte den Widerspruch sofort auf.
> Fix: vollständige `statusMap` + `laeuft`-Flag
> (`aktiv`/`test`/`zahlung_offen`) für die Button-Logik. Auch der
> geteilte `modal()`-Helfer (in allen fünf Seiten dupliziert) brauchte
> einen Fix: er behandelte `onConfirm(scrim)` bisher synchron
> (`!== false` schließt sofort) — mit den jetzt async gewordenen
> Bestätigungs-Callbacks (`await Lesify.…`) wäre das Modal immer sofort
> geschlossen worden, auch bei einem Validierungsfehler nach einem
> `await`. Fix: Promise-Erkennung, schließt erst nach Auflösung.
> **Zwei weitere Bugs beim Live-Testen des „Als Kind ansehen"-Kontextwechsels
> gefunden:** (3) `istElternAnsicht()` (app.js, entscheidet ob die Sidebar
> die Eltern- oder Schüler-Navigation zeigt) rief `Lesify.istElternteil()`
> auf — eine reine data.js-Funktion, unter `api.js` schlicht `undefined` →
> jede der fünf Eltern-Seiten hätte die **falsche** (Schüler-)Sidebar
> gezeigt, mit Links auf Fächer/Klausuren statt Kinder/Abo/Datenschutz.
> Fix: unter `api.js` entscheidet der Seitenname selbst (`eltern.html`
> oder `eltern-`-Präfix) — `auth-gate.js` hat vorher ohnehin schon
> sichergestellt, dass nur ein echtes Elternkonto mit Familien-Abo hier
> landet. (4) **Der Kontextwechsel selbst war unvollständig:**
> `Lesify.kinderSitzung()` ersetzt das Token direkt — ohne das Eltern-Token
> vorher zu sichern, hätte ein Elternteil nach „Als Kind ansehen" **keinen
> Weg zurück** außer komplettem Neu-Login (das alte „Elternmodus"-Banner
> mit „Zurück zum Elternkonto" aus dem Prototyp hatte unter `api.js` gar
> keine Grundlage mehr, da es an `Lesify.elternModus()`/
> `zurueckZumElternkonto()`, ebenfalls reine data.js-Funktionen, hing).
> Fix: neue `Lesify.startElternModus(kindToken)` (merkt das Eltern-Token in
> `localStorage['lesify:elternToken']`, bevor gewechselt wird) +
> `Lesify.beendeElternModus()` (stellt es wieder her) in `api.js`;
> `renderElternBanner()` in `app.js` unterstützt jetzt beide Welten
> (data.js sync, api.js via `Lesify.getUser()` fürs Kind-Namen-Anzeigen).
> Live durchgespielt: Banner erscheint korrekt mit echtem Kind-Namen,
> „Zurück zum Elternkonto" stellt den Eltern-Zugriff vollständig wieder her
> (Sidebar zeigt wieder die Eltern-Navigation, `eltern.html` lädt mit den
> richtigen Familien-Daten). Beide Fixes mussten wegen eines hartnäckigen
> Browser-Cache-Artefakts im Testwerkzeug über `127.0.0.1` statt `localhost`
> verifiziert werden (gleicher Server, andere Origin, damit ein frischer
> `app.js` geladen wird) — kein Hinweis auf ein echtes Produktionsproblem.
> Live komplett durchgespielt (echtes Familien-Abo, 2 Kinder, ein Kind mit
> eigenem Fach/Thema/Chat/Klausur): `eltern.html` zeigt korrekte
> Familien-Summen ohne Ampel **mit korrekter Eltern-Sidebar**,
> `eltern-kinder.html` Einladung senden + vollständiger Kontextwechsel
> (hin **und zurück**), `eltern-kind.html` Fächer-/Klausuren-
> Metadatenlisten, `eltern-abo.html` Sitz-Erhöhung + Kündigen +
> Reaktivieren (mit dem oben gefundenen Status-Fix),
> `eltern-datenschutz.html` Export-Download + `Lesify.loeschenKonto()`
> gegen einen separaten Wegwerf-Account verifiziert (echte Löschung, danach
> kontrolliert nicht mehr eingeloggt). Testnutzer jeweils wieder gelöscht.
> Details: `backend-planning.md` §9 „Nachtrag eltern-*.html".

- [x] **API-Client `assets/js/api.js`** — _`Lesify.*`-Namen wie `data.js`, aber
      Promise-basiert; `fetch`-Wrapper mit Bearer-Token
      (`localStorage['lesify:token']`), Basis-URL `window.LESIFY_API_BASE`,
      normalisierter `ApiError` + `Lesify.fehlerText()`, `pollDateiStatus()`,
      `dateiInhaltUrl()`/`*DokumentUrl()`. Mapping-Liste aus §9 abgedeckt._
- [x] **Auth-Gate `assets/js/auth-gate.js`** — _ohne Token bzw. bei fehlschlagendem
      `GET /auth/me` → `location.replace('../marketing/login.html?weiter=…')`._
- [x] **Seiten umstellen (pro Seite):** `data.js`→`api.js`+`auth-gate.js`,
      `Lesify.*`-Aufrufe `await`en, Renderer in `app.js` auf Promises anpassen.
      _Alle 20 `app/*.html`-Seiten fertig + live verifiziert: `dashboard.html`
      + `faecher.html` + `fach.html` + `klausuren.html` + `lernplan.html` +
      `klausur.html` + `lernplan-lernzettel.html` + `thema.html` +
      `themen.html` + `chat.html` + `testklausur.html` + `lernzettel.html` +
      `dateien.html` + `suche.html` + `einstellungen.html` (2026-09-12/13) +
      `eltern.html` + `eltern-kinder.html` + `eltern-kind.html` +
      `eltern-abo.html` + `eltern-datenschutz.html` (2026-09-13, siehe
      Progress-Notiz unten) — **Phase 11 damit vollständig abgeschlossen.**_
- [x] **`assets/js/api.js` — Fächer-/Themen-Cache + reine Helfer nachgezogen**
      — _2026-09-12 (mit `dashboard.html`, siehe Progress-Notiz oben):
      `getFach`/`label` als sync Cache-Lookups, `prozentZuNote`/`noteAmpel`/
      `noteLabel`/`tierLabel`/`klausurVergangen`/`FACH_COLORS`/`getFachColor`/
      `FACH_PRESETS`/`getFachIconSvg`/`relativeTime` gespiegelt/ergänzt,
      `getUser()` um `.klasse`/`.initials` erweitert. Nicht Teil des
      ursprünglichen Phase-11-Plans, aber Voraussetzung dafür, dass die
      geteilten `app.js`-Renderer (badge/fachColorVars/…) unter api.js
      überhaupt funktionieren._
- [x] **`GET /lernzettel(?themaId=)`** (neue Route) — _2026-09-12: fehlte für
      Feeds/Übersichten (z. B. Dashboard „Zuletzt bearbeitet") — vorher gab es
      nur `GET /lernzettel/:id`. `api/src/routes/lernzettel.ts`,
      `Lesify.lernzettel(themaId)` in `api.js`. Test in `ki.test.ts`._
- [x] **`GET /suche`-Bugfix: relative statt absolute `href`s** — _2026-09-12:
      `/fach.html?id=…` → `fach.html?id=…` (+ `chat`/`dateien`-Links an die
      echten Query-Parameter angeglichen, die `chat.html`/`thema.html` schon
      aus dem client-seitigen `searchAll()` kennen). Wäre in Produktion
      (App unter `/app/`) auf die falsche Seite gesprungen. Test in
      `kern.test.ts`._
- [x] **Marketing-Formulare verdrahten** — _2026-09-12: `login/`, `registrieren/`,
      `passwort-vergessen/` (+ neue Seite `passwort-zuruecksetzen/`) und `kontakt/`
      rufen jetzt echt `POST /auth/login`/`registrieren`/`passwort-vergessen`/
      `passwort-zuruecksetzen`/`POST /kontakt` (neues, eigenständiges
      `marketing/assets/js/auth-forms.js`, gleicher Ansatz wie `checkout.js`).
      Registrieren loggt danach automatisch ein und leitet zu `checkout/`
      weiter (Registrierung selbst liefert kein Token). Kontakt hat jetzt ein
      Honeypot-Feld. Dabei **CORS in der API nachgerüstet** (`@fastify/cors`,
      `api/src/lib/cors.ts`) — ohne die fehlte das komplett und jeder
      Cross-Origin-Request (Marketing ≠ API-Origin) wäre im Browser
      gescheitert; dev/test erlauben jeden Origin, production nur
      `CORS_ORIGINS` (fail-closed ohne die Variable → **Phase 16: setzen**).
      End-to-End gegen die echte Supabase-DB durchgeklickt (Registrieren →
      Auto-Login → Checkout-Redirect, Login-Rollen-Weiche, Kontakt, Passwort
      vergessen → Dev-Reset-Link → neues Passwort → Login damit — alles
      geprüft, Test-User danach wieder gelöscht). Tests: `api/src/lib/
      cors.test.ts` (5) + `api/src/app.test.ts` (2)._
- [x] **Fehler-/Ladezustände + Guard-Popups:** _erledigt für alle 15
      umgestellten Seiten (2026-09-12/13) — `Lesify.fehlerText(err)` als Toast
      bei Limit/Datei-zu-groß/nicht-schulrelevant/Spam/Rate-Limit/allgemeinen
      Fehlern, konsequent in `chat.html`, `testklausur.html`,
      `lernzettel.html`, `dateien.html`, `einstellungen.html` (die Seiten mit
      echten Mutations-Aufrufen). „Offline" (kein Netz) ist kein eigener
      Fehlercode — `fetch()` wirft dann direkt, landet aber im selben
      catch-Pfad und zeigt den generischen Fallback-Toast._
- [x] **Datei-Viewer** auf `Lesify.dateiInhaltUrl(id)` + `pollDateiStatus`
      (`verarbeitung`→`bereit` ohne Reload) statt `.txt`-Ersatz. _2026-09-14:
      `openDateiModal()` zeigt echte Bild-/PDF-Vorschau über `dateiInhaltUrl`;
      `renderDateiModal()` pollt jetzt zusätzlich mit `Lesify.pollDateiStatus`,
      solange die geöffnete Datei `status: 'verarbeitung'` hat — Status-Zeile
      + KI-Zusammenfassung aktualisieren sich live. Details siehe Abschnitt 7
      oben._
- [x] **Abo-/Einstellungs-Bereich in der App (Teil, 2026-09-12):**
      `getAbo`/`aendernAbo` + Nutzungsring in `einstellungen.html` fertig
      (siehe Phase-11-Progress-Notiz). `kuendigenAbo`/`pausierenAbo`/`kinder`/
      `addKind`/`removeKind` bleiben offen — die betreffen nur den
      Eltern-Bereich (`eltern-abo.html`/`eltern-kinder.html`), siehe „Was von
      dir gebraucht wird" oben.
- [x] **Dev-Switcher entfernt** (2026-09-14) — Suche final auf „Kachel",
      Testklausur-Phasen-Umschalter komplett raus, dazu der bisher nicht
      gelistete Über-uns-Hero-Umschalter final auf v2. Details siehe
      Abschnitt 7 oben.
- [ ] **Seed-Parität prüfen:** angebundene App auf `staging` == Prototyp mit
      `SEED`. _Braucht ein laufendes `staging` (Phase 16) — noch nicht
      erreichbar._

---

## Phase 12 — Familien-/Eltern-Features

> _2026-09-04: Backend umgesetzt (`api/src/routes/abo.ts` + Job
> `abo-geplante-aenderungen`). Migration `abo_geplante_sitze`. Tests in
> `api/src/routes/abo.test.ts` (Describe „Eltern-Features Phase 12", 5)._
>
> _2026-09-08: Eltern-Oberfläche als Prototyp umgesetzt (Plan
> `Konzept-texts/eltern-zugang-plan.md`) — auf `data.js`/`app.js` wie der Rest
> der App, nicht abhängig vom Phase-11-Cut-over. Neue Seite `app/eltern.html`,
> Familien-Modell in `data.js`, Eltern-Nav-Variante + „Elternmodus"-Banner in
> `app.js`, Dev-Ansichtsumschalter auf `einstellungen.html`. Die drei
> `api.js`-Wrapper + die `auth-gate.js`-Rollenweiche sind für den späteren
> Cut-over ebenfalls fertig verdrahtet._
>
> _2026-09-13: **Cut-over auf `api.js` abgeschlossen** (Phase 11, siehe
> Progress-Notiz dort) — alle fünf Eltern-Seiten laufen jetzt gegen die
> echte API statt `data.js`. Dabei `POST /abo/reaktivieren` ergänzt,
> `GET /abo/kinder` um `eingeladen` und `GET /abo/kinder/:id/
> zusammenfassung` um `faecherListe`/`anstehendeKlausurenListe` erweitert.
> Der Prototyp-Rollen-Umschalter ist komplett entfernt, `auth-gate.js`
> steuert die Rolle jetzt ausschließlich selbst._

- [x] **Kind-Profil-Anlage & -Einladung** — _Direktanlage: `POST /abo/kinder`
      (Phase 9). Einladung: `POST /abo/kinder/:id/einladung {email}` setzt E-Mail
      + `emailVerifiedAt` und gibt einen Passwort-Token aus; das Kind aktiviert
      sich über `POST /auth/passwort-zuruecksetzen`. Deckel weiter `Abo.sitze`._
- [x] **Kontext-Wechsel:** _`POST /abo/kinder/:id/sitzung` → echte `Session`
      fürs Kind-Profil (`{token}`). Das Elternkonto nutzt dieses Token und
      arbeitet voll im `userId`-Scope des Kindes; Zurückwechseln = eigenes
      Token. UI-Umschalter: seit 2026-09-13 live in `eltern-kinder.html`/
      `eltern-kind.html` (`Lesify.kinderSitzung()` → `Lesify._setToken()`)._
- [x] **Eltern-Zusammenfassung:** _`GET /abo/kinder/:id/zusammenfassung` —
      Fächer, Themen, Chats/Nachrichten der Woche, Lernzettel, Testklausuren der
      Woche, anstehende Klausuren. **Kein Chat-Wortlaut.** Dediziertes
      Kind-Opt-out → Phase 17._
- [x] **Sitz-Änderungen:** _Hinzufügen sofort (`PATCH /abo` Erhöhung, Proration).
      Entfernen: `PATCH /abo` merkt `geplanteSitze`; Elternkonto entfernt dann
      Kind-Profile (`DELETE /abo/kinder/:id` → Cascade-Löschung der Inhalte);
      Job `abo-geplante-aenderungen` senkt `Abo.sitze` zum `aktuellerZeitraumEnde`,
      sobald `belegt <= geplanteSitze`._

- [x] **UI-Aufbau (Prototyp — Plan: `Konzept-texts/eltern-zugang-plan.md`,
      2026-09-08):** Eltern-Bereich als Prototyp auf `data.js`/`app.js` gebaut
      (nicht abhängig vom Phase-11-Cut-over).
  - [x] `app/assets/js/api.js`: Wrapper `kinderEinladung`, `kinderSitzung`,
        `kinderZusammenfassung` ergänzt (für den späteren Cut-over).
  - [x] `app/assets/js/auth-gate.js`: Rollen-/Familie-Weiche (nur
        `rolle=elternteil` **mit** vorhandenen Kind-Profilen geht in den
        Eltern-Bereich; Solo-Elternkonto bleibt wie ein Schüler-Account;
        Schüler auf `eltern.html` → zurück aufs Dashboard). Greift im
        `api.js`-Modus.
  - [x] Neue Seite `app/eltern.html`: Kinder-Übersicht mit ausklappbaren
        Karten (Wochen-Kennzahlen aus `kindZusammenfassung`, ohne Chat-/
        Lernzettel-Inhalt/Noten), Kind anlegen/einladen/entfernen,
        Benachrichtigungs-Toggles je Kind, Datenschutz-Karte.
  - [x] Kontext-Wechsel „Als Kind ansehen": `store.elternModus` +
        `Lesify.wechsleZuKind/zurueckZumElternkonto`; „Elternmodus"-Banner
        auf jeder Schüler-Seite (`app.js` → `renderElternBanner`).
  - [x] Abo-/Sitzverwaltung in `eltern.html` (`#abo`): Tarif, Intervall,
        Sitz-Stepper (2–4, min = belegte Plätze), Status
        (aktiv/gekündigt/Sommerpause). `data.js`: `Lesify.setFamilieSitze`,
        `Lesify.setAboStatus`.
  - [x] Doku: `backend-planning.md` §8 „Eltern-Kind-Modell" +
        „Familien-Abo-Sichtbarkeit" + „Kontext-Wechsel" als entschieden
        (2026-09-08), §9-Mapping + §10-Dev-Switcher nachgezogen; `app/README.md`.
  - [x] **Redesign auf vier Seiten (2026-09-12):** `eltern.html` (Übersicht:
        Familien-Kennzahlen, Kind-Kurzkarten, Datenschutz-Vertrauenshinweis),
        `eltern-kinder.html` (Kind-Verwaltung, die bisherige `<details>`-Liste),
        `eltern-kind.html?id=…` (**neu**: Wochen-Kennzahlen + Fächer-Liste +
        anstehende Klausuren je Kind, aus neuen `data.js`-Feldern
        `woche.faecherListe`/`.anstehendeKlausurenListe` — Metadaten, kein
        neuer Content-Zugriff), `eltern-abo.html`, `eltern-datenschutz.html`.
        `ELTERN_NAV_ITEMS` in `app.js` verlinkt jetzt echte Seiten statt
        `eltern.html#anker`. Seiten-lokales CSS aus der alten `eltern.html`
        nach `style.css` verschoben (mehrere Seiten brauchen es jetzt).
        `Konzept-texts/eltern-zugang-plan.md` (§1/§3/§5) und
        `backend-planning.md` §4/§8 nachgezogen.
  - [x] `marketing/login.html`: Redirect-Weiche nach Rolle/Familie — _2026-09-12:
        mit der echten Login-Anbindung (Phase 11) erledigt. Spiegelt
        `auth-gate.js` 1:1 (`GET /abo/kinder` nach Login → Elternteil mit
        Kind-Profilen zu `/app/eltern.html`, sonst `/app/dashboard.html`;
        respektiert `?weiter=<seite>.html`, falls vorhanden)._

---

## Phase 13 — Recht, Datenschutz, Jugendschutz

Kritisch, weil Zielgruppe minderjährig ist.

> _2026-09-04: die **technischen** Bausteine stehen. Was echte Menschen tun
> müssen (Texte schreiben, Verträge abschließen, juristische Prüfung), bleibt
> offen und ist in der Schlussliste gesammelt._

- [ ] **Impressum / Datenschutzerklärung / AGB** mit echten Angaben füllen
      (`marketing/impressum.html`, `datenschutz.html`, `agb.html`) — rechtlich
      prüfen lassen. _Textarbeit + Anwalt, kein Code._
- [ ] **Auftragsverarbeitung mit Anthropic** + Sub-Prozessoren (Supabase, Stripe,
      Hoster) abschließen und ins Verarbeitungsverzeichnis. _Vertragsarbeit._
- [x] **Eltern-/Minderjährigen-Einwilligung im Registrierungsflow** —
      _`POST /auth/registrieren` verlangt `einwilligung: true` (sonst `400`),
      speichert `User.einwilligungAm` als Nachweis. Migration `user_einwilligung`.
      Test in `auth.test.ts`. Die Checkbox + der erklärende Text kommen mit dem
      Formular-Cut-over (Phase 11)._
- [x] **Datenexport & Konto-Löschung (DSGVO Art. 15/17)** — _`GET /user/export`
      (voller JSON-Dump ohne `passwordHash`, Download-Header),
      `POST /user/loeschen` (`{passwort}` bestätigt → harte Cascade-Löschung,
      bei `elternteil` inkl. Kind-Profile). Objektspeicher-Dateien werden seit
      Phase 5 (2026-09-05) vor der Cascade-Löschung eingesammelt und danach
      best effort aus dem Bucket entfernt. Tests in `dsgvo.test.ts`.
      UI-Buttons: Phase 11._
- [x] **Cookie-/Consent-Banner** — _entfällt: kein Tracking, keine
      nicht-essenziellen Cookies → kein Banner nötig. Bei späterem Tracking neu
      bewerten._
- [x] **1-Jahres-Löschung** — _Job `inhalte-aufbewahrung` (Phase 10). Die Frist
      steht bereits sichtbar in `app/einstellungen.html` („Daten & Aufbewahrung",
      Phase 0) und muss in der Datenschutzerklärung genannt werden (siehe oben)._
- [x] **KI-Nutzungshinweis** für Schüler:innen/Eltern (Antworten können falsch
      sein, keine Leistungsbewertung durch die Schule). _Umgesetzt 2026-09-14
      in `chat.html` (Composer-Hinweis) + `testklausur.html` (unter der
      eingefrorenen Note) — siehe Abschnitt 3 oben._

---

## Phase 14 — Qualitätssicherung

> _2026-09-04: `docs/QS-CHECKLISTE.md` angelegt (Test-Status, E2E-Flow,
> Sicherheitsreview, Lasttest-Ziele, A11y, Fehler-Budget). Automatisierte
> Abdeckung deutlich ausgebaut (shared 52 + api 91 Tests)._

- [x] **Unit-Tests** für alle reinen Berechnungen — _`shared/` 52 Tests
      (Notenformel + Paritäts-Fixtures, `lernplanStatus`, Checklist-Keys,
      Usage-Ratio/Stufe, Abo-Preise)._
- [x] **API-Integrationstests** je Endpunkt — _Auth, Kern-CRUD, Chats/Klausuren/
      Lernplan, Usage-Limits, Abo/Stripe-Fake + Eltern-Features, Jobs, DSGVO,
      **plus dediziertes `scoping.test.ts`** (B sieht/ändert A nie). Datei- (P5)
      + KI-Endpunkte (P6) folgen mit ihren Phasen._
- [ ] **End-to-End-Test der Kern-Flows gegen `staging`** — _Checkliste in
      `docs/QS-CHECKLISTE.md` §2; braucht laufendes `staging` (Phase 16)._
- [ ] **KI-Calls mit aufgezeichneten Fixtures** — _Phase 6._
- [ ] **Lasttest** der teuren Pfade — _Ziele in `docs/QS-CHECKLISTE.md` §4;
      braucht `staging` + echte KI._
- [x] **Sicherheitsreview (Stand-Tabelle)** — _`docs/QS-CHECKLISTE.md` §3: Auth,
      Scoping (getestet), Injection, Secrets, Webhook-HMAC (Phase 9,
      2026-09-12), CORS (Phase 11, 2026-09-12), signierte URLs/Upload-
      Validierung (Phase 5), KI-Guard (Phase 6) ✅; API-Security-Header
      (2026-09-16, siehe unten) ✅; Security-Header für `app/`+`marketing/`
      bleibt offen — **blockiert von GitHub Pages** (kein Custom-Header-
      Support), lösbar erst mit dem echten Hosting-Wechsel (Phase 16)._
- [ ] **Barrierefreiheit & Responsiveness** (statischer Audit erledigt
      2026-09-16, Rest offen) — _Checkliste `docs/QS-CHECKLISTE.md` §5.
      Statischer Code-Audit + Fixes: fehlende Formularfeld-Labels ergänzt
      (`aria-label`/`aria-labelledby`, 8 Stellen über `app/`), Toasts
      bekommen `role="status"`/`aria-live="polite"` (`app.js`/
      `marketing.js`), alle dynamisch erzeugten `.modal-scrim`-Dialoge
      bekommen jetzt zentral über einen `MutationObserver` in `initModals()`
      (`app.js`) `role="dialog"`/`aria-modal="true"`/`aria-labelledby` +
      Anfangsfokus, statt jede der ~10 Erzeugungsstellen einzeln zu patchen.
      `<img>`-Alt-Texte, `:focus-visible`- und `prefers-reduced-motion`-
      Abdeckung waren im Audit bereits vollständig. Live gegen den Dev-Stack
      verifiziert. **Noch offen:** WCAG-AA-Kontrastprüfung (Dark-Mode-Audit
      aus Phase 0 war informell, nicht gegen AA-Werte gerechnet), formaler
      Screenreader-Durchgang mit echtem VoiceOver/NVDA, Mobile-Breakpoint-
      Durchgang bis ~360px._
- [x] **Fehler-Budget definiert** — _`docs/QS-CHECKLISTE.md` §6 (Launch-Blocker
      vs. Post-Launch-Fix)._

---

## Phase 15 — Betrieb & Observability

> _2026-09-04: die App-seitigen Bausteine sind drin (`api/src/lib/ratelimit.ts`,
> pino-Redaction, `/health/*`, `docs/RUNBOOK.md`). Was einen externen Dienst
> braucht (Log-Sink, Error-Tracker, Uptime-Monitor, Backup-Restore-Test) ist
> in Phase 16 / der Schlussliste._

- [x] **Strukturiertes Logging** — _pino-JSON; `redact` entfernt
      `authorization`/`cookie`/`stripe-signature`; Bodys werden nicht geloggt
      (keine Chat-Texte/Passwörter). Log-Sink = Phase 16._
- [ ] **Error-Tracking** (Backend + Frontend) mit Alerting — _zentraler
      `setErrorHandler` loggt strukturiert; DSN/Provider anschließen in Phase 16._
- [x] **Healthchecks** — _`GET /health/live` (ohne DB), `GET /health` +
      `/health/ready` (inkl. `SELECT 1`, `uptimeSek`). Externer Monitor = Phase 16._
- [ ] **DB-Backups** — _Supabase-Feature aktivieren + Restore einmal echt testen
      (Phase 16 / Schlussliste)._
- [x] **KI-Kosten-Dashboard** (2026-09-16) — _`response.usage` (Phase 6) wird
      pro Call in Euro-Millionsteln umgerechnet (`api/src/lib/ki/kosten.ts`,
      Anthropic-Listenpreise Stand 2026-09, **vor echten Ausgaben
      gegenprüfen**) und in einer neuen Tabelle `KiKosten` je
      Monat/Call-Typ/Modell aggregiert (`protokolliereKiKosten`, aufgerufen
      aus `AnthropicKiClient`s `onUsage`, fire-and-forget, Fehler brechen nie
      den eigentlichen KI-Call). `PLAN_ECONOMICS` (apiKostenMonat/ltv je
      Paket) als Backend-Spiegel von `data.js` neu in `shared/src/index.ts`.
      Neuer Wartungs-Job `ki-kosten-alarm` (`kiKostenAlarmPruefen`) vergleicht
      die bisherigen Monatskosten gegen das aus `PLAN_ECONOMICS` abgeleitete
      Budget (aktive Sitze × geplante API-Kosten/Sitz, auf den Tagesanteil
      hochgerechnet) und loggt `kiKostenAlarm`, wenn Ist > 1,5× Budget.
      Migration `ki_kosten_dashboard` + `ki_kosten_mikro_einheit`. Tests:
      `api/src/lib/ki/kosten.test.ts` (7, inkl. Rundungs-Regressionstest —
      eine Cent-genaue erste Fassung hätte die meisten Einzel-Chats als „0 €"
      gezählt und die Monatssumme unterschätzt). `docs/RUNBOOK.md` +
      Scheduler-Abschnitt (Phase 10 oben) nachgezogen._
- [x] **Rate-Limiting** — _`RateLimiter` als `onRequest`-Hook nach §7:
      auth 10/min·IP, ki 20/min, io 120/min, kontakt 3/min·IP; `/health*` +
      `/abo/webhook` frei. `429` + `Retry-After`. Ad-hoc-Limit in `/kontakt`
      entfernt. Tests `api/src/lib/ratelimit.test.ts` (7). Schlüssel derzeit IP;
      User-Keying/Redis + Kalibrierung nach echtem Traffic offen._
- [x] **Vorab-Filter + Missbrauchssignale** (2026-09-16) — _Vorab-Filter
      (Themen-/Größen-/Spam-Guard) stand bereits seit Phase 6
      (`api/src/lib/ki/guard.ts`). Neu: `MissbrauchsWaechter` — jeder
      Guard-Treffer wird strukturiert geloggt (`missbrauchssignal`); ab 5
      Treffern eines Nutzers in 1 Stunde greift eine 30-minütige temporäre
      Sperre der KI-Funktionen (`429 missbrauch_gesperrt`, unabhängig vom
      IP-Rate-Limiting), geloggt als `missbrauchVerdacht`. In
      `pruefeKiEingabe()` gebündelt. Neuer Fehlercode in
      `app/assets/js/api.js` (`fehlerText`) ergänzt. Tests:
      `api/src/lib/ki/guard.test.ts` (15, 5 neu). `backend-planning.md` §3/§7
      nachgezogen.
- [x] **Runbook** — _`docs/RUNBOOK.md`: KI-Ausfall, Stripe-Ausfall,
      DB-Überlastung, Datenschutz-Anfrage, Rate-Limit-Fehlalarm + Go-Live-Haken._

---

## Phase 16 — Deployment & Go-Live

- [ ] **Domain + DNS + TLS** für App und Marketing (EU-Hosting bestätigt).
      (Teilfortschritt: GitHub-Pages-Hosting für `marketing/`+`app/` steht
      bereits, siehe Phase 0 „Interim-Hosting" — fehlt nur noch die
      Custom-Domain-DNS-Eintragung. `api/` braucht separates Hosting,
      GitHub Pages kann keinen Server ausliefern.)
- [ ] **CI/CD vervollständigen:** Merge auf `main` → Deploy auf `staging`;
      manueller Promote `staging` → `production`. Migrationen laufen automatisch,
      rückrollbar.
- [ ] **Prod-Secrets & -Konfiguration** final setzen (Zahlungsanbieter Live-Keys,
      Anthropic-Prod-Key mit Budget-Limit, E-Mail-Domain verifiziert/SPF/DKIM).
- [ ] **Staging-Vollprobe:** kompletter E2E-Flow inkl. echter Test-Zahlung.
- [ ] **Launch-Checkliste:** Impressum/Datenschutz/AGB live, Kontaktweg
      funktioniert, Reminder-Cron läuft, Backups laufen, Monitoring grün,
      Rollback-Weg dokumentiert.
- [ ] **Soft-Launch** mit kleiner Nutzergruppe, Fehler + KI-Kosten beobachten.
- [ ] **Öffentlicher Launch.**

---

## Phase 17 — Nach dem Launch

- [ ] **KI-Kosten vs. Preis-Modell** über echte Nutzung kalibrieren; Limits/Preise
      in `stripe-config.js` + `backend-planning.md` §7/§8 nachziehen, falls nötig.
- [ ] **Themen-Memory-Verdichtung** aktivieren, sobald Kontexte real zu groß werden
      (nicht vorher).
- [ ] **Suche** auf echten Index heben, falls die Substring-Variante nicht mehr trägt.
- [ ] **Zurückgestellte Themen wieder aufmachen:** Eltern-Kind-Modell, Familien-Sitz-
      Mechanik (Proration/Einladung), Klausur-Erinnerung + Wochenreport-Versand,
      manueller Lernplan-Neustart. (Double-Opt-in-/Reset-Mail-Versand ist seit
      2026-09-17 erledigt, siehe Phase 10.)
- [ ] **Feedback-Schleife** mit Schüler:innen/Eltern; Backlog priorisieren.
- [ ] **`backend-planning.md` bleibt das lebende Dokument** — bei jeder Änderung an
      Datenmodell, Notenlogik, Limits oder Endpunkten zuerst dort einpflegen.
