-- Internal storage for /manage/homepage-setup (not shown in Site Settings).
INSERT INTO "siteSetting" ("id", "name", "value", "textValue")
VALUES (7, 'Homepage Content', 0, NULL)
ON CONFLICT ("id") DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('"siteSetting"', 'id'),
    GREATEST((SELECT COALESCE(MAX("id"), 1) FROM "siteSetting"), 7)
);
