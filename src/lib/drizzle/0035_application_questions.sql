ALTER TABLE "application"
    ADD COLUMN IF NOT EXISTS "currentlySells" boolean,
    ADD COLUMN IF NOT EXISTS "soldInPast" boolean,
    ADD COLUMN IF NOT EXISTS "howDidYouFindOut" text,
    ADD COLUMN IF NOT EXISTS "referredByBroker" boolean,
    ADD COLUMN IF NOT EXISTS "brokerName" text,
    ADD COLUMN IF NOT EXISTS "hasBrickAndMortar" boolean,
    ADD COLUMN IF NOT EXISTS "businessType" text,
    ADD COLUMN IF NOT EXISTS "openSeasonallyOrYearRound" text,
    ADD COLUMN IF NOT EXISTS "hoursOfOperation" text,
    ADD COLUMN IF NOT EXISTS "socialMediaHandles" text;
