-- Lernzettel-Revisionen zählen wie normale Chat-Nachrichten: kein Gratis-Kontingent mehr.
ALTER TABLE "Lernzettel" DROP COLUMN "freeMessagesUsed";
