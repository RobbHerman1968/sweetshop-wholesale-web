-- Speed up manage order list filters / customer lookups
CREATE INDEX IF NOT EXISTS order_user_id_idx ON "order" ("userId");
CREATE INDEX IF NOT EXISTS order_address_order_id_idx ON "orderAddress" ("orderId");
CREATE INDEX IF NOT EXISTS user_account_mate_id_upper_idx ON "user" (upper(trim("accountMateId")));
CREATE INDEX IF NOT EXISTS account_account_mate_id_upper_idx ON account (upper(trim("accountMateId")));
