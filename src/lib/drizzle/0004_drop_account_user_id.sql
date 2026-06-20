ALTER TABLE "account" DROP CONSTRAINT IF EXISTS "account_userId_user_id_fk";
ALTER TABLE "account" DROP COLUMN IF EXISTS "userId";
