-- Klausur-Erinnerung + Wöchentliche Zusammenfassung komplett entfernt
-- (Entscheidung 2026-09-23) — die Toggles waren nie mit einem Versand verbunden.
ALTER TABLE "Einstellungen" DROP COLUMN "erinnerungVorKlausuren",
DROP COLUMN "woechentlicheZusammenfassung";
