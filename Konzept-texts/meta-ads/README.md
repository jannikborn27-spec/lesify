# Meta-Anzeigen (Facebook/Instagram) — Creatives (Stand 2026-11-16)

10 Karussell-Anzeigen im Format **1:1 (1080 × 1080 px)**, Zielgruppe Eltern
von Schülern ab Klasse 5. Entwurf — Motive und Texte vor dem Schalten prüfen.
Bewusst nur Karussells, um möglichst viel erklären zu können (Entscheidung
2026-11-16; die früheren Einzelbilder E1–E5 stecken jetzt als erste Karte in
K6–K10).

| ID  | Karten | Idee                                                                 |
| --- | ------ | -------------------------------------------------------------------- |
| K1  | 5      | 7-Tage-Lernplan, Zeitleiste läuft über alle Karten durch             |
| K2  | 5      | Nachhilfe vs. Lesify, vier Alltagspunkte                             |
| K3  | 5      | Feature-Tour mit echten App-Screens                                  |
| K4  | 5      | 4 Elternfragen (Hausaufgaben, Klassenstufe, Datenschutz, Kündigung)  |
| K5  | 4      | Vorher/Nachher: verstreuter Stoff → ein Lernzettel                   |
| K6  | 5      | KI-Chat: erklärt statt vorsagt, die 4 Modi, Hausaufgaben, Abfragen   |
| K7  | 5      | Eltern-Zugang: Aktivität sichtbar, Inhalte privat                    |
| K8  | 5      | Preis & Gegenwert: 1 Std. Nachhilfe vs. 30 Tage, Wochenvergleich, Tarife |
| K9  | 5      | Testklausur in 4 Schritten: erstellen, auf Papier lösen, Note, üben  |
| K10 | 5      | So funktioniert Lesify: eintragen, Lernplan, zu Hause lernen         |

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

Schreibt 49 PNGs (1080 × 1080) nach `Konzept-texts/meta-ads/export/`
(per `.gitignore` nicht im Repo — jederzeit neu erzeugbar). Benötigt Google
Chrome unter `/Applications`; anderer Pfad über `CHROME=… bash export.sh`.
Wird ein Karussell um Karten erweitert, die Liste `SLIDES` in `export.sh`
anpassen.

## Hinweise

- Preisaussage (K2-4, K8-1) folgt der Website: „Ein Monat Lesify Premium kostet
  so viel wie eine einzige Nachhilfestunde". Keine konkreten Euro-Beträge im
  Motiv, damit Aktionspreise die Motive nicht veralten lassen.
- Keine erfundenen Bewertungen, Testimonials oder Erfolgsquoten.
- Namen (Lena, Jonas, Mia) und Mathe-Themen sind Beispielinhalte wie in den App-Screens.
- Eltern-Zugang (K7): zeigt nur Aktivitäts-Zähler und Klausurtermine — **keine**
  Chat-/Lernzettel-Inhalte und keine Ergebnisse (`eltern-zugang-plan.md`). Motive
  dürfen nichts anderes versprechen.
