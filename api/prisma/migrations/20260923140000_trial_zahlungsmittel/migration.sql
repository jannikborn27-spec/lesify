-- Testphase einmal je Zahlungsmittel (Entscheidung 2026-09-23).
CREATE TABLE "TrialZahlungsmittel" (
    "kennungHash" TEXT NOT NULL,
    "aboId" UUID NOT NULL,
    "erstelltAm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrialZahlungsmittel_pkey" PRIMARY KEY ("kennungHash")
);
