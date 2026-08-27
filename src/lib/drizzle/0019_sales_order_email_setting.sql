-- Sales Order Email Address is site setting id 6 (formerly Copy Order Email Address).
-- Keep name aligned for manage UI.
UPDATE "siteSetting"
SET "name" = 'Sales Order Email Address'
WHERE "id" = 6;

-- Remove unused duplicate row if present and empty.
DELETE FROM "siteSetting"
WHERE "id" = 8
  AND ("textValue" IS NULL OR btrim("textValue") = '');
