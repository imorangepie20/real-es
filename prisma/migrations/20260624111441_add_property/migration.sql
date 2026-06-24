-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "articleNo" TEXT,
    "complexName" TEXT,
    "realEstateType" TEXT,
    "tradeType" TEXT,
    "status" TEXT NOT NULL DEFAULT '진행',
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT '수기',
    "siteArea" DOUBLE PRECISION,
    "areaExclusive" DOUBLE PRECISION,
    "areaSupply" DOUBLE PRECISION,
    "landArea" DOUBLE PRECISION,
    "buildingArea" DOUBLE PRECISION,
    "area" DOUBLE PRECISION,
    "dealAmount" BIGINT,
    "price" BIGINT,
    "totalHouseholds" INTEGER,
    "approvalDate" TEXT,
    "parkingCount" INTEGER,
    "heating" TEXT,
    "isPreSale" BOOLEAN,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "partnerName" TEXT,
    "partnerPhone" TEXT,
    "partnerManager" TEXT,
    "manager" TEXT,
    "contractHopeDate" TEXT,
    "contractDate" TEXT,
    "moveInHopeDate" TEXT,
    "moveInDate" TEXT,
    "interim1Date" TEXT,
    "interim2Date" TEXT,
    "balanceDate" TEXT,
    "note" TEXT,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Property_userId_status_idx" ON "Property"("userId", "status");

-- CreateIndex
CREATE INDEX "Property_userId_isFavorite_idx" ON "Property"("userId", "isFavorite");

-- AddForeignKey
ALTER TABLE "Property" ADD CONSTRAINT "Property_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
