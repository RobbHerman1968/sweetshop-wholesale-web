ALTER TABLE "order" ADD COLUMN IF NOT EXISTS "accountMateId" text;
CREATE INDEX IF NOT EXISTS order_account_mate_id_upper_idx
  ON "order" (upper(trim("accountMateId")));

ALTER TABLE "accountAddress" ADD COLUMN IF NOT EXISTS "accountMateId" text;
CREATE INDEX IF NOT EXISTS account_address_account_mate_id_upper_idx
  ON "accountAddress" (upper(trim("accountMateId")));

-- Backfill orders from newest log row with an AccountMate id.
UPDATE "order" o
SET "accountMateId" = src."accountMateId"
FROM (
    SELECT DISTINCT ON ("orderId")
        "orderId",
        upper(trim("accountMateId")) AS "accountMateId"
    FROM log
    WHERE "orderId" IS NOT NULL
      AND nullif(trim("accountMateId"), '') IS NOT NULL
    ORDER BY "orderId", id DESC
) src
WHERE o.id = src."orderId"
  AND nullif(trim(o."accountMateId"), '') IS NULL;

-- Backfill orders from the placing user.
UPDATE "order" o
SET "accountMateId" = upper(trim(u."accountMateId"))
FROM "user" u
WHERE o."userId" = u.id
  AND nullif(trim(o."accountMateId"), '') IS NULL
  AND nullif(trim(u."accountMateId"), '') IS NOT NULL;

-- Backfill remaining orders from the lowest-id account matching the user's AccountMate id.
UPDATE "order" o
SET "accountMateId" = src."accountMateId"
FROM (
    SELECT DISTINCT ON (u.id)
        u.id AS "userId",
        upper(trim(a."accountMateId")) AS "accountMateId"
    FROM "user" u
    INNER JOIN account a
        ON lower(trim(coalesce(a."accountMateId", ''))) = lower(trim(u."accountMateId"))
    WHERE nullif(trim(u."accountMateId"), '') IS NOT NULL
      AND nullif(trim(a."accountMateId"), '') IS NOT NULL
    ORDER BY u.id, a.id
) src
WHERE o."userId" = src."userId"
  AND nullif(trim(o."accountMateId"), '') IS NULL;

-- Backfill addresses from the parent account.
UPDATE "accountAddress" aa
SET "accountMateId" = upper(trim(a."accountMateId"))
FROM account a
WHERE aa."accountId" = a.id
  AND nullif(trim(aa."accountMateId"), '') IS NULL
  AND nullif(trim(a."accountMateId"), '') IS NOT NULL;

-- Backfill remaining addresses when accountId is a legacy user/account id.
UPDATE "accountAddress" aa
SET "accountMateId" = upper(trim(u."accountMateId"))
FROM "user" u
WHERE aa."accountId" = u.id
  AND nullif(trim(aa."accountMateId"), '') IS NULL
  AND nullif(trim(u."accountMateId"), '') IS NOT NULL;
