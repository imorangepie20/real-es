-- CreateTable
CREATE TABLE "RealTxCache" (
    "id" TEXT NOT NULL,
    "lawdCd" TEXT NOT NULL,
    "dealYmd" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "records" JSONB NOT NULL,
    "totalCount" INTEGER NOT NULL DEFAULT 0,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RealTxCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeocodeCache" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeocodeCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RealTxCache_lawdCd_dealYmd_propertyType_kind_key" ON "RealTxCache"("lawdCd", "dealYmd", "propertyType", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "GeocodeCache_query_key" ON "GeocodeCache"("query");
