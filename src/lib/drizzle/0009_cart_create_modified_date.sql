ALTER TABLE "cart" ADD COLUMN IF NOT EXISTS "createDate" timestamp with time zone DEFAULT now() NOT NULL;
ALTER TABLE "cart" ADD COLUMN IF NOT EXISTS "modifiedDate" timestamp with time zone DEFAULT now() NOT NULL;

UPDATE "cart"
SET "createDate" = now(), "modifiedDate" = now()
WHERE "createDate" IS NULL OR "modifiedDate" IS NULL;
