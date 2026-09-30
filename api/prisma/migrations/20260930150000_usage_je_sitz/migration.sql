-- Usage hängt am Platz im Eltern-Abo statt am Kind-Konto (2026-09-30):
-- Kind entfernen + neu anlegen setzte das Monatskontingent zurück.
-- Platz = (Elternkonto, sitzNr). Nutzungs-Zeilen der Kinder werden auf ihren
-- Platz umgehängt und überleben so das Entfernen des Kindes.

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "sitzNr" INTEGER;

-- AlterTable
ALTER TABLE "Usage" ADD COLUMN     "elternId" UUID,
ADD COLUMN     "sitzNr" INTEGER,
ALTER COLUMN "userId" DROP NOT NULL;

-- Bestehende Kind-Profile: Plätze 1, 2, … je Elternkonto nach Anlagedatum.
UPDATE "User" u
SET "sitzNr" = x.nr
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "parentUserId" ORDER BY "createdAt", "id") AS nr
  FROM "User"
  WHERE "parentUserId" IS NOT NULL
) x
WHERE u."id" = x."id";

-- Deren Nutzung auf den Platz umhängen.
UPDATE "Usage" g
SET "elternId" = u."parentUserId", "sitzNr" = u."sitzNr", "userId" = NULL
FROM "User" u
WHERE g."userId" = u."id" AND u."parentUserId" IS NOT NULL AND u."sitzNr" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_parentUserId_sitzNr_key" ON "User"("parentUserId", "sitzNr");

-- CreateIndex
CREATE UNIQUE INDEX "Usage_elternId_sitzNr_monat_key" ON "Usage"("elternId", "sitzNr", "monat");

-- AddForeignKey
ALTER TABLE "Usage" ADD CONSTRAINT "Usage_elternId_fkey" FOREIGN KEY ("elternId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
