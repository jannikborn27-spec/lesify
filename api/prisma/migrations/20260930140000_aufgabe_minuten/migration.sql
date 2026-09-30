-- Testklausur auf ca. 30 Minuten statt fest eine Aufgabe pro Thema
-- (2026-09-30): Zeitschätzung + Bewertung je Aufgabe. Bestehende Aufgaben
-- bleiben ohne Werte (Frontend fällt auf die Bewertung je Thema zurück).
ALTER TABLE "Aufgabe" ADD COLUMN "minuten" INTEGER,
ADD COLUMN "prozent" INTEGER,
ADD COLUMN "erklaerung" TEXT;
