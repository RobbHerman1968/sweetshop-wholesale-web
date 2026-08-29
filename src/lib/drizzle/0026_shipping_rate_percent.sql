ALTER TABLE "stateShippingTaxRate"
    ALTER COLUMN "shippingRate" TYPE numeric(10, 4)
    USING "shippingRate"::numeric(10, 4);
