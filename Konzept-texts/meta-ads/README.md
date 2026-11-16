# Meta-Anzeigen (Facebook/Instagram) — Creatives (Stand 2026-11-16)

10 Anzeigenmotive im Format **1:1 (1080 × 1080 px)**, Zielgruppe Eltern von
Schülern ab Klasse 5. Entwurf — Motive und Texte vor dem Schalten prüfen.

| ID | Format             | Idee                                                               |
| -- | ------------------ | ------------------------------------------------------------------ |
| E1 | Einzelbild         | Preisvergleich: 1 Std. Nachhilfe = 30 Tage Lesify Premium           |
| E2 | Einzelbild         | Kernversprechen der Website (Hero) + Tablet-Mockup                 |
| E3 | Einzelbild (dunkel)| KI-Chat: „erklärt statt vorsagt" (Hausaufgaben-Modus)              |
| E4 | Einzelbild         | Testklausur-Auswertung mit Ampel: Lücken finden                    |
| E5 | Einzelbild (Foto)  | Eltern: selbstständig lernen, trotzdem im Bild (Eltern-Zugang)     |
| K1 | Karussell, 5 Karten| 7-Tage-Lernplan, Zeitleiste läuft über alle Karten durch           |
| K2 | Karussell, 5 Karten| Nachhilfe vs. Lesify, vier Alltagspunkte                           |
| K3 | Karussell, 5 Karten| Feature-Tour mit echten App-Screens                                |
| K4 | Karussell, 5 Karten| 4 Elternfragen (Hausaufgaben, Klassenstufe, Datenschutz, Kündigung) |
| K5 | Karussell, 4 Karten| Vorher/Nachher: verstreuter Stoff → ein Lernzettel                 |

Primärtext, Überschrift, Beschreibung und Button je Motiv/Karte stehen in
`creatives.html` (Array `CREATIVES`) und werden in der Feed-Vorschau angezeigt.

## Ansehen

Lokal über einen Server im Repo-Root (Bilder/Fonts kommen aus `marketing/assets`):

```bash
python3 -m http.server 4330
```

- <http://localhost:4330/Konzept-texts/meta-ads/creatives.html> — Feed-Vorschau
- `…?view=motive` — alle Motive nebeneinander
- `…?export` — alle Motive unskaliert; `…?export=K1&n=3` genau eine Karte

## Als PNG exportieren

```bash
bash Konzept-texts/meta-ads/export.sh
```

Schreibt 29 PNGs (1080 × 1080) nach `Konzept-texts/meta-ads/export/`
(per `.gitignore` nicht im Repo — jederzeit neu erzeugbar). Benötigt Google
Chrome unter `/Applications`; anderer Pfad über `CHROME=… bash export.sh`.
Wird ein Karussell um Karten erweitert, die Liste `SLIDES` in `export.sh`
anpassen.

## Hinweise

- Preisaussage (E1, K2-4) folgt der Website: „Ein Monat Lesify Premium kostet
  so viel wie eine einzige Nachhilfestunde". Keine konkreten Euro-Beträge im
  Motiv, damit Aktionspreise die Motive nicht veralten lassen.
- Keine erfundenen Bewertungen, Testimonials oder Erfolgsquoten.
- „Lena" (E5) und die Mathe-Themen sind Beispielinhalte wie in den App-Screens.
