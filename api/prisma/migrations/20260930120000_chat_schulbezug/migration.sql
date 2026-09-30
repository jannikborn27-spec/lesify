-- Chats mit ausschließlich themenfremden Fragen (z. B. „Taylor Swift Alben seit
-- 2010“ in Mathe/Bruchrechnung, Testdurchgang 2026-09-30) tauchen nicht mehr in
-- Chat-Liste, Suche, Zählern und KI-Kontext auf. Bestehende Chats bleiben sichtbar.
ALTER TABLE "Chat" ADD COLUMN     "schulbezug" BOOLEAN NOT NULL DEFAULT true;
