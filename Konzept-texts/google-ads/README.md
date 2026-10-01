# Google Ads — Keyword-Plan (Stand 2026-10-01)

Ziel laut `UMSETZUNGSPLAN.md`: mit kleinem Budget die ersten 2–3 zahlenden Kunden
holen, dann Rentabilität prüfen. Deshalb **nur genau passend + Wortgruppe**, kein
weitgehend passend, bis Smart Bidding genug Conversions hat (~30 / Monat).

Conversion-Ziel: `purchase` (deckt Testphase-Start + Sofort-Abo ab, siehe GTM-Setup
im Umsetzungsplan).

## Dateien

| Datei                   | Inhalt                                                       | Import                                                                                     |
| ----------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `keywords.csv`          | 214 Zeilen, 5 Kampagnen / 13 Anzeigengruppen                 | Google Ads Editor → *Konto → Importieren → Aus Datei*, oder *Mehrere Änderungen vornehmen* |
| `negative-keywords.txt` | gemeinsame Ausschlussliste (Jobs, Gratis, falsche Zielgruppe…) | Gemeinsam genutzte Bibliothek → Ausschlusslisten, allen Suchkampagnen zuweisen             |

## Kampagnen & Priorität

| Prio | Kampagne                          | Warum                                                                                                                            | Landingpage                                |
| ---- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1    | **Brand**                         | billig, schützt den Namen vor Konkurrenz-Geboten                                                                                 | `/`                                        |
| 1    | **Nachhilfe-Alternative**         | Kern-Positionierung („statt teurer Nachhilfe"), Käufer sind Eltern mit Zahlungsbereitschaft. Hier das meiste Budget.            | `/` (Vergleich „30 Tage vs. 1 Stunde")     |
| 2    | **KI-Lernapp**                    | wachsende Suchen, aber viele Schüler ohne Zahlungsmittel → genau auf CPA achten                                                   | `/`                                        |
| 2    | **Klausurvorbereitung**           | trifft das Produkt am genauesten (Lernplan, Testklausuren, Lernzettel). Stark saisonal: vor Klausurphasen hochfahren.            | `/`                                        |
| 3    | **Konkurrenz (optional)**         | erst pausiert anlegen; Markennamen **nie im Anzeigentext** verwenden (Markenrecht). Teuer, oft schwache Relevanz.               | `/preise/`                                 |

Startbudget-Vorschlag: Brand ~2 €/Tag, Nachhilfe-Alternative ~10 €/Tag,
KI-Lernapp + Klausurvorbereitung je ~5 €/Tag. Gebotsstrategie zu Beginn
„Klicks maximieren" mit CPC-Obergrenze (~1,50 €), nach den ersten
10–15 Conversions auf „Conversions maximieren" bzw. Ziel-CPA umstellen.

## Was vor dem Start noch fehlt

- **Suchvolumen + CPC prüfen:** Liste in den Keyword-Planer laden (Deutschland,
  Deutsch). Keywords mit „geringes Suchvolumen" pausieren, nicht löschen.
- **Ausrichtung:** Standort Deutschland (ggf. + AT/CH, falls Preise/Recht passen),
  Option „Präsenz" statt „Präsenz oder Interesse". Sprache Deutsch.
- **Suchpartner + Displaynetzwerk aus** in allen Suchkampagnen.
- Fach-Keywords („mathe nachhilfe online") nur mit *online*, weil reine
  „nachhilfe mathe"-Suchen meist Präsenz-Nachhilfe vor Ort wollen.

## Laufende Pflege

- Wöchentlich den **Suchbegriffe-Bericht** lesen: Irrelevantes in
  `negative-keywords.txt` ergänzen, gute neue Begriffe als genau passend übernehmen.
- „kostenlos/gratis" ist bewusst ausgeschlossen (Testphase braucht Zahlungsdaten).
  Nach 2–3 Wochen prüfen, ob das zu viel abschneidet.
- **Saison:** Budget hoch Ende Okt–Mitte Dez, Jan (vor Halbjahreszeugnis),
  Apr–Juni (Abi + Versetzung); Sommerferien runter. Schuljahresstart-Rabatt
  (−20 %) in die Anzeigentexte, solange er läuft.
