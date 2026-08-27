-- Dedicated storage for /manage/homepage-setup (not a siteSetting).
CREATE TABLE IF NOT EXISTS "homepageContent" (
    "id" integer PRIMARY KEY NOT NULL,
    "content" text NOT NULL,
    "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
);

-- Prefer existing homepage JSON if it was still stored under siteSetting.
INSERT INTO "homepageContent" ("id", "content")
SELECT 1, "textValue"
FROM "siteSetting"
WHERE "textValue" IS NOT NULL
  AND btrim("textValue") <> ''
  AND "textValue" LIKE '%"hero"%'
  AND "textValue" LIKE '%"sections"%'
ORDER BY CASE WHEN "name" = 'Homepage Content' THEN 0 ELSE 1 END, "id"
LIMIT 1
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "homepageContent" ("id", "content")
VALUES (
    1,
    '{"hero":{"title":"SWEET SHOP USA","subtitle":"Handmade Chocolates","body":"To view our wholesale items please sign in using your wholesale login or apply now to become a Sweet Shop USA wholesale partner.","phone":"1-800-222-2269","videoUrl":"https://tk1qsvgip35suuxh.public.blob.vercel-storage.com/videos/sweetshopusa-hero.mp4"},"sections":[{"title":"NEW AT SWEET SHOP","categoryId":230,"description":"We are always striving to come up with new ideas. Take a look at new catalogs, website features, products, and more!","productIds":[3307,3278,3312]}]}'
)
ON CONFLICT ("id") DO NOTHING;

-- Remove legacy Homepage Content siteSetting rows only (keep Apply Now Email Address on id 7).
DELETE FROM "siteSetting"
WHERE "name" = 'Homepage Content';

-- Ensure Apply Now Email Address exists as site setting id 7.
INSERT INTO "siteSetting" ("id", "name", "value", "textValue")
VALUES (7, 'Apply Now Email Address', 0, 'sales@sweetshopusa.com')
ON CONFLICT ("id") DO NOTHING;

SELECT setval(
    pg_get_serial_sequence('"siteSetting"', 'id'),
    GREATEST((SELECT COALESCE(MAX("id"), 1) FROM "siteSetting"), 7)
);
