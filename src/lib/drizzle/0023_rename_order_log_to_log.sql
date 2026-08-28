-- Rename orderLog → log (general activity / error log used by Manage → Log).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'orderLog'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'log'
    ) THEN
        ALTER TABLE "orderLog" RENAME TO "log";
    END IF;
END $$;

ALTER INDEX IF EXISTS "orderLog_createdAt_idx" RENAME TO "log_createdAt_idx";
ALTER INDEX IF EXISTS "orderLog_orderId_idx" RENAME TO "log_orderId_idx";
ALTER INDEX IF EXISTS "orderLog_accountId_idx" RENAME TO "log_accountId_idx";
ALTER INDEX IF EXISTS "orderLog_outcome_idx" RENAME TO "log_outcome_idx";

CREATE INDEX IF NOT EXISTS "log_createdAt_idx" ON "log" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "log_orderId_idx" ON "log" ("orderId");
CREATE INDEX IF NOT EXISTS "log_accountId_idx" ON "log" ("accountId");
CREATE INDEX IF NOT EXISTS "log_outcome_idx" ON "log" ("outcome");
