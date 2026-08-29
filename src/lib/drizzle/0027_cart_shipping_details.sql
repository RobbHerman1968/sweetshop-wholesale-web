ALTER TABLE cart ADD COLUMN IF NOT EXISTS "shippingMethod" text;
ALTER TABLE cart ADD COLUMN IF NOT EXISTS "expectedDeliveryDate" timestamp with time zone;
