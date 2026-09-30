-- Deutsch, Mathematik und Englisch sind ab 2026-09-30 in jedem Schüler-Konto
-- schon angelegt (neue Konten: `POST /abo/kinder`, `lib/standardFaecher.ts`).
-- Bestandskonten ohne ein einziges Fach bekommen sie hier nachträglich —
-- Konten mit eigenen Fächern bleiben unangetastet (keine Dubletten).
INSERT INTO "Fach" ("id", "userId", "name", "initial", "farbe", "icon")
SELECT gen_random_uuid(), u."id", f."name", f."initial", f."farbe", f."icon"
FROM "User" u
CROSS JOIN (VALUES
  ('Deutsch', 'D', 'rose', 'deutsch'),
  ('Mathematik', 'M', 'blue', 'mathematik'),
  ('Englisch', 'E', 'amber', 'englisch')
) AS f("name", "initial", "farbe", "icon")
WHERE u."rolle" = 'schueler'
  AND NOT EXISTS (SELECT 1 FROM "Fach" x WHERE x."userId" = u."id");
