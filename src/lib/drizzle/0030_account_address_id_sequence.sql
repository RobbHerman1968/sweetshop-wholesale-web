SELECT setval(
    pg_get_serial_sequence('"accountAddress"', 'id'),
    GREATEST(
        (SELECT COALESCE(MAX(id), 0) FROM "accountAddress"),
        (SELECT last_value FROM "userAddress_id_seq")
    )
);
