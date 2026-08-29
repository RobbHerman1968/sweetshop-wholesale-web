CREATE TABLE IF NOT EXISTS "cartAddress" (
    id serial PRIMARY KEY NOT NULL,
    "cartId" integer NOT NULL,
    type text NOT NULL,
    "firstName" text,
    "lastName" text,
    "companyName" text,
    address1 text,
    address2 text,
    city text,
    state text,
    "postalCode" text,
    country text,
    "phoneNumber" text,
    "emailAddress" text,
    CONSTRAINT "cartAddress_cart_id_fk" FOREIGN KEY ("cartId") REFERENCES cart(id) ON DELETE CASCADE,
    CONSTRAINT "cartAddress_cart_id_type_unique" UNIQUE ("cartId", type)
);
