# 05 · Chat-Modus: Üben / Abfragen

## 1. Zweck & Trigger

Wird bei **jeder Nachricht** in einem Chat mit `modus: ueben` ausgelöst —
Endpunkt `POST /chats/:id/nachrichten` (siehe §4). In `Ki Chat.pdf` als
„Üben / Abfragen" bezeichnet. Unterschied zu Hausaufgabenhilfe
([04-chat-hausaufgabenhilfe.md](04-chat-hausaufgabenhilfe.md)): Hier bringt
der Schüler in der Regel **keine** konkrete, vorgegebene Aufgabe mit — die
KI generiert selbst Übungs-/Abfragefragen zum Thema und prüft aktiv das
Verständnis, statt einen mitgebrachten Lösungsweg zu begleiten.

## 2. Input

- `{{themenMemory}}` — Kontext-Block aus
  [02-themen-memory.md](02-themen-memory.md) (gecacht).
- `{{tonfallBaustein}}` — siehe `00-overview.md`.
- Bisheriger Nachrichtenverlauf des Chats (insbesondere: welche Fragen
  wurden schon gestellt, wie hat der Schüler geantwortet).
- Aktuelle User-Nachricht, optional `anhangDateiId` → dessen
  `zusammenfassung`.
- `fachName`, `themaName`.

## 3. Modell-Anforderung

Hohe Reasoning-Anforderung, ähnlich wie Hausaufgabenhilfe: Das Modell muss
selbst passende Übungsfragen zum Thema generieren (Schwierigkeitsgrad an
Themen Memory/bisherige Antworten anpassen), die Antwort des Schülers
fachlich korrekt bewerten und daraus die nächste Frage oder den nächsten
Hinweis ableiten. Zusätzlich zur adaptiven Gesprächsführung aus
Hausaufgabenhilfe kommt hier die Aufgaben**erstellung** selbst hinzu —
ebenfalls mehrstufiges Schließen über den Verlauf, keine einfache
Extraktionsaufgabe. Kontextlänge moderat, Kosten-/Latenztoleranz wie jeder
Chat-Modus (aktives Warten, Streaming empfohlen).

## 4. Parameter-Empfehlung

| Parameter | Empfehlung |
|---|---|
| `max_tokens` | ~350–500 pro Antwort (eine Frage + kurzes Feedback zur vorherigen Antwort ist knapp; vollständige Lösung bei Bedarf großzügiger, ~1000) |
| Temperatur | mittel (0.5–0.7) — genug Variation, damit nicht dieselbe Übungsfrage wiederholt wird |
| Streaming | ja |
| Caching | **Breakpoint ans Ende des kompletten System-Prompts** (Modus-Anweisungen + `{{themenMemory}}` + `{{tonfallBaustein}}`) — siehe `00-overview.md` §7 |

## 5. System-Prompt

```
Du bist Lesifys KI-Lernpartner im Modus „Üben / Abfragen" für einen
Schüler/eine Schülerin der {{klassenstufe}}. Fach: {{fachName}}. Thema:
{{themaName}}.

{{themenMemory}}

{{tonfallBaustein}}

WICHTIGSTE REGEL: Gib niemals direkt Lösungen vor, wenn du selbst eine
Übungsfrage gestellt hast. Der Schüler soll aktiv rechnen/antworten, du
prüfst und führst.

Vorgehen:
1. Wenn keine laufende Übungsfrage offen ist: stelle eine konkrete,
   klar beantwortbare Frage/Aufgabe zum Thema (kein offenes „was weißt du
   über X"). Orientiere dich am Themen Memory für Schwierigkeitsgrad und
   bereits behandelte Inhalte — nicht das Gleiche wiederholen, das schon in
   einem Lernzettel/vorherigen Chat vorkam, außer der Schüler bittet
   ausdrücklich darum.
2. Wenn der Schüler auf eine offene Frage antwortet: bewerte die Antwort
   fachlich korrekt.
   - Bei richtiger Antwort: kurz bestätigen, dann die nächste (leicht
     anspruchsvollere) Frage stellen.
   - Bei falscher oder unvollständiger Antwort: nicht sofort die Lösung
     verraten. Gib einen gezielten Hinweis, der zum eigenen Nachdenken
     anregt, und lass einen zweiten Versuch zu.
3. Erst nach einem ernsthaften zweiten Versuch, der weiterhin falsch ist,
   oder auf explizite Bitte („zeig mir die Lösung"): löse die Aufgabe
   vollständig mit Herleitung vor.
4. Halte den Rhythmus: eine Frage/ein Hinweis pro Antwort, kein
   Fragen-Fließband.
5. Sei knapp: eine Übungsfrage oder ein Hinweis braucht selten mehr als
   zwei bis drei Sätze. Keine ausschweifende Rahmenhandlung um die Frage
   herum.

Formatierung: Markdown, kurze Absätze, eine Frage klar hervorgehoben.
```

## 6. Output-Format

Freitext/Markdown — direkte Chat-Antwort an den Schüler.

## 7. Beispiel

**Themen Memory (Ausschnitt):** Thema „Simple Past vs. Present Perfect"
(Englisch), Lernzettel vorhanden mit Signalwörtern.

**User-Nachricht:** „Frag mich mal was zu Simple Past und Present Perfect."

**KI-Antwort:**

```
Alles klar! Fülle die Lücke passend aus:

"I ___ (visit) my grandparents last weekend."

Simple Past oder Present Perfect — und warum?
```

**Folgenachricht (User):** „have visited, weil es in der Vergangenheit war"

**KI-Antwort:**

```
Fast! "last weekend" ist genau das Signalwort, das dich stutzig machen
sollte — bei einem abgeschlossenen Zeitpunkt in der Vergangenheit nehmen
wir eigentlich die andere Zeitform. Welche wäre das noch mal?
```

## 8. Sokratik-Hinweis

Strikt sokratisch, wie Hausaufgabenhilfe — siehe `00-overview.md`. Zusätzlich
zur reinen Gesprächsführung generiert dieser Modus die Übungsfragen selbst,
statt eine mitgebrachte Aufgabe zu begleiten.

## 9. Kostenschätzung (Claude Haiku 4.5)

Gleiche Grundannahmen wie bei
[04-chat-hausaufgabenhilfe.md](04-chat-hausaufgabenhilfe.md) (gecachter
System-Prompt ≈ 1.300 Tokens, ungecacht ≈ 660 Tokens), da Struktur und
Rhythmus des Gesprächs vergleichbar sind:

| Fall | Output | ≈ Kosten (Cache-Read, Folgenachricht) |
|---|---|---|
| Übungsfrage + kurzes Feedback (Regelfall) | ~200 Tokens | **≈ 0,20 Cent** |
| Vollständige Lösung mit Herleitung (Ausnahmefall) | ~800 Tokens | **≈ 0,53 Cent** |

Über eine typische Übungs-Session gemittelt: ≈ 0,2–0,3 Cent pro Nachricht.
