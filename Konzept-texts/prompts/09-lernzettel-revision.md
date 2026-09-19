# 09 · Lernzettel-Revision

## 1. Zweck & Trigger

Wird bei **jeder Revisions-Nachricht** zu einem bestehenden Lernzettel
ausgelöst — Endpunkt `POST /lernzettel/:id/revisionen` (siehe §4). Läuft
chat-artig: der Schüler schreibt eine Anweisung („füge ein Beispiel zu X
hinzu", „kürze den Abschnitt zu Y"), die KI passt `content` entsprechend an.
Jede Revisionsnachricht zählt (seit 2026-09-19, kein Gratis-Kontingent mehr) wie
eine normale Chat-Nachricht gegen das Nutzungslimit — das ist reine
Abrechnungslogik im Backend, hat aber keinen Einfluss auf diesen
Prompt-Entwurf selbst.

## 2. Input

- Aktueller `Lernzettel.content` (Markdown, der vollständige Stand vor
  dieser Revision).
- Bisherige `LernzettelRevision`-Einträge (rolle/text) — der
  Revisionsverlauf, damit die KI weiß, was in früheren Runden schon
  besprochen/geändert wurde.
- Aktuelle User-Anweisung (`text`).
- `fachName`, `themaName`, `{{tonfallBaustein}}`.

**Bewusst nicht enthalten:** der volle Themen-Memory-Block
([02-themen-memory.md](02-themen-memory.md)). Eine Revision ist in der
Regel eine gezielte Bearbeitung des bestehenden Dokuments, kein erneutes
Durchforsten aller Chats/Dateien — den vollen Kontext bei jeder
Revisionsnachricht erneut mitzuschicken wäre unnötig teuer. **Erweiterung
(Annahme):** Falls die Anweisung explizit auf Inhalte verweist, die nicht im
aktuellen `content` stehen (z. B. „ergänze das, was wir im Chat zu Z
besprochen haben"), kann das Backend optional die passenden
Datei-/Chat-Ausschnitte gezielt nachladen — als klar markierte Erweiterung,
nicht als Standardfall.

## 3. Modell-Anforderung

Mittlere bis gehobene Reasoning-Anforderung: Das Modell muss eine gezielte
Änderung an einem bestehenden strukturierten Dokument vornehmen, ohne
ungewollt andere Teile zu verändern oder den didaktischen Aufbau zu
zerstören — ähnlich anspruchsvoll wie Erklären
([03-chat-erklaeren.md](03-chat-erklaeren.md)), aber mit zusätzlichem Fokus
auf Konsistenz zum bestehenden Dokument statt freier Texterzeugung.
Kontextlänge moderat (ein Lernzettel + kurzer Revisionsverlauf, kein voller
Themen-Memory-Block). Kosten-/Latenztoleranz wie im Chat: Nutzer wartet
aktiv auf die aktualisierte Fassung.

## 4. Parameter-Empfehlung

| Parameter | Empfehlung |
|---|---|
| `max_tokens` | ~400–700 für den **Regelfall** (Patch-Liste, siehe Token-Spar-Hinweis unten) statt ~1500–2500 für den kompletten Lernzettel; nur bei `art: vollersatz` (seltene Neugliederung) so großzügig wie bei der Erstellung |
| Temperatur | niedrig (0.2–0.4) — der unveränderte Teil des Dokuments soll stabil bleiben, keine stilistische Neuinterpretation |
| Streaming | optional, wie bei der Erstellung — kein Chat-Zwang, aber möglich für gefühlte Geschwindigkeit |
| Caching | nicht zentral — der `content` ändert sich ja gerade durch den Call selbst, ein Caching des „alten" Stands bringt wenig; ggf. `{{tonfallBaustein}}` cachen, wenn er sich über mehrere Revisionen desselben Lernzettels nicht ändert |

**Token-Spar-Hinweis (wichtigste Änderung in dieser Datei):** Output-Tokens
kosten bei Haiku 4.5 das 5-Fache von Input-Tokens (siehe `00-overview.md`
§7). Den kompletten Lernzettel bei jeder Revision erneut vollständig
zurückzugeben — wie in einer früheren Fassung dieses Prompts — verschwendet
genau dort am meisten, wo es am teuersten ist: Die meisten Revisionen
ändern nur einen kleinen Ausschnitt eines sonst unveränderten Dokuments.
Deshalb gibt das Modell im Regelfall eine **Such-/Ersetzen-Patch-Liste**
zurück (siehe Output-Format) — nach demselben Prinzip wie ein
Diff/Patch-Tool: exakter, eindeutig auffindbarer Ausschnitt hinein, neuer
Text heraus. Nur bei Anweisungen, die eine echte Neugliederung des ganzen
Dokuments verlangen (selten), fällt das Modell auf einen vollständigen
Ersatz zurück.

## 5. System-Prompt

```
Du überarbeitest im Gespräch mit einem Schüler/einer Schülerin der
{{klassenstufe}} einen bestehenden Lernzettel zum Thema „{{themaName}}"
(Fach {{fachName}}).

{{tonfallBaustein}}

Aktueller Lernzettel-Inhalt:
{{lernzettelContent}}

Bisheriger Revisionsverlauf:
{{revisionsVerlauf}}

Regeln:
1. Setze die aktuelle Anweisung des Schülers präzise um — füge hinzu,
   kürze, formuliere um, korrigiere, genau wie angefordert.
2. Verändere den Rest des Dokuments **nicht**, außer die Anweisung
   erfordert es explizit oder eine Änderung macht eine Anpassung an
   anderer Stelle zwingend nötig (z. B. Nummerierung).
3. Erhalte die bestehende Markdown-Struktur/Gliederung, wenn die Anweisung
   nichts anderes verlangt.
4. Wenn die Anweisung unklar ist oder mit dem bestehenden Inhalt in
   Konflikt steht, frag kurz nach, statt zu raten.
5. Gib zusätzlich zur aktualisierten Fassung eine kurze Bestätigung, was
   du geändert hast (wird als Chat-Nachricht angezeigt).
6. Gib deine Änderung standardmäßig als **Patch-Liste** zurück (`art:
   "patch"`): pro Änderung ein Paar aus exakt im aktuellen Content
   vorkommendem Ausschnitt (`suchen`) und dem Ersatztext (`ersetzen`).
   `suchen` muss lang/eindeutig genug sein, um im Dokument nur genau einmal
   vorzukommen (nimm bei Bedarf ein bis zwei Sätze Kontext mit). Nutze
   `art: "vollersatz"` mit `neuerContent` **nur**, wenn die Anweisung eine
   Neugliederung verlangt, die sich nicht sinnvoll als lokale Patches
   ausdrücken lässt.

Antworte ausschließlich über das bereitgestellte Tool.
```

## 6. Output-Format

Strukturierter Output über Tool-Definition (schreibt in `Lernzettel.content`
und erzeugt einen `LernzettelRevision`-Eintrag mit `rolle: ai`, siehe §1).
Das Backend wendet `patches` der Reihe nach als Such-/Ersetzen-Operation auf
den bestehenden `Lernzettel.content` an (schlägt ein `suchen`-Ausschnitt
nicht eindeutig auf, ist das ein Fehlerfall, den das Backend zurückmelden
muss — Retry oder Fallback auf `vollersatz` sind Implementierungsdetails):

```json
{
  "name": "lernzettel_revision",
  "description": "Änderung am Lernzettel nach einer Revisionsanweisung, plus kurze Bestätigung für den Chatverlauf",
  "input_schema": {
    "type": "object",
    "properties": {
      "antwortText": {
        "type": "string",
        "description": "Kurze Bestätigung/Rückmeldung an den Schüler, z. B. 'Ich habe ein Beispiel zur Zinsrechnung ergänzt.' — wird als LernzettelRevision-Nachricht gespeichert"
      },
      "art": {
        "type": "string",
        "enum": ["patch", "vollersatz"],
        "description": "patch (Regelfall): gezielte Such-/Ersetzen-Paare. vollersatz (Ausnahme): komplette Neugliederung nötig"
      },
      "patches": {
        "type": "array",
        "description": "Nur bei art=patch, mindestens 1 Eintrag",
        "items": {
          "type": "object",
          "properties": {
            "suchen": { "type": "string", "description": "Exakter, eindeutiger Ausschnitt aus dem aktuellen Content" },
            "ersetzen": { "type": "string", "description": "Ersatztext für diesen Ausschnitt" }
          },
          "required": ["suchen", "ersetzen"]
        }
      },
      "neuerContent": {
        "type": "string",
        "description": "Nur bei art=vollersatz: vollständiger neuer Lernzettel-Inhalt in Markdown"
      }
    },
    "required": ["antwortText", "art"]
  }
}
```

## 7. Beispiel

**Aktueller Lernzettel-Ausschnitt:** „## Grundformel\nProzentwert =
Grundwert × Prozentsatz / 100\n\n## Typische Anwendungen\nRabatt, Zinsen,
Mehrwertsteuer …"

**User-Anweisung:** „Kannst du ein Rechenbeispiel zur Mehrwertsteuer
ergänzen?"

**Output (Regelfall, Patch-Format):**

```json
{
  "antwortText": "Ich habe unter 'Typische Anwendungen' ein Rechenbeispiel zur Mehrwertsteuer ergänzt.",
  "art": "patch",
  "patches": [
    {
      "suchen": "## Typische Anwendungen\nRabatt, Zinsen, Mehrwertsteuer — immer erst den Grundwert identifizieren.",
      "ersetzen": "## Typische Anwendungen\nRabatt, Zinsen, Mehrwertsteuer — immer erst den Grundwert identifizieren.\n\n**Beispiel Mehrwertsteuer:** Ein Artikel kostet netto 40 €, MwSt. 19 %. Prozentwert = 40 × 19 / 100 = 7,60 €. Bruttopreis = 40 € + 7,60 € = 47,60 €."
    }
  ]
}
```

Zum Vergleich der **alte Ansatz** (vollständiger Ersatz bei jeder Revision)
hätte hier den kompletten Lernzettel-Inhalt erneut ausgeben müssen — bei
einem längeren Lernzettel potenziell 1.000+ Output-Tokens für eine
Ein-Satz-Ergänzung. Siehe Kostenschätzung (Abschnitt 9) für den konkreten
Unterschied.

## 8. Sokratik-Hinweis

Das Sokratik-Prinzip aus `00-overview.md` ist hier nicht direkt einschlägig
und wird deshalb — analog zum Zusammenfassen-Modus
([06-chat-zusammenfassen.md](06-chat-zusammenfassen.md)) — bewusst
ausgeschaltet: Der Schüler gibt eine explizite Bearbeitungsanweisung an
einem bereits fertigen Dokument, das ist kooperative Dokumentbearbeitung,
kein Tutoring-Dialog, der zum eigenen Herleiten anregen soll. Diese
Einordnung ist eine Annahme dieser Datei, da `backend-planning.md` §3 die
Revision nicht explizit in die Sokratik-Kategorien einsortiert.

## 9. Kostenschätzung (Claude Haiku 4.5)

Kein Caching (Input ändert sich jede Runde). Angenommen: `content` +
Revisionsverlauf + System-Prompt ≈ 1.500 Tokens Input, unabhängig vom
gewählten Output-Format.

| Ansatz | Output | ≈ Kosten | Vergleich |
|---|---|---|---|
| **Patch-Format (empfohlen, `art: patch`)** | ~200 Tokens (Bestätigung + 1–2 Patches) | **≈ 0,25 Cent** | Referenz |
| Voll-Ersatz (`art: vollersatz` bzw. alte Fassung dieses Prompts) | ~1.200 Tokens (kompletter Lernzettel) | **≈ 0,75 Cent** | ~3× teurer |

Der Unterschied wächst mit der Lernzettel-Länge: Bei einem sehr langen,
oft überarbeiteten Lernzettel (z. B. nach vielen Revisionen) bleibt das
Patch-Format konstant günstig, während Voll-Ersatz mit jeder Revision
proportional teurer wird. Bei bis zu 10 kostenlosen Revisionen pro
Lernzettel (§1/§7) summiert sich das: 10 Revisionen im Patch-Format
≈ 2,5 Cent, im Voll-Ersatz-Format ≈ 7,5 Cent.
