# 03 · Chat-Modus: Erklären

## 1. Zweck & Trigger

Wird bei **jeder Nachricht** in einem Chat mit `modus: erklaeren` ausgelöst
— Endpunkt `POST /chats/:id/nachrichten` (siehe §4). Dieser Modus wird laut
`Ki Chat.pdf` schon bei Chat-Start als erste Auswahl abgefragt („Thema
Erklären") und bestimmt den System-Prompt für die gesamte Chat-Dauer.

## 2. Input

- `{{themenMemory}}` — der Kontext-Block aus
  [02-themen-memory.md](02-themen-memory.md) (gecacht, siehe dort).
- `{{tonfallBaustein}}` — passend zu `Einstellungen.kiTonfall`, siehe
  `00-overview.md`.
- Bisheriger Nachrichtenverlauf des Chats (`rolle`/`text` je Nachricht).
- Aktuelle User-Nachricht (`text`), optional `anhangDateiId` → dessen
  gespeicherte `zusammenfassung` (nie die Rohdatei erneut).
- `fachName`, `themaName`.

## 3. Modell-Anforderung

Mittlere bis gehobene Reasoning-Anforderung: Das Modell muss eine
verständliche, didaktisch saubere Herleitung entlang eines Beispiels
aufbauen (nicht nur Fakten abrufen) und dabei den Schwierigkeitsgrad an eine
8./9.-Klasse-Zielgruppe anpassen. Kontextlänge: moderat bis groß, da der
komplette (ggf. bereits verdichtete) Themen-Memory-Block plus
Chatverlauf mitläuft. Kosten-/Latenztoleranz: Nutzer wartet aktiv auf eine
Antwort im Chat — Latenz sollte klein bleiben, Streaming ist hier deshalb
wichtig (siehe Abschnitt 4), nicht die Modellwahl selbst.

## 4. Parameter-Empfehlung

| Parameter | Empfehlung |
|---|---|
| `max_tokens` | ~700–1000 (eine vollständige Erklärung inkl. Beispiel; knapper als zunächst vermutet, weil Regel 6 im System-Prompt unnötige Länge explizit ausschließt) |
| Temperatur | mittel (0.5–0.7) — genug Variation für unterschiedliche Beispiele, aber keine Fantasie bei Fakten/Formeln |
| Streaming | ja — Chat-UI zeigt die Antwort token-weise an |
| Caching | **Breakpoint ans Ende des kompletten System-Prompts** (Modus-Anweisungen + `{{themenMemory}}` + `{{tonfallBaustein}}`), nicht nur auf Themen Memory/Tonfall — alles davon ist über die Chat-Dauer stabil, nur `messages` (Verlauf + aktuelle Nachricht) ändert sich pro Call. Siehe `00-overview.md` §7 für die Kostenwirkung. |

## 5. System-Prompt

```
Du bist Lesifys KI-Lernpartner im Modus „Erklären" für einen Schüler/eine
Schülerin der {{klassenstufe}}. Fach: {{fachName}}. Thema: {{themaName}}.

{{themenMemory}}

{{tonfallBaustein}}

Deine Aufgabe: den angefragten Sachverhalt so erklären, dass er wirklich
verstanden wird — nicht nur eine Definition herunterrasseln.

Vorgehen:
1. Baue die Erklärung an einem konkreten Beispiel oder einer Beispielaufgabe
   auf (siehe Themen Memory für passende Beispiele aus Dateien/Lernzetteln),
   statt die fertige Regel/Definition direkt hinzuwerfen.
2. Geh Schritt für Schritt vor: erst kurz einordnen (worum geht es, warum
   ist das relevant), dann die Herleitung entlang des Beispiels, erst am
   Ende die kompakte Regel/Zusammenfassung.
3. Wenn im Themen Memory erkennbar ist, dass der Schüler verwandte Inhalte
   schon kennt, knüpfe explizit daran an, statt bei null anzufangen.
4. Ist die Anfrage sehr breit („erklär mir Bruchrechnung"), wähle selbst
   einen sinnvollen Einstieg (z. B. den Kernbegriff/die häufigste
   Fehlerquelle) statt nur mit einer Rückfrage zu antworten — frag höchstens
   ergänzend nach, worauf der Fokus liegen soll.
5. Biete am Ende proaktiv eine weitere Beispielaufgabe oder Vertiefung an.
6. Sei prägnant: erkläre so knapp wie möglich, ohne fachlich zu kürzen.
   Wiederhole die Frage des Schülers nicht in eigenen Worten, bevor du
   antwortest, und häng keine zusätzlichen Absätze an, die nichts Neues
   beitragen.

Formatierung: Markdown, kurze Absätze, Formeln in Inline-Code oder
Codeblock, keine tief verschachtelten Listen.
```

## 6. Output-Format

Freitext/Markdown — direkte Chat-Antwort an den Schüler, kein
strukturiertes Schema (siehe Prinzip 2 in `00-overview.md`: nur die
eigentlichen Chat-Antworten bleiben Freitext).

## 7. Beispiel

**Themen Memory (Ausschnitt):** Thema „Lineare Gleichungen" (Mathematik),
kein Lernzettel bisher, ein Chat-Titel „Wie löse ich 2x + 5 = 13?"
(Modus `hausaufgaben`).

**User-Nachricht:** „Kannst du mir erklären, was ein
Gleichungssystem ist?"

**KI-Antwort (gekürzt):**

```
Stell dir vor, du kaufst 2 Hefte und 3 Stifte für 13 €, deine Freundin
3 Hefte und 1 Stift für 11 €. Weder du noch sie wisst, was ein Heft oder
ein Stift einzeln kostet — aber ihr habt zwei Infos gleichzeitig.

Genau das ist ein **Gleichungssystem**: zwei (oder mehr) Gleichungen mit
denselben Unbekannten, die gleichzeitig gelten müssen.

Als Gleichungen aufgeschrieben:
2h + 3s = 13
3h + 1s = 11

… (Herleitung per Einsetzungsverfahren) …

**Kurz gesagt:** Ein Gleichungssystem hat so viele Gleichungen wie
Unbekannte, und eine Lösung ist der Wert, der alle Gleichungen gleichzeitig
erfüllt.

Willst du das an einer eigenen Aufgabe durchrechnen?
```

## 8. Sokratik-Hinweis

Nicht strikt sokratisch — Prinzip laut `00-overview.md`: Herleitung vor
Ergebnis, entlang eines Beispiels Schritt für Schritt aufgebaut, aber ohne
den Schüler zwingend selbst rechnen zu lassen, bevor die KI antwortet.

## 9. Kostenschätzung (Claude Haiku 4.5)

Annahmen: gecachter System-Prompt (Modus + Themen Memory + Tonfall) ≈ 1.300
Tokens, ungecachter Anteil (Chatverlauf + aktuelle Nachricht) ≈ 660 Tokens,
Output ≈ 700 Tokens (innerhalb des `max_tokens`-Rahmens aus Abschnitt 4).

| Fall | Cache-Anteil | Ungecacht | Output | ≈ Kosten |
|---|---|---|---|---|
| Erste Nachricht im Chat (Cache-Write, 5-Min-TTL) | 1.300 × 1,25 = 1.625 „billed" | 660 | 700 | **≈ 0,58 Cent** |
| Folgenachrichten (Cache-Read) | 1.300 × 0,1 = 130 „billed" | 660 | 700 | **≈ 0,43 Cent** |

Bei den Platzhaltern aus §7 (100 Nachrichten/Monat, verteilt auf alle vier
Modi) liegt „Erklären" damit bei grob 0,4–0,6 Cent pro Nachricht — siehe
`00-overview.md` §7 für die Hochrechnung über alle Modi hinweg.
