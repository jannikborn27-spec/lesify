-- Abo zählt erst, wenn beim Zahlungsanbieter ein Zahlungsmittel hinterlegt ist
-- (Testdurchgang 2026-09-29: abgebrochene Kasse / abgelehnte Karte ergab sonst
-- eine volle Testphase ohne Zahlungsmittel). Bestehende Abos gelten als
-- abgeschlossen.
ALTER TABLE "Abo" ADD COLUMN     "abgeschlossenAm" TIMESTAMP(3);
UPDATE "Abo" SET "abgeschlossenAm" = "erstelltAm" WHERE "abgeschlossenAm" IS NULL;
