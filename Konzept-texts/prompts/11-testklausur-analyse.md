# 11 · Testklausur-Analyse (gebündelt)

> Auch genutzt für **Testklausur 2** eines Lernplans (Tag 5) — identischer Call,
> dort nur über die an Tag 1 schwachen/wackeligen Themen. Der Vergleich
> Testklausur 1 ↔ Testklausur 2 ist reine Frontend-Logik (`Lesify.lernplanStatus`),
> kein zusätzlicher KI-Call.

## 1. Zweck & Trigger

Wird ausgelöst, nachdem der Schüler seine Lösung hochgeladen hat — Endpunkt
`POST /testklausuren/:id/analyse` (siehe §4), Status wechselt von `geloest`
zu `analysiert`. Auswertung, Note und Aufgabe-für-Aufgabe-Erklärung passieren
in **einem einzigen, gebündelten Call** (alle Aufgaben zusammen, nicht pro
Aufgabe einzeln). Das strukturierte Weiterlernen übernimmt danach der
7-Tage-Lernplan (Lerntage + verlinkte Chat-Prompts) — dieser Call generiert
**keinen** Nachtest-/Übungsfragen-Pool mehr.

## 2. Input

- Alle `Aufgabe`-Einträge der Testklausur (`frage` + `themaId`, siehe §1),
  in Reihenfolge (`reihenfolge`).
- Der Inhalt der hochgeladenen Lösung (`geloesteDateiId`) — **ein**
  zusammenhängendes Dokument, das Antworten zu **allen** Aufgaben enthält
  (der Schüler löst die Klausur laut `Testklausuren.pdf` „komplett, nicht
  Aufgabe für Aufgabe"). Bei Scans/Fotos: Vision-Input, bei getippten
  Dokumenten: extrahierter Text.
- Pro Thema dasselbe Quellmaterial, das auch für die Aufgabenerstellung
  genutzt wurde (Lernzettel oder Chats + Datei-Zusammenfassungen, siehe
  [10-testklausur-erstellung.md](10-testklausur-erstellung.md)) — nötig,
  damit die Bewertung sich am tatsächlich behandelten Stoff orientiert statt
  an allgemeinem Modellwissen.
- `fachName`, je Thema `themaName`.

## 3. Modell-Anforderung

Hohe Reasoning-Anforderung, zusammen mit
[10-testklausur-erstellung.md](10-testklausur-erstellung.md): Das Modell
muss (a) freie, unstrukturierte Schülerantworten den richtigen Aufgaben
zuordnen, (b) fachlich korrekt und fair bewerten (keine Multiple-Choice-
Prüfung, echte Rechenwege/Argumentationen), und (c) bei Fehlern nachvollziehbar
herleiten, warum etwas falsch ist — alles in einem zusammenhängenden Call mit
hoher interner Konsistenz (z. B. muss die Einschätzung „schwach" konsistent mit
der vergebenen Prozentzahl sein). Kontextlänge: groß, da Aufgaben + Lösung +
Quellmaterial mehrerer Themen gleichzeitig verarbeitet werden, ggf. inkl.
Vision-Input bei gescannten Lösungen. Kosten-/Latenztoleranz: Nutzer erwartet
nach dem Upload explizit einen Warte-/Ladezustand („Lesify wertet deine
Antworten aus", siehe `testklausur.html`), kein Chat-Tempo.

## 4. Parameter-Empfehlung

| Parameter | Empfehlung |
|---|---|
| `max_tokens` | skaliert mit Themenanzahl: ~250 Tokens pro Aufgabe (Bewertung + Erklärung) — z. B. `themenAnzahl × 250 + 200` Tokens Puffer für Struktur |
| Temperatur | niedrig (0.2–0.3) — Bewertung muss konsistent und nachvollziehbar sein, keine kreative Varianz bei der Notengebung |
| Streaming | nein — Ergebnis muss vollständig und valide vorliegen, bevor `TestklausurErgebnis` (eingefroren, siehe §1) persistiert wird |
| Caching | nicht zentral — einmaliger Call pro Testklausur-Analyse; falls dasselbe Quellmaterial kurz zuvor schon für [10-testklausur-erstellung.md](10-testklausur-erstellung.md) verwendet wurde, kann es (falls die verwendete API das unterstützt) über denselben `cache_control`-Mechanismus wiederverwendet werden, ist aber kein Kernbestandteil dieses Prompts |

## 5. System-Prompt

```
Du wertest die Testklausur eines Schülers/einer Schülerin der
{{klassenstufe}} aus. Fach: {{fachName}}. Der Schüler hat die komplette
Klausur eigenständig gelöst und als ein zusammenhängendes Dokument
hochgeladen — du liest es einmal vollständig und wertest alle Aufgaben in
diesem einen Durchgang aus.

Aufgaben dieser Testklausur (in Reihenfolge):
{{#each aufgaben}}
### Aufgabe zu Thema „{{themaName}}"
{{frage}}
Verfügbares Material zu diesem Thema:
{{material}}
{{/each}}

Hochgeladene Lösung:
{{loesungsDokument}}

Vorgehen pro Aufgabe:
1. Ordne den passenden Abschnitt der hochgeladenen Lösung der Aufgabe zu
   (über Nummerierung/Reihenfolge im Dokument). Fehlt eine Antwort
   komplett, werte sie als 0 % (nicht raten, keine Antwort erfinden).
2. Bewerte die Antwort fachlich korrekt anhand des bereitgestellten
   Materials zu diesem Thema — bewerte nur, was tatsächlich behandelt
   wurde, keine darüber hinausgehenden Anforderungen.
3. Vergib eine Prozentzahl (0–100) für die Qualität der Antwort
   (Rechenweg/Argumentation korrekt und vollständig = hoch, grundlegende
   Fehler = niedrig).
4. Schreibe eine Erklärung: Bei richtiger Antwort kurz bestätigen und
   loben, was gut war. Bei Fehlern IMMER herleiten, warum die Antwort
   falsch/unvollständig war und wie man richtig hinkommt — nie nur
   „falsch, richtig wäre X" ohne Begründung. Halte die Erklärung auf 2–4
   Sätze begrenzt, auch bei Fehlern — konkret und nachvollziehbar, aber
   ohne Wiederholung der ganzen Aufgabenstellung.

Wichtig: Gib für jede Aufgabe nur die Prozentzahl zurück, nicht die daraus
abgeleitete Schulnote oder Ampel-Stufe — Note und Ampel (stark/wackelig/schwach)
werden vom Backend nach fester Formel bzw. festen Schwellen abgeleitet, damit
Rundung/Skala garantiert konsistent bleiben. Es werden keine Nachtest-/
Übungsfragen erzeugt.

Antworte ausschließlich über das bereitgestellte Tool.
```

## 6. Output-Format

Strukturierter Output über Tool-Definition. Schreibt nur in `TestklausurErgebnis`
(eingefroren). `Vorbereitungsstand` wird **nicht** vom Modell zurückgegeben — er
entsteht laut §1 als Klon von `TestklausurErgebnis` mit **direkt dreistufig**
vergebener Ampel (`noteAmpel(note)`: ≤2.5 `gruen` · ≤4.0 `gelb` · sonst `rot`;
im Lernplan als stark/wackelig/schwach benannt) und wird deterministisch vom
Backend berechnet, um Rundungs-/Formel-Drift zwischen Modell- und Backend-Note
auszuschließen.

```json
{
  "name": "testklausur_analyse",
  "description": "Bewertung aller Aufgaben einer Testklausur inkl. Erklärung",
  "input_schema": {
    "type": "object",
    "properties": {
      "ergebnisse": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "themaId": { "type": "string" },
            "prozent": { "type": "integer", "minimum": 0, "maximum": 100 },
            "erklaerung": { "type": "string", "description": "Feedback zur Antwort, bei Fehlern immer mit Herleitung des richtigen Wegs" }
          },
          "required": ["themaId", "prozent", "erklaerung"]
        }
      }
    },
    "required": ["ergebnisse"]
  }
}
```

## 7. Beispiel

**Input:** Testklausur zu den Themen „Bruchrechnung" (Aufgabe: „Berechne
5/6 − 1/4 …") und „Prozentrechnung" (Aufgabe zum Fahrradpreis). Der Schüler
hat Bruchrechnung korrekt gelöst, bei Prozentrechnung den Rabattbetrag
falsch vom reduzierten statt vom ursprünglichen Preis berechnet.

**Modell-Output:**

```json
{
  "ergebnisse": [
    { "themaId": "bruchrechnung", "prozent": 95, "erklaerung": "Sehr sauber gelöst: gemeinsamer Nenner 12, 10/12 − 3/12 = 7/12, korrekt gekürzt (nicht weiter kürzbar). Rechenweg vollständig nachvollziehbar." },
    { "themaId": "prozentrechnung", "prozent": 55, "erklaerung": "Der Ansatz stimmt (Prozentwert = Grundwert × Prozentsatz / 100), aber als Grundwert wurde fälschlich der bereits reduzierte Preis genommen. Richtig: Grundwert ist immer der ursprüngliche Preis (320 €), also 320 × 15 / 100 = 48 € Rabatt, neuer Preis 272 €." }
  ]
}
```

**Backend-Berechnung (Formel aus §2), damit Prompt-Output und Notenlogik
nachweislich zusammenpassen:**

```
Bruchrechnung:    note = round(6 − 95/100 × 5, 1) = round(1.25, 1) = 1.3
                  ampel = 1.3 ≤ 2.5 → gruen → „stark"

Prozentrechnung:  note = round(6 − 55/100 × 5, 1) = round(3.25, 1) = 3.3
                  ampel = 2.5 < 3.3 ≤ 4.0 → gelb → „wackelig"
                  → im Lernplan: Testklausur 2 (Tag 5) deckt dieses Thema ab,
                    Tage 2–4 verlinken Chat-Prompts dazu

Gesamtnote der Testklausur (TestklausurErgebnis, Durchschnitt aller Themen):
                  (1.3 + 3.3) / 2 = 2.3

Klausurvorbereitungsnote (Vorbereitungsstand, identisch zur Testklausurnote,
festgelegt bei der Analyse): ebenfalls 2.3, Gesamt-Ampel nach `noteAmpel()`
(§2): 2.3 ≤ 2.5 → gruen für die Klausurvorbereitungs-Karte, obwohl ein
Einzelthema wackelig ist — die Karten-Ampel bewertet die Gesamtnote, die
Pro-Thema-Ampel in `Vorbereitungsstand` bewertet einzeln.
```

## 8. Sokratik-Hinweis

Kein Live-Tutoring — der Schüler hat bereits eigenständig gelöst und
abgegeben, siehe `00-overview.md`. Trotzdem gilt: bei Fehlern wird immer
hergeleitet, warum etwas falsch ist und wie man richtig hinkommt, nie nur
„falsch, richtig wäre X" (siehe Regel 4 im System-Prompt oben).

## 9. Kostenschätzung (Claude Haiku 4.5)

Kein Caching (Einzel-Call pro Analyse). Angenommen: 3 Themen, je ~800
Tokens Material+Aufgabe, Lösungsdokument ~1.500 Tokens, System-Prompt ~300
Tokens. Output: ~200 Tokens Bewertung/Thema.

| Input | Output | ≈ Kosten |
|---|---|---|
| 300 + 3×800 + 1.500 = ~4.200 Tokens | 3×200 = ~600 Tokens | **≈ 0,80 Cent** |

Einer der teureren Calls im Set (zusammen mit
[10-testklausur-erstellung.md](10-testklausur-erstellung.md)), aber auch einer
der seltensten — er läuft einmal pro Testklausur (also 2× pro Lernplan), nicht
pro Nachricht. Testklausur 2 hat weniger Themen und ist entsprechend günstiger.
