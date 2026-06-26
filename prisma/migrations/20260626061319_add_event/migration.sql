-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT,
    "category" TEXT NOT NULL DEFAULT '기타',
    "memo" TEXT,
    "propertyId" TEXT,
    "customerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Event_userId_date_idx" ON "Event"("userId", "date");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
