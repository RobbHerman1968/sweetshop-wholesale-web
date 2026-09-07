-- Normalize orderindex → "orderIndex" to match camelCase columns (e.g. textValue).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'siteSetting'
          AND column_name = 'orderindex'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'siteSetting'
          AND column_name = 'orderIndex'
    ) THEN
        ALTER TABLE "siteSetting" RENAME COLUMN orderindex TO "orderIndex";
    END IF;
END $$;

ALTER TABLE "siteSetting"
    ADD COLUMN IF NOT EXISTS "orderIndex" integer NOT NULL DEFAULT 1;
