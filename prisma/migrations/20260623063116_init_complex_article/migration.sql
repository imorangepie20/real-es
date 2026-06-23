-- CreateTable
CREATE TABLE "Complex" (
    "id" TEXT NOT NULL,
    "complexNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "totalHouseholds" INTEGER,
    "approvalDate" TEXT,
    "regionCode" TEXT,
    "raw" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Complex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "articleNumber" TEXT NOT NULL,
    "complexId" TEXT NOT NULL,
    "tradeType" TEXT NOT NULL,
    "price" BIGINT,
    "rentPrice" BIGINT,
    "areaExclusive" DOUBLE PRECISION,
    "areaSupply" DOUBLE PRECISION,
    "floor" TEXT,
    "realtorName" TEXT,
    "raw" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Complex_complexNumber_key" ON "Complex"("complexNumber");

-- CreateIndex
CREATE INDEX "Complex_regionCode_idx" ON "Complex"("regionCode");

-- CreateIndex
CREATE UNIQUE INDEX "Article_articleNumber_key" ON "Article"("articleNumber");

-- CreateIndex
CREATE INDEX "Article_complexId_idx" ON "Article"("complexId");

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_complexId_fkey" FOREIGN KEY ("complexId") REFERENCES "Complex"("id") ON DELETE CASCADE ON UPDATE CASCADE;
