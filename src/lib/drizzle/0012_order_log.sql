CREATE TABLE IF NOT EXISTS "orderLog" (
	"id" serial PRIMARY KEY NOT NULL,
	"createdAt" timestamp with time zone DEFAULT now() NOT NULL,
	"outcome" text NOT NULL,
	"message" text NOT NULL,
	"stage" text,
	"userId" integer,
	"accountId" integer,
	"cartId" integer,
	"orderId" integer,
	"orderNumber" integer,
	"accountMateId" text,
	"accountMateOrderNumber" text,
	"accountMateTransactionId" text,
	"accountMateStatus" text,
	"error" text
);

CREATE INDEX IF NOT EXISTS "orderLog_createdAt_idx" ON "orderLog" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "orderLog_orderId_idx" ON "orderLog" ("orderId");
CREATE INDEX IF NOT EXISTS "orderLog_accountId_idx" ON "orderLog" ("accountId");
CREATE INDEX IF NOT EXISTS "orderLog_outcome_idx" ON "orderLog" ("outcome");
