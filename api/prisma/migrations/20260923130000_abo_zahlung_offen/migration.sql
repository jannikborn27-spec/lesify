-- Zahlung offen: 30-Tage-Frist bis zur Löschung (Entscheidung 2026-09-23).
ALTER TABLE "Abo" ADD COLUMN "zahlungOffenSeit" TIMESTAMP(3),
ADD COLUMN "loeschWarnungAm" TIMESTAMP(3);
