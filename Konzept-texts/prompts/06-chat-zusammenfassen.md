# 06 · Chat-Modus: Zusammenfassen

## 1. Zweck & Trigger

Wird bei **jeder Nachricht** in einem Chat mit `modus: zusammenfassen`
ausgelöst — Endpunkt `POST /chats/:id/nachrichten` (siehe §4).

## 2. Input

- `{{themenMemory}}` — Kontext-Block aus
  [02-themen-memory.md](02-themen-memory.md) (gecacht).
- `{{tonfallBaustein}}` — siehe `00-overview.md`.
- Bisheriger Nachrichtenverlauf des Chats.
- Aktuelle User-Nachricht, optional `anhangDateiId` → dessen
  `zusammenfassung`.
- `fachName`, `themaName`.

## 3. Modell-Anforderung

Niedrigste Reasoning-Anforderung unter den vier Chat-Modi: reine
Kompression/Strukturierung von bereits vorliegendem Wissen (Themen Memory,
ggf. angehängte Datei), kein adaptives Tutoring, kein Herleiten neuer
Beispiele. Kontextlänge kann trotzdem groß sein (viele Lernzettel/Dateien
im Themen Memory), daher zählt Long-Context-Verständnis mehr als
Reasoning-Tiefe. Kosten-/Latenztoleranz wie jeder Chat-Modus (aktives
Warten, Streaming empfohlen) — aber die Aufgabe selbst würde auch eine
günstigere Modellklasse mit ausreichendem Kontextfenster zulassen, sofern
die App hier bewusst Kosten sparen will.

## 4. Parameter-Empfehlung

| Parameter | Empfehlung |
|---|---|
| `max_tokens` | ~400–600 — eine gute Zusammenfassung ist per Definition kompakt, nicht so großzügig wie eine volle Erklärung |
| Temperatur | niedrig (0.2–0.4) — Faktentreue vor Stilvielfalt |
| Streaming | ja |
| Caching | **Breakpoint ans Ende des kompletten System-Prompts** (Modus-Anweisungen + `{{themenMemory}}` + `{{tonfallBaustein}}`) — siehe `00-overview.md` §7. Günstigster Chat-Modus im Set: niedrige Temperatur und kompakter Output halten auch die ungecachte Seite klein. |

## 5. System-Prompt

```
Du bist Lesifys KI-Lernpartner im Modus „Zusammenfassen" für einen
Schüler/eine Schülerin der {{klassenstufe}}. Fach: {{fachName}}. Thema:
{{themaName}}.

{{themenMemory}}

{{tonfallBaustein}}

Deine Aufgabe: eine kompakte, direkte Zusammenfassung liefern — kein
Dialog, keine Rückfragen, kein sokratisches Vorgehen. Der Schüler will
schnell den Überblick, nicht selbst etwas herleiten.

Vorgehen:
1. Fasse genau das zusammen, wonach gefragt wird (ganzes Thema, ein
   bestimmter Aspekt, eine angehängte Datei) — nutze dafür in erster Linie
   den Themen-Memory-Kontext und ggf. die angehängte Datei-Zusammenfassung.
2. Priorisiere nach Relevanz: zentrale Begriffe/Regeln zuerst, Details und
   Sonderfälle danach.
3. Nutze Stichpunkte/kurze Absätze statt langer Fließtext-Abschnitte.
4. Erfinde keine Inhalte, die nicht aus dem Themen Memory oder der Anfrage
   hervorgehen — bei Lücken lieber knapp benennen, was fehlt, statt zu
   raten.
5. Keine Zwischenfragen wie „Willst du, dass ich …?" — liefere direkt das
   Ergebnis. Rückfragen nur, wenn die Anfrage tatsächlich mehrdeutig ist
   (z. B. unklar, welches von zwei Themen gemeint ist).
6. Kürzer ist besser als vollständiger: lieber die wichtigsten Punkte knapp
   als alles lückenlos, aber langatmig.

Formatierung: Markdown, klare Überschriften/Stichpunkte, kompakt.
```

## 6. Output-Format

Freitext/Markdown — direkte Chat-Antwort an den Schüler.

## 7. Beispiel

**Themen Memory (Ausschnitt):** Thema „Zellbiologie" (Biologie), Lernzettel
„Zellorganellen" vorhanden.

**User-Nachricht:** „Fass mir das Thema Zellbiologie kurz zusammen."

**KI-Antwort:**

```
**Zellbiologie — kurz zusammengefasst**

- **Zellkern:** enthält das Erbgut (DNA), steuert die Zelle
- **Mitochondrien:** „Kraftwerke der Zelle", Energiegewinnung
- **Nur bei Pflanzenzellen zusätzlich:**
  - Chloroplasten: Fotosynthese
  - Zellwand: Stabilität/Form

**Merksatz:** Tierzellen haben Zellkern + Mitochondrien, Pflanzenzellen
zusätzlich Chloroplasten und Zellwand.
```

## 8. Sokratik-Hinweis

Bewusst **ausgeschaltet** — siehe `00-overview.md`, Prinzip „Sokratisches
Lernen": Nutzer will eine kompakte, direkte Zusammenfassung, kein
sokratischer Dialog.

## 9. Kostenschätzung (Claude Haiku 4.5)

Annahmen: gecachter System-Prompt ≈ 1.300 Tokens, ungecacht ≈ 660 Tokens,
Output ≈ 450 Tokens (kompakt per Systemvorgabe).

| Fall | ≈ Kosten |
|---|---|
| Erste Nachricht im Chat (Cache-Write) | ≈ 0,38 Cent |
| Folgenachrichten (Cache-Read) | ≈ 0,30 Cent |

Günstigster der vier Chat-Modi — sowohl wegen der niedrigen Temperatur
(kein Grund für lange, ausschweifende Antworten) als auch wegen des
niedrigsten `max_tokens`-Rahmens im Set.
