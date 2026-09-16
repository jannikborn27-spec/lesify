-- CreateTable
CREATE TABLE "KiKosten" (
    "id" UUID NOT NULL,
    "monat" TEXT NOT NULL,
    "callTyp" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheReadTokens" INTEGER NOT NULL DEFAULT 0,
    "cacheCreationTokens" INTEGER NOT NULL DEFAULT 0,
    "kostenEurCent" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "KiKosten_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KiKosten_monat_idx" ON "KiKosten"("monat");

-- CreateIndex
CREATE UNIQUE INDEX "KiKosten_monat_callTyp_model_key" ON "KiKosten"("monat", "callTyp", "model");
