/*
  Warnings:

  - You are about to drop the column `kostenEurCent` on the `KiKosten` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "KiKosten" DROP COLUMN "kostenEurCent",
ADD COLUMN     "kostenEurMikro" INTEGER NOT NULL DEFAULT 0;
