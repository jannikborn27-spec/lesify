# 08 · Lernzettel-Erstellung

## 1. Zweck & Trigger

Wird ausgelöst, wenn der Schüler für ein Thema einen Lernzettel anlegen
lässt — Endpunkt `POST /themen/:id/lernzettel` (siehe §4). Laut
`Lernzettel.pdf`: „vollautomatisch erstellt aus allem Content des Themas
(allen Chats und Dateien)" — kein manuelles Vorauswählen einzelner Chats/
Dateien durch den Schüler. On-demand, nicht bei jeder Chat-Nachricht neu
(siehe §3 Sparsamkeits-Prinzip).

## 2. Input

Anders als bei [02-themen-memory.md](02-themen-memory.md) reicht hier der
reine Titel-Kontext nicht — der Lernzettel soll den **tatsächlichen Inhalt**
aller bisherigen Lernaktivität zum Thema aufbereiten:

- Alle **vollständigen Chatverläufe** des Themas (alle Modi: erklären,
  hausaufgaben, ueben, zusammenfassen — jeweils User- und KI-Nachrichten).
- Alle **Datei-Zusammenfassungen** des Themas (nicht die Rohdateien, siehe
  [01-datei-zusammenfassung.md](01-datei-zusammenfassung.md)).
- `fachName`, `themaName`, `themaBeschreibung`.
- `{{tonfallBaustein}}` — Tonfall fließt laut §1 auch in Lernzettel ein.

Dies ist der potenziell größte Kontext-Input im gesamten Prompt-Set (ein
Thema kann viele Chats über Wochen ansammeln) — siehe Modell-Anforderung.

**Token-Spar-Hinweis:** Bei Themen mit ungewöhnlich vielen/langen Chats
(Monate an Aktivität) kann der Rohinput mehrere Zehntausend Tokens erreichen.
Analog zur Verdichtungs-Erweiterung in
[02-themen-memory.md](02-themen-memory.md) ist ab einer festzulegenden
Schwelle (z. B. ~15.000 Tokens) zu erwägen, sehr alte oder inhaltlich dünne
Chats vorab client-seitig auf ihre wichtigsten Nachrichten zu kürzen, statt
sie vollständig mitzuschicken — als klar markierte Erweiterung, nicht als
Standardverhalten (kein Overengineering vor Bedarf, siehe
`00-overview.md` §3).

## 3. Modell-Anforderung

Hohe Reasoning-Anforderung: Aus mehreren, teils redundanten oder
widersprüchlichen Chatverläufen und Dateizusammenfassungen muss ein
**kohärentes, didaktisch strukturiertes** Dokument entstehen — nicht nur
Aneinanderreihen, sondern Deduplizieren, Priorisieren, sinnvoll gliedern
(Grundlagen vor Spezialfällen). Kontextlänge: potenziell groß bis sehr
groß — Long-Context-Fähigkeit ist hier kritischer als bei jedem anderen
Call in diesem Set. Kosten-/Latenztoleranz: höher als im Chat — der Nutzer
klickt aktiv „Lernzettel erstellen" und erwartet ein Warten/Ladezustand,
kein sofortiges Chat-Tempo.

## 4. Parameter-Empfehlung

| Parameter | Empfehlung |
|---|---|
| `max_tokens` | ~1500–2500 (ein vollständiges Lernzettel-Dokument, deutlich mehr als eine einzelne Chat-Antwort) |
| Temperatur | niedrig-mittel (0.3–0.4) — Struktur/Faktentreue wichtiger als stilistische Vielfalt |
| Streaming | optional — empfehlenswert für gefühlte Geschwindigkeit bei großem Themen-Umfang, aber nicht zwingend wie im Chat |
| Caching | nicht relevant — Call läuft einmal pro Lernzettel-Erstellung, kein wiederverwendbarer Kontext-Block (im Unterschied zu Themen Memory, das über viele Folge-Calls hinweg gecacht wird) |

## 5. System-Prompt

```
Du erstellst für einen Schüler/eine Schülerin der {{klassenstufe}} einen
vollständigen Lernzettel zum Thema „{{themaName}}" (Fach {{fachName}}).

{{themaBeschreibung}}

{{tonfallBaustein}}

Dir liegt der gesamte bisherige Lern-Content zu diesem Thema vor: alle
Chatverläufe (verschiedene Modi: Erklären, Hausaufgabenhilfe, Üben,
Zusammenfassen) und alle Datei-Zusammenfassungen.

Regeln:
1. Erstelle ein eigenständiges Lerndokument in Markdown — Überschriften,
   Stichpunkte, Formeln in Code-Notation wo passend.
2. Verdichte und dedupliziere: wenn derselbe Sachverhalt in mehreren Chats
   vorkam, erscheint er im Lernzettel nur einmal, an der sinnvollsten
   Stelle.
3. Gliedere didaktisch: Grundbegriffe/Regeln zuerst, dann Anwendung/
   Beispiele, dann Sonderfälle/häufige Fehler (falls aus den Chats
   erkennbar).
4. Nutze nur Inhalte, die tatsächlich aus den Chats/Dateien hervorgehen —
   erfinde keine zusätzlichen Fakten, auch wenn sie fachlich naheliegen
   würden.
5. Wenn die vorliegenden Chats/Dateien nur einen Teilaspekt des Themas
   abdecken, ist das in Ordnung — der Lernzettel muss nicht das ganze
   Thema erschöpfend behandeln, nur das, was tatsächlich belegt ist.
6. Schlage einen prägnanten Titel für den Lernzettel vor.

Antworte ausschließlich über das bereitgestellte Tool.
```

## 6. Output-Format

Strukturierter Output über Tool-Definition (schreibt in `Lernzettel.titel`
und `Lernzettel.content`, siehe §1 — `content` selbst bleibt Markdown-Text
innerhalb des JSON-Felds):

```json
{
  "name": "lernzettel_erstellen",
  "description": "Vollautomatisch generierter Lernzettel aus allen Chats und Dateien eines Themas",
  "input_schema": {
    "type": "object",
    "properties": {
      "titel": {
        "type": "string",
        "description": "Prägnanter Titel des Lernzettels"
      },
      "content": {
        "type": "string",
        "description": "Vollständiger Lernzettel-Inhalt in Markdown"
      }
    },
    "required": ["titel", "content"]
  }
}
```

## 7. Beispiel

**Input (verdichtet):** Thema „Prozentrechnung" (Mathematik). Drei Chats
(„Grundwert berechnen" – Modus erklären; „Aufgabe zu Rabatt" – Modus
hausaufgaben; „Zinsrechnung üben" – Modus ueben), eine Datei-Zusammenfassung
zu einem Übungsblatt mit Zinsrechnungs-Aufgaben.

**Output (gekürzt):**

```json
{
  "titel": "Prozentrechnung im Alltag",
  "content": "## Grundformel\nProzentwert = Grundwert × Prozentsatz / 100\n\n## Typische Anwendungen\n- **Rabatt:** Grundwert ist der ursprüngliche Preis, Prozentsatz die Rabattangabe.\n- **Zinsrechnung:** Grundwert ist das Kapital, Prozentsatz der Zinssatz pro Jahr.\n\n## Häufiger Fehler\nGrundwert und Prozentwert verwechseln — immer zuerst identifizieren, wovon der Prozentsatz berechnet wird."
}
```

Damit dieses Beispiel konkret nachvollziehbar bleibt: Bei einer
Testklausur-Analyse zu diesem Thema mit z. B. 82 % erreichter Punktzahl
ergäbe sich nach der Formel aus §2
(`note = round(6 − 82/100 × 5, 1) = round(1.9, 1) = 1.9`) eine Note von
**1.9** — siehe [11-testklausur-analyse.md](11-testklausur-analyse.md) für
den vollständigen Rechenweg in diesem Kontext.

## 8. Kostenschätzung (Claude Haiku 4.5)

Kein Caching (Einzel-Call pro Lernzettel-Erstellung).

| Fall | Input (System-Prompt + Chats/Dateien) | Output | ≈ Kosten |
|---|---|---|---|
| Typisches Thema (3 Chats, 2 Dateien) | ~250 + ~3.400 = ~3.650 Tokens | ~1.800 Tokens | **≈ 1,3 Cent** |
| Umfangreiches Thema (viele Chats über Monate) | ~250 + ~14.750 = ~15.000 Tokens | ~2.200 Tokens | **≈ 2,4 Cent** |

Da Lernzettel typischerweise seltener erstellt werden als einzelne
Chat-Nachrichten (on-demand, nicht pro Nachricht), trägt dieser Call kaum
zu den monatlichen Gesamtkosten pro Nutzer bei — selbst mehrere
Lernzettel-Erstellungen pro Monat bleiben im Cent-Bereich.
