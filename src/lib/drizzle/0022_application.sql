CREATE TABLE IF NOT EXISTS "application" (
    "id" serial PRIMARY KEY NOT NULL,
    "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
    "businessName" text NOT NULL,
    "taxId" text NOT NULL,
    "contactFirstName" text NOT NULL,
    "contactLastName" text NOT NULL,
    "billingAddress1" text NOT NULL,
    "billingAddress2" text,
    "city" text NOT NULL,
    "state" text NOT NULL,
    "zipCode" text NOT NULL,
    "phone" text NOT NULL,
    "fax" text,
    "email" text NOT NULL,
    "emailSent" boolean DEFAULT false NOT NULL
);
