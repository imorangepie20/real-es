-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "dong" TEXT,
ADD COLUMN     "lat" DOUBLE PRECISION,
ADD COLUMN     "lng" DOUBLE PRECISION,
ADD COLUMN     "realEstateType" TEXT,
ADD COLUMN     "regionCode" TEXT,
ALTER COLUMN "complexId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Article_regionCode_idx" ON "Article"("regionCode");
