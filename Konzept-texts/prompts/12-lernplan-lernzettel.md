# 12 · Lernzettel-Aktualisierung (Lernplan-Lernzettel)

## 1. Zweck & Trigger

Der **Lernzettel** ist ein kumulatives „wichtigste Dinge zum Merken"-Dokument
pro Lernplan (`Lernplan.lernzettel`, `{content, aktualisiertAm}` \| `null`,
Markdown). Er wächst über drei Punkte im 7-Tage-Lernplan:

| Tag | Auslöser | themaIds |
|---|---|---|
| 3 | **Erste Erstellung** („Lernzettel starten") | die an Tag 1 schwachen/wackeligen Themen |
| 4 | Ergänzung („Zum Lernzettel hinzufügen") | dieselben Themen (Festigung) |
| 6 | Ergänzung nach Testklausur 2 | die in Testklausur 2 noch wackeligen/schwachen Themen |

Endpunkt `POST /lernplaene/:id/lernzettel` mit `{themaIds}` (siehe §4). Im
Frontend-Prototyp: `Lesify.aktualisiereLernzettel(lernplanId, themaIds)` — der
erste Aufruf legt das Dokument an (`# Lernzettel\n\n` + Abschnitte), spätere
hängen `\n\n` + neue Abschnitte an. Der Aufruf ist **idempotent im Ablauf**: ob
Tag 3 den Lernzettel schon gestartet hat oder nicht, ist für Tag 4/6 egal.

Kein eigenes Chat-/Revisions-UI (anders als beim Lernzettel) — der Lernzettel
wird ausschließlich über diesen Call fortgeschrieben, nie frei editiert.

## 2. Input

Pro `themaId` in `themaIds`:

- **Bevorzugt** der `Lernzettel.content` des Themas (bereits kuratierte,
  kompakte Wissensquelle — spart Tokens gegenüber Rohchats), sonst die
  vollständigen Chatverläufe + Datei-Zusammenfassungen des Themas (gleiche
  Priorisierung wie [10-testklausur-erstellung.md](10-testklausur-erstellung.md)).
- Optional das eingefrorene KI-Feedback aus der Testklausur-Analyse
  (`TestklausurErgebnis.erklaerung` für dieses Thema) — nennt den **typischen
  Fehler** des Schülers konkret und gehört genau deshalb auf den Lernzettel.
- `themaName`, `fachName`.

**Für Ergänzungen (Tag 4/6)** zusätzlich: der **bisherige
`Lernplan.lernzettel.content`** — damit das Modell nicht wiederholt, was schon
drinsteht, sondern gezielt vertieft/ergänzt (z. B. an Tag 4 eine zusätzliche
Merkregel, an Tag 6 den nach Testklausur 2 noch offenen Punkt).

## 3. Modell-Anforderung

Niedrig bis mittel — gleiche Klasse wie [08-lernzettel-erstellung.md](08-lernzettel-erstellung.md):
Verdichten von vorhandenem, bereits aufbereitetem Material auf das absolute
Minimum (eine wichtigste Regel, ein typischer Fehler, ein Merksatz pro Thema),
keine neue Herleitung, kein Dialog. Kontextlänge klein bis moderat (1–3 Themen,
je Lernzettel-Umfang, plus der bisherige Lernzettel bei Ergänzungen). Kosten-/
Latenztoleranz: Nutzer klickt aktiv „Lernzettel starten / hinzufügen" und
erwartet kurz einen Ladezustand, kein Chat-Tempo.

## 4. Parameter-Empfehlung

| Parameter | Empfehlung |
|---|---|
| `max_tokens` | knapp: ~90–140 Tokens pro Thema (drei kurze Merkpunkte als ein Markdown-Abschnitt) — z. B. `themaIds.length × 130 + 60` Tokens Puffer |
| Temperatur | niedrig (0.3) — reine Verdichtung, keine kreative Varianz |
| Streaming | nein — der Abschnitt wird komplett geparst und an `content` angehängt, bevor er angezeigt wird |
| Caching | optional: Wird derselbe Lernplan an Tag 3 → 4 → 6 kurz nacheinander aktualisiert, kann das Themenmaterial im System-Prompt über die Aufrufe als `cache_control`-Breakpoint wiederverwendet werden; im Regelfall liegen die Aufrufe aber Tage auseinander |

## 5. System-Prompt

```
Du pflegst den Lernzettel eines Schülers/einer Schülerin der {{klassenstufe}}
für die anstehende Klausur im Fach {{fachName}}. Der Lernzettel ist ein
kompaktes „das muss ich mir merken"-Dokument — kein Lernzettel, keine
Zusammenfassung des ganzen Stoffs, sondern das Nötigste zum kurzfristigen
Abrufen.

{{#if bisherigerLernzettel}}
Bisheriger Lernzettel (NICHT wiederholen, nur ergänzen):
{{bisherigerLernzettel}}
{{/if}}

Für jedes der folgenden Themen schreibst du GENAU EINEN kurzen Markdown-Abschnitt:

{{#each themen}}
### Thema: {{themaName}}
Verfügbares Material:
{{lernzettelOderChats}}
Typischer Fehler des Schülers (aus der Testklausur-Auswertung, falls vorhanden):
{{fehlerHinweis}}
{{/each}}

Regeln pro Abschnitt:
1. Überschrift „### {{themaName}}".
2. Danach höchstens 3 kurze Zeilen: die wichtigste Regel/Formel, der typische
   Fehler (bevorzugt der oben genannte konkrete), und ein Merksatz.
3. So knapp wie möglich — Stichpunkte, keine ausformulierten Absätze, keine
   Wiederholung von Inhalten, die schon im bisherigen Lernzettel stehen.
4. Nur Inhalte aus dem bereitgestellten Material, nichts darüber hinaus.
5. Gib NUR die neuen Abschnitte zurück (einen pro Thema), nicht den ganzen
   Lernzettel — das Anhängen übernimmt das Backend.

Antworte ausschließlich über das bereitgestellte Tool.
```

## 6. Output-Format

Strukturierter Output über Tool-Definition — ein Eintrag pro Thema. Das Backend
baut daraus `neu = eintraege.map(e => e.abschnitt).join('\n\n')` und hängt an:
`content = bisher ? bisher + '\n\n' + neu : '# Lernzettel\n\n' + neu`, dann
`aktualisiertAm = now`. **Angehängt statt Vollersatz** — dieselbe
Diff-statt-Vollersatz-Begründung wie in
[09-lernzettel-revision.md](09-lernzettel-revision.md) (§6): der bereits
geschriebene Teil wird nie erneut erzeugt.

```json
{
  "name": "lernzettel_abschnitte",
  "description": "Je Thema ein kurzer Markdown-Abschnitt zum Anhängen an den Lernzettel",
  "input_schema": {
    "type": "object",
    "properties": {
      "eintraege": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "themaId": { "type": "string" },
            "abschnitt": { "type": "string", "description": "Markdown, beginnt mit '### <Themenname>', danach max. 3 kurze Zeilen" }
          },
          "required": ["themaId", "abschnitt"]
        }
      }
    },
    "required": ["eintraege"]
  }
}
```

## 7. Beispiel

**Input (Tag 3):** `themaIds = [bruchrechnung, flaechenberechnung]`, Fach
Mathematik. Aus der Testklausur-Analyse: Bruchrechnung 18 % („Kürzen ohne
systematischen ggT-Weg"), Flächenberechnung 58 % („Höhe im Trapez vertauscht").
Bisheriger Lernzettel: keiner.

**Modell-Output:**

```json
{
  "eintraege": [
    { "themaId": "bruchrechnung", "abschnitt": "### Bruchrechnung\n- Kürzen: immer den größten gemeinsamen Teiler von Zähler und Nenner suchen, dann beide durch ihn teilen.\n- Typischer Fehler: nur um einen kleinen Faktor gekürzt (24/49 statt 4/7) — Ergebnis am Ende prüfen, ob noch teilbar.\n- Merksatz: „So weit kürzen, bis Zähler und Nenner keinen gemeinsamen Teiler mehr haben.\"" },
    { "themaId": "flaechenberechnung", "abschnitt": "### Flächenberechnung\n- Trapez: A = (a + c) / 2 · h — h ist der senkrechte Abstand der beiden parallelen Seiten a und c.\n- Typischer Fehler: eine der Schrägseiten als Höhe eingesetzt — Höhe steht immer im rechten Winkel zu a und c.\n- Merksatz: „Erst die parallelen Seiten mitteln, dann mit der echten Höhe malnehmen.\"" }
  ]
}
```

**Backend:** `content = '# Lernzettel\n\n' + abschnitt_1 + '\n\n' + abschnitt_2`,
`aktualisiertAm = 'gerade eben'`. An Tag 4 wird derselbe Call mit denselben
`themaIds` erneut ausgelöst, diesmal mit dem obigen `content` als
`bisherigerLernzettel` — das Modell ergänzt dann z. B. eine zusätzliche
Beispielrechnung, statt die schon vorhandenen Merkpunkte zu wiederholen.

## 8. Sokratik-Hinweis

Nicht einschlägig — reine Verdichtungs-/Generierungsaufgabe ohne pädagogischen
Dialog (analog zu [08-lernzettel-erstellung.md](08-lernzettel-erstellung.md), siehe
`00-overview.md` §2).

## 9. Kostenschätzung (Claude Haiku 4.5)

Angenommen: 2 Themen, je ~500 Tokens Lernzettel-Material + ~40 Tokens
Fehler-Hinweis, System-Prompt ~200 Tokens, bei Ergänzungen zusätzlich der
bisherige Lernzettel ~200 Tokens. Output: ~120 Tokens pro Thema.

| Fall | Input | Output | ≈ Kosten |
|---|---|---|---|
| Erststellung Tag 3 (2 Themen) | ~200 + 2×540 = ~1.280 Tokens | ~240 Tokens | **≈ 0,25 Cent** |
| Ergänzung Tag 4/6 (2 Themen) | ~1.480 Tokens | ~240 Tokens | **≈ 0,3 Cent** |

Pro Lernplan fallen typisch 1–2 dieser Calls an (Tag 3 immer, Tag 4/6 je nach
Nutzung) — einer der günstigsten Calls im Set, in derselben Größenordnung wie
eine Lernzettel-Revision im Diff-Format (siehe
[09-lernzettel-revision.md](09-lernzettel-revision.md) §9).
