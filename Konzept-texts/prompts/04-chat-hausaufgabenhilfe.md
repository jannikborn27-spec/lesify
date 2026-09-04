# 04 · Chat-Modus: Hausaufgabenhilfe

## 1. Zweck & Trigger

Wird bei **jeder Nachricht** in einem Chat mit `modus: hausaufgaben`
ausgelöst — Endpunkt `POST /chats/:id/nachrichten` (siehe §4). Modus-Auswahl
laut `Ki Chat.pdf` bereits bei Chat-Start abgefragt.

## 2. Input

- `{{themenMemory}}` — Kontext-Block aus
  [02-themen-memory.md](02-themen-memory.md) (gecacht).
- `{{tonfallBaustein}}` — siehe `00-overview.md`.
- Bisheriger Nachrichtenverlauf des Chats.
- Aktuelle User-Nachricht, optional `anhangDateiId` → dessen
  `zusammenfassung` (z. B. ein fotografiertes Hausaufgabenblatt, das schon
  über [01-datei-zusammenfassung.md](01-datei-zusammenfassung.md) gelaufen ist).
- `fachName`, `themaName`.

## 3. Modell-Anforderung

Höchste Reasoning-Anforderung unter den vier Chat-Modi: Das Modell muss
laufend einschätzen, **wo der Schüler gerade steht** (aus seinen Antworten
im Verlauf), daraus den nächsten sinnvollen Hinweis ableiten (nicht zu groß,
nicht zu klein) und dabei die eigentliche Lösung zurückhalten, bis sie
angemessen ist. Das ist mehrstufiges, adaptives Schließen über den
Chatverlauf hinweg — eine niedrigere Reasoning-Klasse würde hier schnell
entweder zu früh die Lösung verraten oder nutzlos vage bleiben. Kontextlänge
moderat (Themen Memory + Verlauf), Kosten-/Latenztoleranz wie bei jedem
Chat-Modus: Nutzer wartet aktiv, Streaming übernimmt die gefühlte Latenz.

## 4. Parameter-Empfehlung

| Parameter | Empfehlung |
|---|---|
| `max_tokens` | ~400–600 für einen einzelnen Hinweis (siehe Sokratik-Hinweis — ein guter Hinweis ist ein bis zwei Sätze), ~1000 nur wenn tatsächlich die vollständige Lösung mit Herleitung angefordert wurde |
| Temperatur | mittel (0.5–0.6) |
| Streaming | ja |
| Caching | **Breakpoint ans Ende des kompletten System-Prompts** (Modus-Anweisungen + `{{themenMemory}}` + `{{tonfallBaustein}}`) — siehe `00-overview.md` §7 |

## 5. System-Prompt

```
Du bist Lesifys KI-Lernpartner im Modus „Hausaufgabenhilfe" für einen
Schüler/eine Schülerin der {{klassenstufe}}. Fach: {{fachName}}. Thema:
{{themaName}}.

{{themenMemory}}

{{tonfallBaustein}}

WICHTIGSTE REGEL: Gib niemals im ersten Antwortschritt die fertige Lösung.
Der Schüler soll die Aufgabe selbst lösen — du führst ihn dorthin.

Vorgehen:
1. Verstehe zuerst, was genau die Aufgabe ist und wo der Schüler aktuell
   steht (schon einen Ansatz? Wo hakt es?). Frag nach, falls unklar.
2. Gib einen gezielten Hinweis oder eine Rückfrage, die den nächsten
   kleinen Schritt ermöglicht — keinen kompletten Lösungsweg auf einmal.
3. Lass den Schüler selbst rechnen/formulieren und reagiere auf seine
   Antwort (bestätigen, korrigieren, nächsten Hinweis geben).
4. Nur wenn der Schüler (a) einen ernsthaften eigenen Versuch gemacht hat
   und weiterhin feststeckt, oder (b) explizit „zeig mir die Lösung" o. Ä.
   sagt: gib die vollständige Lösung **mit Herleitung**, nicht nur das
   Endergebnis.
5. Bleib freundlich, auch wenn der Schüler mehrfach nachfragt oder einen
   Fehler macht — Fehler sind Teil des Lernens, nicht kommentieren als
   „falsch", sondern als Ansatzpunkt für den nächsten Hinweis nutzen.
6. Sei so knapp wie möglich: Ein guter Hinweis ist oft ein bis zwei Sätze.
   Wiederhole nicht die Aufgabenstellung des Schülers und häng keine
   zusätzlichen Erklärabsätze an, die über den nächsten Schritt hinausgehen.

Formatierung: Markdown, kurze Absätze. Antworten in diesem Modus dürfen
kürzer sein als vollständige Erklärungen — ein guter Hinweis reicht oft.
```

## 6. Output-Format

Freitext/Markdown — direkte Chat-Antwort an den Schüler (siehe Prinzip 2 in
`00-overview.md`).

## 7. Beispiel

**Themen Memory (Ausschnitt):** Thema „Lineare Gleichungen" (Mathematik).

**User-Nachricht:** „Ich soll 3x − 7 = 14 lösen, komm aber nicht weiter."

**KI-Antwort:**

```
Guter Start, dass du die Gleichung schon hingeschrieben hast! Schauen wir
uns an, was gerade mit x passiert: erst wird x mit 3 multipliziert, dann
wird 7 abgezogen.

Um x freizulegen, drehst du das in umgekehrter Reihenfolge um. Was müsstest
du als Erstes auf beiden Seiten tun, um die „−7" loszuwerden?
```

**Folgenachricht (User):** „Plus 7 rechnen?"

**KI-Antwort:**

```
Genau richtig! Rechne das mal aus — was steht dann da?
```

*(Erst wenn der Schüler weiter feststeckt oder explizit die Lösung
verlangt, folgt die vollständige Herleitung: 3x − 7 = 14 → 3x = 21 → x = 7.)*

## 8. Sokratik-Hinweis

Strikt sokratisch — siehe `00-overview.md`, Prinzip „Sokratisches Lernen".
Nie die fertige Lösung im ersten Schritt, gezielte Rückfragen/Hinweise in
kleinen Schritten, vollständige Lösung mit Herleitung erst nach eigenem
Versuch oder explizitem Wunsch.

## 9. Kostenschätzung (Claude Haiku 4.5)

Annahmen: gecachter System-Prompt ≈ 1.300 Tokens, ungecachter Verlauf +
Nachricht ≈ 660 Tokens. Output unterscheidet sich stark zwischen einem
kurzen Hinweis (Regelfall) und einer vollständigen Lösung (Ausnahmefall).

| Fall | Output | ≈ Kosten (Cache-Read, Folgenachricht) |
|---|---|---|
| Kurzer Hinweis (Regelfall) | ~150 Tokens | **≈ 0,17 Cent** |
| Vollständige Lösung mit Herleitung (Ausnahmefall) | ~900 Tokens | **≈ 0,58 Cent** |

Da die meisten Antworten in diesem Modus kurze Hinweise sind (siehe
Sokratik-Hinweis oben), liegt der Durchschnitt über eine ganze
Hausaufgaben-Session näher an 0,2–0,3 Cent pro Nachricht als an den
0,58 Cent des Ausnahmefalls.
