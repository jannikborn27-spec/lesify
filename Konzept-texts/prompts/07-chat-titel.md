# 07 · Chat-Titel-Generierung

> **Status: Vorschlag, noch nicht final entschieden.** `backend-planning.md`
> §8 führt „Chat-Titel-Generierung" ausdrücklich als offenen Punkt: im
> Prototyp wird der Titel client-seitig aus den ersten ~48 Zeichen der
> ersten Nutzer-Nachricht abgeleitet (kein KI-Call). Dieser Prompt-Entwurf
> beschreibt, wie ein späterer echter KI-Call dafür aussehen könnte — inkl.
> eines Vorschlags, an welchen Endpunkt er sich anhängt (siehe Abschnitt 1).
> Beides ist eine Annahme, keine getroffene Entscheidung.

## 1. Zweck & Trigger

**Annahme:** Nach der **ersten Nutzer-Nachricht** eines neuen Chats
(`Chat.titel` ist zu diesem Zeitpunkt noch leer/Platzhalter). §4 listet
aktuell keinen eigenen Endpunkt dafür — naheliegendster Anschlusspunkt ist
der erste Aufruf von `POST /chats/:id/nachrichten`: das Backend triggert
diesen Titel-Call zusätzlich zur eigentlichen Chat-Antwort (siehe
03–06) und liefert `titel` im selben oder einem unmittelbar folgenden
Response-Payload zurück, sobald er feststeht. Alternative: ein eigener,
schlanker Endpunkt (z. B. `POST /chats/:id/titel`) — offen, da nicht
Gegenstand dieses Prompt-Entwurfs, sondern eine API-Design-Entscheidung.

## 2. Input

- Text der ersten Nutzer-Nachricht des Chats.
- `fachName`, `themaName` (zur Einordnung, falls die Nachricht sehr kurz/
  kontextarm ist, z. B. „kannst du mir helfen?").
- **Kein** Themen Memory, kein Tonfall-Baustein nötig — reine
  Kurz-Label-Generierung, kein pädagogischer Ton gefragt.

## 3. Modell-Anforderung

Denkbar einfachste Aufgabe im gesamten Prompt-Set: eine kurze, sprechende
Überschrift aus einer einzelnen Nachricht ableiten. Kein Reasoning, kein
längerer Kontext nötig. Klarer Kandidat für die günstigste/schnellste
verfügbare Modellklasse — Kosten-/Latenztoleranz ist hier am striktesten:
Der Titel ist reines UI-Zuckerl (Chat-Verlauf-Liste), keine
lernrelevante Ausgabe, ein Overkill-Modell wäre reine Verschwendung.

## 4. Parameter-Empfehlung

| Parameter | Empfehlung |
|---|---|
| `max_tokens` | ~20 (ein kurzer Titel, keine Sätze) |
| Temperatur | niedrig (0.2–0.3) — konsistente, sachliche Titel statt kreativer Variation |
| Streaming | nein — Titel wird als Ganzes in die Chat-Liste geschrieben, kein UI-Wert im Streamen einer Überschrift |
| Caching | nicht relevant — Call läuft einmal pro Chat, kein wiederverwendbarer Kontext |

## 5. System-Prompt

```
Du erzeugst aus der ersten Nachricht eines Schülers/einer Schülerin in
einem Lern-Chat einen kurzen, sprechenden Titel für die Chat-Liste.

Kontext: Fach {{fachName}}, Thema {{themaName}}.

Regeln:
1. Maximal 6 Wörter, keine Satzzeichen am Ende, keine Anführungszeichen.
2. Der Titel muss den konkreten Inhalt der Nachricht widerspiegeln (nicht
   nur "Frage zu {{themaName}}" — außer die Nachricht ist tatsächlich so
   unspezifisch).
3. Kein Chat-Modus im Titel wiederholen (der wird separat angezeigt).
4. Deutsch, außer die Nachricht selbst ist in einer Fremdsprache verfasst
   (z. B. Englisch-Übung) — dann darf der Titel diese Sprache aufgreifen.

Antworte ausschließlich über das bereitgestellte Tool.
```

## 6. Output-Format

Strukturierter Output über Tool-Definition (schreibt direkt in
`Chat.titel`, siehe §1):

```json
{
  "name": "chat_titel",
  "description": "Kurzer Titel für einen neuen Chat, abgeleitet aus der ersten Nutzer-Nachricht",
  "input_schema": {
    "type": "object",
    "properties": {
      "titel": {
        "type": "string",
        "description": "Max. 6 Wörter, ohne Satzzeichen am Ende"
      }
    },
    "required": ["titel"]
  }
}
```

## 7. Beispiel

**Input:** Fach „Mathematik", Thema „Lineare Gleichungen", erste
Nutzer-Nachricht: „Ich soll 3x − 7 = 14 lösen, komm aber nicht weiter."

**Output:**

```json
{ "titel": "Gleichung 3x − 7 = 14 lösen" }
```

## 8. Kostenschätzung (Claude Haiku 4.5)

Kein Caching nötig (Call läuft einmal pro Chat, Input ist trivial klein).

| Input (System-Prompt + erste Nachricht) | Output | ≈ Kosten |
|---|---|---|
| ~80 + ~60 = ~140 Tokens | ~15 Tokens | **≈ 0,02 Cent** |

Praktisch vernachlässigbar — selbst bei 100 neuen Chats/Monat (Platzhalter-
Limit aus §7) liegt die Titel-Generierung insgesamt bei ≈ 0,02 $/Monat pro
Nutzer. Kein Kandidat für weitere Optimierung.
