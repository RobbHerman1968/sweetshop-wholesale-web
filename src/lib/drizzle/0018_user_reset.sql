CREATE TABLE IF NOT EXISTS "userReset" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"resetValue" integer NOT NULL,
	"validUntil" timestamp with time zone NOT NULL
);

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'userReset_user_id_fk'
	) THEN
		ALTER TABLE "userReset"
			ADD CONSTRAINT "userReset_user_id_fk"
			FOREIGN KEY ("userId") REFERENCES "public"."user"("id")
			ON DELETE no action ON UPDATE no action;
	END IF;
END $$;
