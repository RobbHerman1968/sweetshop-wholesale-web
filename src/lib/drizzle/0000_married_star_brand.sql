-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"userName" text NOT NULL,
	"passwordHash" text NOT NULL,
	"isActive" boolean DEFAULT false NOT NULL,
	"isAdmin" boolean DEFAULT false NOT NULL,
	"firstName" text,
	"lastName" text,
	CONSTRAINT "user_username_unique" UNIQUE("userName")
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"itemNumber" text,
	"description" text,
	"nutrition" text,
	"ingredients" text,
	"download" text,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"pieces" text,
	"weightInOunces" numeric(12, 2) DEFAULT '0' NOT NULL,
	"isActive" boolean DEFAULT false NOT NULL,
	"shippingBoxFactor" numeric(12, 3) DEFAULT '1' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
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
--> statement-breakpoint
CREATE TABLE "accountGroup" (
	"id" serial PRIMARY KEY NOT NULL,
	"accountId" integer,
	"productGroupId" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productGroupProduct" (
	"id" serial PRIMARY KEY NOT NULL,
	"productGroupId" integer NOT NULL,
	"productId" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productGroup" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"ShippingLeadDays" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productImage" (
	"id" serial PRIMARY KEY NOT NULL,
	"productId" integer NOT NULL,
	"vercelImageId" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart" (
	"id" serial PRIMARY KEY NOT NULL,
	"accountId" integer NOT NULL,
	"subTotal" numeric(10, 2) DEFAULT '0',
	"shipping" numeric(10, 2) DEFAULT '0' NOT NULL,
	"tax" numeric(10, 2) DEFAULT '0' NOT NULL,
	"discounts" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cartItem" (
	"id" serial PRIMARY KEY NOT NULL,
	"cartId" integer DEFAULT 0 NOT NULL,
	"productId" integer NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"lineTotal" numeric(10, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stateShippingTaxRate" (
	"id" serial PRIMARY KEY NOT NULL,
	"stateAbbr" text NOT NULL,
	"shippingRate" numeric(10, 2) NOT NULL,
	"taxRate" numeric(10, 4) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "userReset" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"resetValue" integer NOT NULL,
	"validUntil" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "xrefImage" (
	"id" serial PRIMARY KEY NOT NULL,
	"productId" integer NOT NULL,
	"imageName" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vercelImage" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"path" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productImageNew" (
	"id" serial PRIMARY KEY NOT NULL,
	"productId" integer NOT NULL,
	"vercelImageId" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productOldImage" (
	"id" serial PRIMARY KEY NOT NULL,
	"productId" integer NOT NULL,
	"fileName" text NOT NULL,
	"isDefault" boolean NOT NULL,
	"isActive" boolean NOT NULL,
	"order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productOld" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text,
	"itemNumber" text,
	"description" text,
	"nutrition" text,
	"ingredients" text,
	"download" text,
	"price" numeric(10, 2),
	"pieces" integer,
	"weightInOunces" numeric(10, 2),
	"isActive" boolean NOT NULL,
	"shippingBoxFactor" numeric(10, 3)
);
--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accountGroup" ADD CONSTRAINT "accountGroup_productGroup_id_fk" FOREIGN KEY ("productGroupId") REFERENCES "public"."productGroup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accountGroup" ADD CONSTRAINT "accountGroup_account_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productGroupProduct" ADD CONSTRAINT "productGroupProduct_product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productGroupProduct" ADD CONSTRAINT "productGroupProduct_productGroup_id_fk" FOREIGN KEY ("productGroupId") REFERENCES "public"."productGroup"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productImage" ADD CONSTRAINT "productImage_product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productImage" ADD CONSTRAINT "productImage_vercelImage_id_fk" FOREIGN KEY ("vercelImageId") REFERENCES "public"."vercelImage"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart" ADD CONSTRAINT "cart_account_id_fk" FOREIGN KEY ("accountId") REFERENCES "public"."account"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cartItem" ADD CONSTRAINT "cartItem_product_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cartItem" ADD CONSTRAINT "cartItem_cart_id_fk" FOREIGN KEY ("cartId") REFERENCES "public"."cart"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "userReset" ADD CONSTRAINT "userReset_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;
*/