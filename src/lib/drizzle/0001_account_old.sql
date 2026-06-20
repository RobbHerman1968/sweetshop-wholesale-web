CREATE TABLE IF NOT EXISTS "accountOld" (
	"id" serial PRIMARY KEY NOT NULL,
	"accountMateId" text,
	"isSkipTax" boolean DEFAULT false NOT NULL,
	"isSkipShipping" boolean DEFAULT false NOT NULL,
	"isFreeGroundShipping" boolean DEFAULT false NOT NULL,
	"terms" text,
	"isTerms" boolean DEFAULT false NOT NULL,
	"name" text,
	"contactFirstName" text,
	"contactLastName" text,
	"contactPhone" text,
	"contactAddress1" text,
	"contactAddress2" text,
	"contactCity" text,
	"contactState" text,
	"contactZipCode" text,
	"contactEmail" text
);
