ALTER TABLE "stateShippingTaxRate" ADD COLUMN IF NOT EXISTS "stateName" text DEFAULT '' NOT NULL;
