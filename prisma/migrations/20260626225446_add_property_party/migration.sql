-- CreateTable
CREATE TABLE "PropertyParty" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyParty_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyParty_propertyId_idx" ON "PropertyParty"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyParty_customerId_idx" ON "PropertyParty"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyParty_propertyId_customerId_role_key" ON "PropertyParty"("propertyId", "customerId", "role");

-- AddForeignKey
ALTER TABLE "PropertyParty" ADD CONSTRAINT "PropertyParty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyParty" ADD CONSTRAINT "PropertyParty_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: 기존 Customer.propertyId 링크를 PropertyParty로 이관(역할은 매물 거래유형 기준). 비파괴 — 기존 컬럼은 그대로 둠.
INSERT INTO "PropertyParty" ("id", "propertyId", "customerId", "role", "createdAt")
SELECT
  gen_random_uuid()::text,
  c."propertyId",
  c."id",
  CASE
    WHEN p."tradeType" = 'A1' THEN '매도인'
    WHEN p."tradeType" IN ('B1', 'B2', 'B3') THEN '임대인'
    ELSE '매도인'
  END,
  CURRENT_TIMESTAMP
FROM "Customer" c
JOIN "Property" p ON p."id" = c."propertyId"
WHERE c."propertyId" IS NOT NULL
ON CONFLICT ("propertyId", "customerId", "role") DO NOTHING;
