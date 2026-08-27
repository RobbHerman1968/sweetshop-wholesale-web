INSERT INTO "siteSetting" ("id", "name", "value", "textValue")
VALUES (5, 'Developer Email Address', 0, '')
ON CONFLICT ("id") DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('"siteSetting"', 'id'),
    GREATEST((SELECT COALESCE(MAX("id"), 1) FROM "siteSetting"), 5)
);
