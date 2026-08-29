SELECT
    setval(
        pg_get_serial_sequence('"order"', 'id'),
        GREATEST(
            (SELECT COALESCE(MAX(id), 49999) FROM "order"),
            49999
        )
    ),
    setval(
        pg_get_serial_sequence('"orderItem"', 'id'),
        GREATEST((SELECT COALESCE(MAX(id), 1) FROM "orderItem"), 1)
    ),
    setval(
        pg_get_serial_sequence('"orderAddress"', 'id'),
        GREATEST((SELECT COALESCE(MAX(id), 1) FROM "orderAddress"), 1)
    );
