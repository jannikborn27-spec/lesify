-- CreateEnum
CREATE TYPE "DateiZweck" AS ENUM ('thema', 'testklausurLoesung');

-- AlterTable
ALTER TABLE "Datei" ADD COLUMN     "zweck" "DateiZweck" NOT NULL DEFAULT 'thema';
