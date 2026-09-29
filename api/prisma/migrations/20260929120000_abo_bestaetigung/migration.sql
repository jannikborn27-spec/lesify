-- Vertragsbestätigung per E-Mail (§312f BGB, Testdurchgang 2026-09-29):
-- wann die Bestätigung nach dem Abschluss verschickt wurde (einmal je Abo).
ALTER TABLE "Abo" ADD COLUMN     "bestaetigungGesendetAm" TIMESTAMP(3);
