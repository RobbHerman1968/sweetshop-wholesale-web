-- user.id becomes integer (legacy Account.Id). account.userId follows.
-- After applying: run Sync Users, then Sync Accounts from the manage dashboard.

ALTER TABLE "account" DROP CONSTRAINT IF EXISTS "account_userId_user_id_fk";

ALTER TABLE "user" DROP COLUMN IF EXISTS "accountId";

DELETE FROM "account";
DELETE FROM "user";

ALTER TABLE "user" ALTER COLUMN "id" TYPE integer USING "id"::integer;
ALTER TABLE "account" ALTER COLUMN "userId" TYPE integer USING "userId"::integer;

ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk"
    FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
