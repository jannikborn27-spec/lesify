# 10 · Testklausur-Erstellung

> Auch genutzt für **Testklausur 2** eines Lernplans (Tag 5) — identischer Call,
> dort mit `themaIds` beschränkt auf die an Tag 1 schwachen/wackeligen Themen.
> Der Umfang skaliert linear mit der Themenanzahl, sonst keine Unterschiede.

## 1. Zweck & Trigger

Wird beim Anlegen einer Testklausur ausgelöst — Endpunkt
`POST /testklausuren` (siehe §4), mit `{fachId, themaIds, titel, klausurId?}`
im Request. Erzeugt in **einem Call** die komplette Aufgabenliste: pro
`themaId` genau eine `Aufgabe` (siehe §1 „Aufgabe" — nicht Multiple-Choice).
Status wechselt danach auf `erstellt`.

**Wichtig laut §3:** Ein Call für **alle** Aufgaben der Testklausur
zusammen, nicht ein Call pro Thema — auch wenn eine Testklausur mehrere
Themen abdeckt.

## 2. Input

Für jedes `themaId` in `themaIds`:

- **Bevorzugt:** der zugehörige `Lernzettel.content`, falls für dieses
  Thema bereits ein Lernzettel existiert — er ist eine bereits kuratierte,
  kompakte Wissensquelle (siehe
  [08-lernzettel-erstellung.md](08-lernzettel-erstellung.md)) und spart
  gegenüber dem erneuten Verschicken aller Rohchats Kontext-Tokens.
- **Fallback**, falls (noch) kein Lernzettel existiert: vollständige
  Chatverläufe des Themas (wie in
  [08-lernzettel-erstellung.md](08-lernzettel-erstellung.md) beschrieben).
- Alle **Datei-Zusammenfassungen** des Themas (immer mitgeschickt,
  unabhängig davon, ob ein Lernzettel existiert — Dateien können Inhalte
  enthalten, die noch in keinem Chat/Lernzettel verarbeitet wurden).
- `themaName`, `themaBeschreibung` je Thema.
- `fachName`.

> Diese Priorisierung (Lernzettel vor Rohchats) ist eine Umsetzung von
> „Kein Overengineering vor Bedarf" aus `00-overview.md`: der einfache,
> günstigere Fall (Lernzettel vorhanden) wird zuerst genutzt, der teurere
> Fallback nur wenn nötig.

## 3. Modell-Anforderung

Gehobene Reasoning-Anforderung: Das Modell muss pro Thema eine einzelne,
klar formulierte, **nicht** mit Ja/Nein oder Multiple-Choice beantwortbare
Aufgabe entwerfen, die (a) tatsächlich aus dem bereitgestellten Material
herleitbar ist, (b) dem Niveau 8./9. Klasse entspricht, und (c) später
eindeutig bewertbar ist (siehe
[11-testklausur-analyse.md](11-testklausur-analyse.md)). Das ist
anspruchsvoller als reine Zusammenfassung, da hier ein neues, prüfbares
Artefakt (die Aufgabenstellung) entworfen wird — ähnliche Reasoning-Klasse
wie bei den Chat-Modi Erklären/Hausaufgabenhilfe. Kontextlänge: kann groß
werden, da mehrere Themen gleichzeitig im selben Call verarbeitet werden.
Kosten-/Latenztoleranz: Nutzer klickt aktiv „Testklausur erstellen" und
erwartet einen Ladezustand, kein Chat-Tempo.

## 4. Parameter-Empfehlung

| Parameter | Empfehlung |
|---|---|
| `max_tokens` | knapp pro Aufgabe (~150–250 Tokens je Thema) — Gesamtwert skaliert mit `themaIds.length`, z. B. `themaIds.length × 200 + 200` Tokens Puffer für Struktur |
| Temperatur | mittel (0.4–0.5) — Aufgaben sollen sich zwischen Testklausuren unterscheiden, aber fachlich präzise bleiben |
| Streaming | nein — Aufgabenliste soll vollständig und valide geparst werden, bevor sie angezeigt/heruntergeladen wird (siehe `GET /testklausuren/:id/dokument`) |
| Caching | nicht relevant — einmaliger Call pro Testklausur-Erstellung, kein wiederverwendbarer Kontext |

## 5. System-Prompt

```
Du erstellst Aufgaben für eine Testklausur, mit der ein Schüler/eine
Schülerin der {{klassenstufe}} seine/ihre Klausurvorbereitung testet.
Fach: {{fachName}}.

Für jedes der folgenden Themen erstellst du genau EINE Aufgabe:

{{#each themen}}
### Thema: {{themaName}}
{{themaBeschreibung}}

Verfügbares Material:
{{lernzettelOderChats}}

Datei-Zusammenfassungen:
{{dateiZusammenfassungen}}
{{/each}}

Regeln:
1. Pro Thema genau eine Aufgabe — keine Multiple-Choice, keine
   Wahr/Falsch-Fragen. Die Aufgabe muss eine ausformulierte Antwort,
   Rechnung oder Herleitung verlangen.
2. Die Aufgabe muss ausschließlich mit dem bereitgestellten Material zu
   diesem Thema lösbar sein — keine Inhalte abfragen, die dort nicht
   vorkommen.
3. Angemessenes Niveau für {{klassenstufe}}: fordernd, aber nicht über den
   Stoff hinausgehend, der im Material behandelt wurde.
4. Formuliere die Aufgabe so, dass sie eindeutig und ohne
   Interpretationsspielraum bewertbar ist (klare Frage- oder
   Rechenaufgabe, kein offenes „diskutiere …", außer das Thema ist
   inhaltlich eine Erörterung/Analyse — dann trotzdem mit klarer
   Aufgabenstellung, z. B. konkretes Gedicht/konkreter Fall).
5. Keine Lösung/Musterlösung ausgeben — nur die Aufgabenstellung selbst
   (die Auswertung passiert später separat, siehe
   `11-testklausur-analyse.md`).

Antworte ausschließlich über das bereitgestellte Tool.
```

## 6. Output-Format

Strukturierter Output über Tool-Definition (schreibt in die `Aufgabe`-
Tabelle, ein Eintrag pro Thema, siehe §1):

```json
{
  "name": "testklausur_aufgaben",
  "description": "Eine Aufgabe pro Thema für eine neue Testklausur",
  "input_schema": {
    "type": "object",
    "properties": {
      "aufgaben": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "themaId": { "type": "string" },
            "frage": { "type": "string", "description": "Vollständige Aufgabenstellung, keine Lösung" }
          },
          "required": ["themaId", "frage"]
        }
      }
    },
    "required": ["aufgaben"]
  }
}
```

`reihenfolge` (siehe §1) wird vom Backend anhand der Reihenfolge in
`themaIds` vergeben, nicht vom Modell — reine Anzeige-Reihenfolge, keine
inhaltliche Entscheidung.

## 7. Beispiel

**Input:** `themaIds = [bruchrechnung, prozentrechnung]`, Fach Mathematik.
Für „Bruchrechnung" existiert bereits ein Lernzettel, für
„Prozentrechnung" noch keiner (Fallback auf 2 Chatverläufe).

**Output:**

```json
{
  "aufgaben": [
    {
      "themaId": "bruchrechnung",
      "frage": "Berechne 5/6 − 1/4 und gib das Ergebnis vollständig gekürzt an. Zeige deinen Rechenweg (gemeinsamer Nenner, Subtraktion, Kürzen)."
    },
    {
      "themaId": "prozentrechnung",
      "frage": "Ein Fahrrad kostet ursprünglich 320 €. Im Sommerschlussverkauf wird es um 15 % reduziert. Berechne den neuen Preis und zeige, wie du den Rabattbetrag ermittelt hast."
    }
  ]
}
```

## 8. Kostenschätzung (Claude Haiku 4.5)

Kein Caching (Einzel-Call pro Testklausur-Erstellung). Angenommen: 3 Themen,
je Thema ~600 Tokens Material (Lernzettel bevorzugt) + ~200 Tokens
Datei-Zusammenfassungen, System-Prompt ~200 Tokens, Output ~180 Tokens/
Aufgabe.

| Input (System-Prompt + 3× Material) | Output (3 Aufgaben) | ≈ Kosten |
|---|---|---|
| 200 + 3 × (600+200) = ~2.600 Tokens | ~540 Tokens | **≈ 0,53 Cent** |

Skaliert linear mit der Anzahl Themen einer Testklausur — bei 5 Themen
entsprechend ≈ 0,9 Cent.
