-- CreateEnum
CREATE TYPE "Rolle" AS ENUM ('schueler', 'elternteil');

-- CreateEnum
CREATE TYPE "AboPaket" AS ENUM ('starter', 'premium', 'infinite');

-- CreateEnum
CREATE TYPE "AboArt" AS ENUM ('einzel', 'familie');

-- CreateEnum
CREATE TYPE "AboIntervall" AS ENUM ('monatlich', 'jaehrlich');

-- CreateEnum
CREATE TYPE "AboStatus" AS ENUM ('test', 'aktiv', 'gekuendigt', 'pausiert', 'zahlung_offen');

-- CreateEnum
CREATE TYPE "KiTonfall" AS ENUM ('freundlich', 'direkt', 'motivierend');

-- CreateEnum
CREATE TYPE "ChatModus" AS ENUM ('erklaeren', 'hausaufgaben', 'ueben', 'zusammenfassen');

-- CreateEnum
CREATE TYPE "NachrichtRolle" AS ENUM ('user', 'ai');

-- CreateEnum
CREATE TYPE "DateiTyp" AS ENUM ('pdf', 'doc', 'img');

-- CreateEnum
CREATE TYPE "DateiStatus" AS ENUM ('verarbeitung', 'bereit', 'fehler');

-- CreateEnum
CREATE TYPE "TestklausurStatus" AS ENUM ('erstellt', 'geloest', 'analysiert');

-- CreateEnum
CREATE TYPE "Ampel" AS ENUM ('gruen', 'gelb', 'rot');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "klassenstufe" TEXT NOT NULL,
    "email" TEXT,
    "rolle" "Rolle" NOT NULL,
    "parentUserId" UUID,
    "aboId" UUID,
    "trialEndetAm" TIMESTAMP(3),
    "passwordHash" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Abo" (
    "id" UUID NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "paket" "AboPaket" NOT NULL,
    "art" "AboArt" NOT NULL,
    "sitze" INTEGER NOT NULL,
    "intervall" "AboIntervall" NOT NULL,
    "angebot" TEXT,
    "status" "AboStatus" NOT NULL,
    "trialEndetAm" TIMESTAMP(3),
    "aktuellerZeitraumEnde" DATE NOT NULL,
    "zahlungsanbieterRef" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Abo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Einstellungen" (
    "userId" UUID NOT NULL,
    "erinnerungVorKlausuren" BOOLEAN NOT NULL DEFAULT false,
    "woechentlicheZusammenfassung" BOOLEAN NOT NULL DEFAULT false,
    "kiTonfall" "KiTonfall" NOT NULL DEFAULT 'freundlich',

    CONSTRAINT "Einstellungen_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Fach" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "klasse" TEXT,
    "initial" TEXT NOT NULL,
    "farbe" TEXT NOT NULL,
    "icon" TEXT,

    CONSTRAINT "Fach_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Thema" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fachId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "beschreibung" TEXT NOT NULL,

    CONSTRAINT "Thema_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fachId" UUID NOT NULL,
    "themaId" UUID NOT NULL,
    "titel" TEXT NOT NULL,
    "modus" "ChatModus",
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nachricht" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "chatId" UUID NOT NULL,
    "rolle" "NachrichtRolle" NOT NULL,
    "text" TEXT NOT NULL,
    "anhangDateiId" UUID,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "zaehltGegenLimit" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Nachricht_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lernzettel" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fachId" UUID NOT NULL,
    "themaId" UUID NOT NULL,
    "titel" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "freeMessagesUsed" INTEGER NOT NULL DEFAULT 0,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aktualisiertAm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lernzettel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LernzettelRevision" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "lernzettelId" UUID NOT NULL,
    "rolle" "NachrichtRolle" NOT NULL,
    "text" TEXT NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LernzettelRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Datei" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fachId" UUID NOT NULL,
    "themaId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "typ" "DateiTyp" NOT NULL,
    "groesseBytes" INTEGER NOT NULL,
    "speicherPfad" TEXT NOT NULL,
    "status" "DateiStatus" NOT NULL DEFAULT 'verarbeitung',
    "zusammenfassung" TEXT,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Datei_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Klausur" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "fachId" UUID NOT NULL,
    "themaIds" UUID[],
    "titel" TEXT NOT NULL,
    "datum" DATE NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Klausur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lernplan" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "klausurId" UUID NOT NULL,
    "testklausur1Id" UUID NOT NULL,
    "testklausur2Id" UUID,
    "checklist" JSONB NOT NULL DEFAULT '{}',
    "tageErledigt" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "lernzettel" JSONB,
    "chatMap" JSONB NOT NULL DEFAULT '{}',
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lernplan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testklausur" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "klausurId" UUID,
    "fachId" UUID NOT NULL,
    "themaIds" UUID[],
    "titel" TEXT NOT NULL,
    "status" "TestklausurStatus" NOT NULL DEFAULT 'erstellt',
    "geloesteDateiId" UUID,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Testklausur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Aufgabe" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "testklausurId" UUID NOT NULL,
    "themaId" UUID NOT NULL,
    "frage" TEXT NOT NULL,
    "reihenfolge" INTEGER NOT NULL,

    CONSTRAINT "Aufgabe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestklausurErgebnis" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "testklausurId" UUID NOT NULL,
    "themaId" UUID NOT NULL,
    "prozent" INTEGER NOT NULL,
    "note" DECIMAL(2,1) NOT NULL,
    "erklaerung" TEXT NOT NULL,

    CONSTRAINT "TestklausurErgebnis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vorbereitungsstand" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "testklausurId" UUID NOT NULL,
    "themaId" UUID NOT NULL,
    "prozent" INTEGER NOT NULL,
    "note" DECIMAL(2,1) NOT NULL,
    "ampel" "Ampel" NOT NULL,

    CONSTRAINT "Vorbereitungsstand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usage" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "monat" TEXT NOT NULL,
    "nachrichtenUsed" INTEGER NOT NULL DEFAULT 0,
    "nachrichtenLimit" INTEGER,
    "dateienUsed" INTEGER NOT NULL DEFAULT 0,
    "dateienLimit" INTEGER NOT NULL,
    "lernzettelUsed" INTEGER NOT NULL DEFAULT 0,
    "lernzettelLimit" INTEGER NOT NULL,
    "testklausurenUsed" INTEGER NOT NULL DEFAULT 0,
    "testklausurenLimit" INTEGER NOT NULL,

    CONSTRAINT "Usage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_parentUserId_idx" ON "User"("parentUserId");

-- CreateIndex
CREATE INDEX "User_aboId_idx" ON "User"("aboId");

-- CreateIndex
CREATE INDEX "Abo_ownerUserId_idx" ON "Abo"("ownerUserId");

-- CreateIndex
CREATE INDEX "Fach_userId_idx" ON "Fach"("userId");

-- CreateIndex
CREATE INDEX "Thema_userId_idx" ON "Thema"("userId");

-- CreateIndex
CREATE INDEX "Thema_fachId_idx" ON "Thema"("fachId");

-- CreateIndex
CREATE INDEX "Chat_userId_idx" ON "Chat"("userId");

-- CreateIndex
CREATE INDEX "Chat_fachId_idx" ON "Chat"("fachId");

-- CreateIndex
CREATE INDEX "Chat_themaId_idx" ON "Chat"("themaId");

-- CreateIndex
CREATE INDEX "Chat_aktualisiertAm_idx" ON "Chat"("aktualisiertAm");

-- CreateIndex
CREATE INDEX "Nachricht_userId_idx" ON "Nachricht"("userId");

-- CreateIndex
CREATE INDEX "Nachricht_chatId_idx" ON "Nachricht"("chatId");

-- CreateIndex
CREATE INDEX "Nachricht_anhangDateiId_idx" ON "Nachricht"("anhangDateiId");

-- CreateIndex
CREATE INDEX "Lernzettel_userId_idx" ON "Lernzettel"("userId");

-- CreateIndex
CREATE INDEX "Lernzettel_fachId_idx" ON "Lernzettel"("fachId");

-- CreateIndex
CREATE INDEX "Lernzettel_themaId_idx" ON "Lernzettel"("themaId");

-- CreateIndex
CREATE INDEX "LernzettelRevision_userId_idx" ON "LernzettelRevision"("userId");

-- CreateIndex
CREATE INDEX "LernzettelRevision_lernzettelId_idx" ON "LernzettelRevision"("lernzettelId");

-- CreateIndex
CREATE INDEX "Datei_userId_idx" ON "Datei"("userId");

-- CreateIndex
CREATE INDEX "Datei_fachId_idx" ON "Datei"("fachId");

-- CreateIndex
CREATE INDEX "Datei_themaId_idx" ON "Datei"("themaId");

-- CreateIndex
CREATE INDEX "Datei_status_idx" ON "Datei"("status");

-- CreateIndex
CREATE INDEX "Klausur_userId_idx" ON "Klausur"("userId");

-- CreateIndex
CREATE INDEX "Klausur_fachId_idx" ON "Klausur"("fachId");

-- CreateIndex
CREATE INDEX "Klausur_datum_idx" ON "Klausur"("datum");

-- CreateIndex
CREATE UNIQUE INDEX "Lernplan_klausurId_key" ON "Lernplan"("klausurId");

-- CreateIndex
CREATE UNIQUE INDEX "Lernplan_testklausur1Id_key" ON "Lernplan"("testklausur1Id");

-- CreateIndex
CREATE UNIQUE INDEX "Lernplan_testklausur2Id_key" ON "Lernplan"("testklausur2Id");

-- CreateIndex
CREATE INDEX "Lernplan_userId_idx" ON "Lernplan"("userId");

-- CreateIndex
CREATE INDEX "Testklausur_userId_idx" ON "Testklausur"("userId");

-- CreateIndex
CREATE INDEX "Testklausur_klausurId_idx" ON "Testklausur"("klausurId");

-- CreateIndex
CREATE INDEX "Testklausur_fachId_idx" ON "Testklausur"("fachId");

-- CreateIndex
CREATE INDEX "Testklausur_geloesteDateiId_idx" ON "Testklausur"("geloesteDateiId");

-- CreateIndex
CREATE INDEX "Aufgabe_userId_idx" ON "Aufgabe"("userId");

-- CreateIndex
CREATE INDEX "Aufgabe_testklausurId_idx" ON "Aufgabe"("testklausurId");

-- CreateIndex
CREATE INDEX "Aufgabe_themaId_idx" ON "Aufgabe"("themaId");

-- CreateIndex
CREATE INDEX "TestklausurErgebnis_userId_idx" ON "TestklausurErgebnis"("userId");

-- CreateIndex
CREATE INDEX "TestklausurErgebnis_testklausurId_idx" ON "TestklausurErgebnis"("testklausurId");

-- CreateIndex
CREATE INDEX "TestklausurErgebnis_themaId_idx" ON "TestklausurErgebnis"("themaId");

-- CreateIndex
CREATE INDEX "Vorbereitungsstand_userId_idx" ON "Vorbereitungsstand"("userId");

-- CreateIndex
CREATE INDEX "Vorbereitungsstand_testklausurId_idx" ON "Vorbereitungsstand"("testklausurId");

-- CreateIndex
CREATE INDEX "Vorbereitungsstand_themaId_idx" ON "Vorbereitungsstand"("themaId");

-- CreateIndex
CREATE INDEX "Usage_userId_idx" ON "Usage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Usage_userId_monat_key" ON "Usage"("userId", "monat");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_parentUserId_fkey" FOREIGN KEY ("parentUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_aboId_fkey" FOREIGN KEY ("aboId") REFERENCES "Abo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abo" ADD CONSTRAINT "Abo_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Einstellungen" ADD CONSTRAINT "Einstellungen_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fach" ADD CONSTRAINT "Fach_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thema" ADD CONSTRAINT "Thema_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Thema" ADD CONSTRAINT "Thema_fachId_fkey" FOREIGN KEY ("fachId") REFERENCES "Fach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_fachId_fkey" FOREIGN KEY ("fachId") REFERENCES "Fach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_themaId_fkey" FOREIGN KEY ("themaId") REFERENCES "Thema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nachricht" ADD CONSTRAINT "Nachricht_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nachricht" ADD CONSTRAINT "Nachricht_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nachricht" ADD CONSTRAINT "Nachricht_anhangDateiId_fkey" FOREIGN KEY ("anhangDateiId") REFERENCES "Datei"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lernzettel" ADD CONSTRAINT "Lernzettel_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lernzettel" ADD CONSTRAINT "Lernzettel_fachId_fkey" FOREIGN KEY ("fachId") REFERENCES "Fach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lernzettel" ADD CONSTRAINT "Lernzettel_themaId_fkey" FOREIGN KEY ("themaId") REFERENCES "Thema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LernzettelRevision" ADD CONSTRAINT "LernzettelRevision_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LernzettelRevision" ADD CONSTRAINT "LernzettelRevision_lernzettelId_fkey" FOREIGN KEY ("lernzettelId") REFERENCES "Lernzettel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Datei" ADD CONSTRAINT "Datei_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Datei" ADD CONSTRAINT "Datei_fachId_fkey" FOREIGN KEY ("fachId") REFERENCES "Fach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Datei" ADD CONSTRAINT "Datei_themaId_fkey" FOREIGN KEY ("themaId") REFERENCES "Thema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Klausur" ADD CONSTRAINT "Klausur_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Klausur" ADD CONSTRAINT "Klausur_fachId_fkey" FOREIGN KEY ("fachId") REFERENCES "Fach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lernplan" ADD CONSTRAINT "Lernplan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lernplan" ADD CONSTRAINT "Lernplan_klausurId_fkey" FOREIGN KEY ("klausurId") REFERENCES "Klausur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lernplan" ADD CONSTRAINT "Lernplan_testklausur1Id_fkey" FOREIGN KEY ("testklausur1Id") REFERENCES "Testklausur"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lernplan" ADD CONSTRAINT "Lernplan_testklausur2Id_fkey" FOREIGN KEY ("testklausur2Id") REFERENCES "Testklausur"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testklausur" ADD CONSTRAINT "Testklausur_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testklausur" ADD CONSTRAINT "Testklausur_klausurId_fkey" FOREIGN KEY ("klausurId") REFERENCES "Klausur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testklausur" ADD CONSTRAINT "Testklausur_fachId_fkey" FOREIGN KEY ("fachId") REFERENCES "Fach"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Testklausur" ADD CONSTRAINT "Testklausur_geloesteDateiId_fkey" FOREIGN KEY ("geloesteDateiId") REFERENCES "Datei"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_testklausurId_fkey" FOREIGN KEY ("testklausurId") REFERENCES "Testklausur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Aufgabe" ADD CONSTRAINT "Aufgabe_themaId_fkey" FOREIGN KEY ("themaId") REFERENCES "Thema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestklausurErgebnis" ADD CONSTRAINT "TestklausurErgebnis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestklausurErgebnis" ADD CONSTRAINT "TestklausurErgebnis_testklausurId_fkey" FOREIGN KEY ("testklausurId") REFERENCES "Testklausur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TestklausurErgebnis" ADD CONSTRAINT "TestklausurErgebnis_themaId_fkey" FOREIGN KEY ("themaId") REFERENCES "Thema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vorbereitungsstand" ADD CONSTRAINT "Vorbereitungsstand_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vorbereitungsstand" ADD CONSTRAINT "Vorbereitungsstand_testklausurId_fkey" FOREIGN KEY ("testklausurId") REFERENCES "Testklausur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vorbereitungsstand" ADD CONSTRAINT "Vorbereitungsstand_themaId_fkey" FOREIGN KEY ("themaId") REFERENCES "Thema"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usage" ADD CONSTRAINT "Usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
