DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'menu' AND column_name = 'isShipping'
  ) THEN
    ALTER TABLE "menu" RENAME COLUMN "isShipping" TO "isShopping";
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'menu' AND column_name = 'isShopping'
  ) THEN
    ALTER TABLE "menu" ADD COLUMN "isShopping" boolean NOT NULL DEFAULT false;
  END IF;
END $$;

UPDATE "menu" SET "isShopping" = true WHERE id >= 3;
