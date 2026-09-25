-- Kind-Profile können sich ohne E-Mail mit einem von den Eltern vergebenen
-- Benutzernamen anmelden (Entscheidung 2026-09-25).
ALTER TABLE "User" ADD COLUMN "benutzername" TEXT;

CREATE UNIQUE INDEX "User_benutzername_key" ON "User"("benutzername");
