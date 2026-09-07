-- Rename setting id 1 and add Fixed Shipping Percent (settings only; not wired into checkout yet).
UPDATE "siteSetting"
SET "name" = 'Fixed Shipping Amount'
WHERE "id" = 1;

INSERT INTO "siteSetting" ("id", "name", "value", "textValue")
VALUES (8, 'Fixed Shipping Percent', 0, NULL)
ON CONFLICT ("id") DO UPDATE
SET "name" = EXCLUDED."name";

SELECT setval(
    pg_get_serial_sequence('"siteSetting"', 'id'),
    GREATEST((SELECT COALESCE(MAX("id"), 1) FROM "siteSetting"), 8)
);
