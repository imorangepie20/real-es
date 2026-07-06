-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "balanceAmount" BIGINT,
ADD COLUMN     "downPayment" BIGINT,
ADD COLUMN     "interim1Amount" BIGINT,
ADD COLUMN     "interim2Amount" BIGINT,
ADD COLUMN     "leaseEndDate" TEXT;
