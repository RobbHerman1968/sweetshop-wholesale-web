SELECT setval(
    pg_get_serial_sequence('"menuItem"', 'id'),
    (SELECT COALESCE(MAX(id), 0) FROM "menuItem")
);
