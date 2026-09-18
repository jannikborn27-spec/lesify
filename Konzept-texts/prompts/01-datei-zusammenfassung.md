# 01 · Datei-Zusammenfassung

## 1. Zweck & Trigger

Wird **einmalig beim Datei-Upload** ausgelöst — Endpunkt `POST /themen/:id/dateien`
(siehe `backend-planning.md` §4). Nach dem Speichern der Rohdatei im
Objektspeicher (§6) steht die `Datei` zunächst mit `status: verarbeitung`.
Dieser Call liest den Dateiinhalt einmal vollständig, danach wird
ausschließlich die hier erzeugte `zusammenfassung` weiterverwendet (siehe
Sparsamkeits-Prinzip in §3 von `backend-planning.md` — die Rohdatei geht nie
wieder an die KI). Nach erfolgreichem Call wechselt `status` auf `bereit`
(bzw. `fehler`, falls der Call fehlschlägt oder die Datei nicht lesbar ist).

## 2. Input

- Extrahierter Dateiinhalt: bei `pdf`/`doc` der Text (inkl. OCR-Fallback bei
  gescannten/Bild-PDFs), bei `img` das Bild selbst (Vision-Input).
- `dateiTyp` (`pdf` \| `doc` \| `img`, aus MIME-Type abgeleitet, siehe §1).
- Originaldateiname (Kontext, nicht zwingend fachlich relevant).
- `fachName`, `themaName` — zur Einordnung, damit die Zusammenfassung den
  Bezug zum Thema herstellt statt generisch zu bleiben.

Kein Themen-Memory nötig — dieser Call kennt nur die eine Datei, nicht den
restlichen Kontext des Themas.

## 3. Modell-Anforderung

Reine Extraktions-/Kompressionsaufgabe ohne mehrstufiges Schließen — **kein**
tiefes Reasoning nötig. Wichtiger als Reasoning-Tiefe ist hier:
verlässliches Long-Context-Lesen (Dateien bis 5 MB können mehrere Dutzend
Seiten Text ergeben) und bei `img` solide Vision-Fähigkeit. Kosten-/
Latenztoleranz: niedrig einzustufen — passiert synchron im Upload-Flow, der
Nutzer wartet (auch wenn UI das ggf. als Ladezustand kaschiert, siehe §8
„Datei-Verarbeitung async"). Kandidat für eine günstigere/schnellere
Modellklasse, sofern deren Kontextfenster für die größten erlaubten Dateien
ausreicht — genau die Rolle, die Haiku 4.5 hier übernehmen kann (siehe
Kostenschätzung, Abschnitt 8).

**Token-Spar-Hinweis:** Der Input dieses Calls ist der einzige nennenswerte
Kostentreiber (Output ist mit ~250 Tokens fix klein). Bei den seltenen
Dateien nahe dem 5-MB-Limit lohnt sich serverseitig ein weicher Deckel auf
die extrahierte Textmenge (z. B. ~30.000 Tokens ≈ ~100 Seiten) mit einem
Hinweis in der Zusammenfassung, dass nur ein Auszug gelesen wurde — echte
Schulmaterialien liegen fast immer weit darunter, der Deckel greift nur bei
pathologischen Ausreißern.

## 4. Parameter-Empfehlung

| Parameter | Empfehlung |
|---|---|
| `max_tokens` | ~250 (Zusammenfassung ~150–250 Tokens, siehe Output-Format) |
| Temperatur | niedrig (0.2–0.3) — Faktentreue zum Dateiinhalt wichtiger als Kreativität |
| Streaming | nein — Ergebnis wird erst komplett geparst und persistiert, bevor `status` wechselt |
| Caching | nicht relevant — Call läuft genau einmal pro Datei, kein wiederverwendbarer Kontext-Block |

## 5. System-Prompt

```
Du bist ein Assistenzsystem für Lesify, eine Lern-App für Schülerinnen und
Schüler ab der 5. Klasse. Deine einzige Aufgabe: den Inhalt einer
hochgeladenen Datei kurz und präzise zusammenzufassen, damit spätere
KI-Funktionen (Chat, Lernzettel, Testklausuren) den Inhalt nutzen können,
ohne die Originaldatei erneut zu lesen.

Kontext:
- Fach: {{fachName}}
- Thema: {{themaName}}
- Dateityp: {{dateiTyp}}

Regeln:
1. Fasse ausschließlich zusammen, was tatsächlich in der Datei steht.
   Erfinde keine Inhalte, die nicht belegt sind.
2. Schreibe für ein Schulpublikum ab der 5. Klasse verständlich, aber ohne
   den fachlichen Inhalt zu verwässern.
3. Die Zusammenfassung muss so eigenständig sein, dass eine andere KI-Funktion
   allein anhand von ihr (ohne die Originaldatei) sinnvoll damit arbeiten
   kann — nenne konkrete Begriffe, Formeln, Namen, Daten, keine vagen
   Umschreibungen wie "es geht um Mathe".
4. Schlage einen kurzen, sprechenden Titel vor, der den Inhalt der Datei
   auf einen Blick erkennbar macht (kein Fließtext, max. 8 Wörter).
5. Wenn die Datei kaum lesbaren oder irrelevanten Inhalt enthält (z. B.
   leeres Dokument, reines Bildrauschen), gib das ehrlich in der
   Zusammenfassung an, statt Inhalt zu erfinden.

Antworte ausschließlich über das bereitgestellte Tool.
```

## 6. Output-Format

Strukturierter Output über Tool-Definition (kein Freitext, wird direkt in
`Datei.zusammenfassung` geschrieben, siehe §1):

```json
{
  "name": "datei_zusammenfassung",
  "description": "Titel-Vorschlag und Zusammenfassung einer hochgeladenen Datei",
  "input_schema": {
    "type": "object",
    "properties": {
      "vorgeschlagenerTitel": {
        "type": "string",
        "description": "Kurzer, sprechender Titel für die Datei (max. 8 Wörter)"
      },
      "zusammenfassung": {
        "type": "string",
        "description": "Eigenständige Zusammenfassung des Dateiinhalts, 150–250 Tokens"
      }
    },
    "required": ["vorgeschlagenerTitel", "zusammenfassung"]
  }
}
```

> **Anmerkung zum Datenmodell:** `Datei.name` ist laut §1 der
> Originaldateiname (z. B. `kapitel3_scan.pdf`) und bleibt davon unberührt.
> `vorgeschlagenerTitel` ist ein zusätzliches, in §1 noch nicht abgebildetes
> Feld — Vorschlag/Annahme dieser Datei: als optionales Anzeige-Label
> verwenden (z. B. Karten-Titel in `dateien.html` statt des rohen
> Dateinamens), nicht als Ersatz für `name`. Falls nicht gewünscht, kann das
> Feld im Output ignoriert werden, ohne den Rest des Prompts zu ändern.

## 7. Beispiel

**Input** (Auszug, Fach „Mathematik", Thema „Bruchrechnung", Datei
`bruchrechnung_uebung.pdf`, Dateityp `pdf`):

> „Ein Bruch besteht aus Zähler und Nenner. Zum Kürzen teilt man Zähler und
> Nenner durch dieselbe Zahl … Beispiel: 8/12 = 2/3 … Beim Erweitern
> multipliziert man Zähler und Nenner mit derselben Zahl … Übungsaufgaben 1–8
> zu Kürzen, Erweitern und Addition ungleichnamiger Brüche."

**Output:**

```json
{
  "vorgeschlagenerTitel": "Brüche kürzen, erweitern, addieren",
  "zusammenfassung": "Übungsblatt zur Bruchrechnung: erklärt Kürzen (Zähler und Nenner durch dieselbe Zahl teilen, Beispiel 8/12 = 2/3) und Erweitern (Multiplikation mit derselben Zahl) von Brüchen. Enthält 8 Übungsaufgaben zu Kürzen, Erweitern sowie Addition von Brüchen mit ungleichem Nenner (gemeinsamer Nenner nötig). Kein Bezug zu Dezimalzahlen oder Prozentrechnung."
}
```

## 8. Kostenschätzung (Claude Haiku 4.5)

Kein Caching (Einzel-Call pro Datei), Preis 1 $ / 5 $ pro 1M Input-/
Output-Tokens (siehe `00-overview.md` §7).

| Fall | Input (System-Prompt + Dateiinhalt) | Output | ≈ Kosten |
|---|---|---|---|
| Typisch (2–5 Seiten Text) | ~230 + ~3.000 = ~3.230 Tokens | ~200 Tokens | **≈ 0,4 Cent** |
| Worst Case (nahe 5-MB-Text) | ~230 + ~50.000 = ~50.230 Tokens | ~200 Tokens | **≈ 5,1 Cent** |

Bei 40 Dateien/Monat (Platzhalter-Limit aus §7) ergibt das ≈ 0,17 $/Monat
im typischen Fall — selbst im unrealistischen Fall, dass alle 40 Dateien
nahe der Worst-Case-Größe liegen, bleibt es bei ≈ 2,05 $/Monat pro Nutzer.
