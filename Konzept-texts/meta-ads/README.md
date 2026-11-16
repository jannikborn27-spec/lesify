# Meta-Anzeigen (Facebook/Instagram) — Creatives (Stand 2026-11-16)

9 Karussell-Anzeigen im Format **1:1 (1080 × 1080 px)**, Zielgruppe Eltern von
Schülern ab Klasse 5. Entwurf — Motive und Texte vor dem Schalten prüfen.

Aufbau (Entscheidung 2026-11-16): nur Karussells, um möglichst viel zu erklären;
**3 Verkaufs-Angles × 3 Karussells**. Eltern-Zugang und Elternfragen sind als
eigene Karussells gestrichen.

| ID  | Angle                         | Karten | Idee                                                                  |
| --- | ----------------------------- | ------ | --------------------------------------------------------------------- |
| N1  | Lesify vs. Nachhilfe          | 5      | Was Nachhilfe nicht kann: 24/7, kein Chauffieren, kein Stundensatz, kein Streit |
| N2  | Lesify vs. Nachhilfe          | 5      | Preis & Gegenwert: 1 Std. vs. 30 Tage, Wochenvergleich, Inhalt, Tarife |
| N3  | Lesify vs. Nachhilfe          | 5      | Punkt für Punkt (Vergleichstabelle der Website): Fächer, Klausurvorbereitung, Selbstständigkeit, Ordnung |
| L1  | Lernplan & Klausurvorbereitung | 5     | 7-Tage-Lernplan, Zeitleiste läuft über alle Karten durch              |
| L2  | Lernplan & Klausurvorbereitung | 5     | Testklausur in 4 Schritten: erstellen, auf Papier lösen, Note, üben   |
| L3  | Lernplan & Klausurvorbereitung | 5     | So funktioniert's: Klausur eintragen, Lernplan entsteht, zu Hause lernen |
| F1  | Features                      | 5      | Feature-Tour mit App-Screens: Ordnung, Lernplan, KI-Chat, Lernzettel, Testklausuren |
| F2  | Features                      | 5      | KI-Chat: erklärt statt vorsagt, 4 Modi, Hausaufgabenhilfe, Abfragen   |
| F3  | Features                      | 4      | Lernzettel: verstreuter Stoff → ein Lernzettel, wächst mit, per Chat anpassbar |

Primärtext, Überschrift, Beschreibung und Button je Motiv/Karte stehen in
`creatives.html` (Array `CREATIVES`) und werden in der Feed-Vorschau angezeigt.

## Ansehen

Lokal über einen Server im Repo-Root (Bilder/Fonts kommen aus `marketing/assets`):

```bash
python3 -m http.server 4330
```

- <http://localhost:4330/Konzept-texts/meta-ads/creatives.html> — Feed-Vorschau
- `…?view=motive` — alle Motive nebeneinander
- `…?export` — alle Motive unskaliert; `…?export=L1&n=3` genau eine Karte

## Als PNG exportieren

```bash
bash Konzept-texts/meta-ads/export.sh
```

Schreibt 44 PNGs (1080 × 1080) nach `Konzept-texts/meta-ads/export/`
(per `.gitignore` nicht im Repo — jederzeit neu erzeugbar). Benötigt Google
Chrome unter `/Applications`; anderer Pfad über `CHROME=… bash export.sh`.
Wird ein Karussell um Karten erweitert, die Liste `SLIDES` in `export.sh`
anpassen.

## Hinweise

- Preisaussage (N1-4, N2-1) folgt der Website: „Ein Monat Lesify Premium kostet
  so viel wie eine einzige Nachhilfestunde". Keine konkreten Euro-Beträge im
  Motiv, damit Aktionspreise die Motive nicht veralten lassen.
- Keine erfundenen Bewertungen, Testimonials oder Erfolgsquoten.
- Mathe-Themen und Aufgaben sind Beispielinhalte wie in den App-Screens.
- Vergleichsaussagen (N3) stammen aus der Vergleichstabelle der Website (`marketing/assets/js/marketing.js`, `CMP`/`CMP_VALUE`).
