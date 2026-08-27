INSERT INTO "siteSetting" ("id", "name", "value", "textValue")
VALUES (4, 'Send Email From', 0, '')
ON CONFLICT ("id") DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('"siteSetting"', 'id'),
    GREATEST((SELECT COALESCE(MAX("id"), 1) FROM "siteSetting"), 4)
);
