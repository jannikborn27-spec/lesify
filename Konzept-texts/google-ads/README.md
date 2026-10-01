# Google Ads — Keyword-Plan (Stand 2026-10-01)

Ziel laut `UMSETZUNGSPLAN.md`: mit kleinem Budget die ersten 2–3 zahlenden Kunden
holen, dann Rentabilität prüfen. Bewusst einfach gehalten: **eine Kampagne, eine
Keyword-Liste, eine Ausschlussliste** (Entscheidung 2026-10-01).

## Dateien

| Datei                   | Inhalt                                                            | Wohin                                                                                         |
| ----------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `keywords.txt`          | 190 Keywords, nur genau passend `[…]` + Wortgruppe `"…"`           | Kampagne „Lesify \| Suche" → Anzeigengruppe → Keywords → einfügen                             |
| `negative-keywords.txt` | Ausschlüsse (Jobs, Gratis, falsche Zielgruppe, Präsenz-Nachhilfe…) | Gemeinsam genutzte Bibliothek → Ausschlusslisten → der Kampagne zuweisen (oder direkt in die Kampagne) |

Beide Dateien enthalten nur Keyword + Match-Type, eine Zeile pro Keyword —
direkt einfügbar. Syntax: `[…]` = genau passend, `"…"` = Wortgruppe, ohne Zeichen
= weitgehend passend (nur in der Ausschlussliste: blockt jede Suche, die das Wort
enthält).

## Kampagnen-Einstellungen

- **Typ:** Suche. Suchpartner + Displaynetzwerk **aus**.
- **Standort:** Deutschland, Option „Präsenz" (nicht „Präsenz oder Interesse").
  **Sprache:** Deutsch.
- **Conversion-Ziel:** `purchase` (deckt Testphase-Start + Sofort-Abo ab).
- **Budget:** ~15–20 €/Tag zum Start.
- **Gebote:** zuerst „Klicks maximieren" mit CPC-Obergrenze (~1,50 €), nach
  10–15 Conversions auf „Conversions maximieren", später Ziel-CPA.
- **Landingpage:** `https://www.lesify.de/`
- **Kein weitgehend passend**, bis Smart Bidding genug Conversions hat (~30 / Monat).
- Keine Konkurrenz-Markennamen (bewusst weggelassen — eigene Kampagne erst, wenn
  die Hauptkampagne rentabel läuft).

## Vor dem Start

- Liste im **Keyword-Planer** (Deutschland, Deutsch) auf Suchvolumen + CPC prüfen;
  Keywords mit „geringes Suchvolumen" pausieren, nicht löschen.
- Fach-Keywords nur mit *online* („mathe nachhilfe online"), weil reine
  „nachhilfe mathe"-Suchen meist Präsenz-Nachhilfe vor Ort wollen.

## Laufende Pflege

- Wöchentlich den **Suchbegriffe-Bericht** lesen: Irrelevantes in
  `negative-keywords.txt` ergänzen, gute neue Begriffe als genau passend in
  `keywords.txt` übernehmen.
- Städtenamen („nachhilfe köln") nicht pauschal ausschließen — erst im
  Suchbegriffe-Bericht schauen, ob sie überhaupt Klicks ziehen.
- „kostenlos/gratis" ist bewusst ausgeschlossen (Testphase braucht Zahlungsdaten).
  Nach 2–3 Wochen prüfen, ob das zu viel abschneidet.
- **Saison:** Budget hoch Ende Okt–Mitte Dez, Jan (vor Halbjahreszeugnis),
  Apr–Juni (Abi + Versetzung); Sommerferien runter.
