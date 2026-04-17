CREATE SEQUENCE IF NOT EXISTS "CustomerProfile_memberId_seq";

ALTER TABLE "CustomerProfile"
ADD COLUMN "memberId" INTEGER;

WITH ordered_customers AS (
  SELECT
    id,
    ROW_NUMBER() OVER (ORDER BY "createdAt" ASC, id ASC) AS next_member_id
  FROM "CustomerProfile"
)
UPDATE "CustomerProfile" AS customer
SET "memberId" = ordered_customers.next_member_id
FROM ordered_customers
WHERE customer.id = ordered_customers.id;

SELECT setval(
  '"CustomerProfile_memberId_seq"',
  COALESCE((SELECT MAX("memberId") FROM "CustomerProfile"), 1),
  COALESCE((SELECT MAX("memberId") FROM "CustomerProfile"), 0) > 0
);

ALTER TABLE "CustomerProfile"
ALTER COLUMN "memberId" SET DEFAULT nextval('"CustomerProfile_memberId_seq"'),
ALTER COLUMN "memberId" SET NOT NULL;

CREATE UNIQUE INDEX "CustomerProfile_memberId_key" ON "CustomerProfile"("memberId");
