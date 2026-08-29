ALTER TABLE account ADD COLUMN IF NOT EXISTS "isActive" boolean DEFAULT true NOT NULL;

-- Keep the lowest id per AccountMate id and mark later duplicates inactive.
UPDATE account extra
SET "isActive" = false
WHERE nullif(trim(extra."accountMateId"), '') IS NOT NULL
  AND extra.id <> (
      SELECT min(keeper.id)
      FROM account keeper
      WHERE nullif(trim(keeper."accountMateId"), '') IS NOT NULL
        AND upper(trim(keeper."accountMateId")) = upper(trim(extra."accountMateId"))
  );

-- Move carts from inactive duplicates onto the active account when that account has no cart yet.
UPDATE cart c
SET "accountId" = keeper.id,
    "modifiedDate" = now()
FROM account extra
JOIN account keeper
  ON upper(trim(keeper."accountMateId")) = upper(trim(extra."accountMateId"))
 AND keeper."isActive" = true
WHERE c."accountId" = extra.id
  AND extra."isActive" = false
  AND nullif(trim(extra."accountMateId"), '') IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM cart existing
      WHERE existing."accountId" = keeper.id
  );

-- Move saved addresses the same way so checkout follows the cart.
UPDATE "accountAddress" aa
SET "accountId" = keeper.id
FROM account extra
JOIN account keeper
  ON upper(trim(keeper."accountMateId")) = upper(trim(extra."accountMateId"))
 AND keeper."isActive" = true
WHERE aa."accountId" = extra.id
  AND extra."isActive" = false
  AND nullif(trim(extra."accountMateId"), '') IS NOT NULL;
