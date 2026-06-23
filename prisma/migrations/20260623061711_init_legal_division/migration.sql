-- CreateTable
CREATE TABLE "LegalDivision" (
    "code" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "sidoCode" TEXT NOT NULL,
    "sigunguCode" TEXT,
    "naverCode" TEXT,
    "lng" DOUBLE PRECISION,
    "lat" DOUBLE PRECISION,

    CONSTRAINT "LegalDivision_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegalDivision_naverCode_key" ON "LegalDivision"("naverCode");

-- CreateIndex
CREATE INDEX "LegalDivision_level_idx" ON "LegalDivision"("level");

-- CreateIndex
CREATE INDEX "LegalDivision_sidoCode_idx" ON "LegalDivision"("sidoCode");

-- CreateIndex
CREATE INDEX "LegalDivision_sigunguCode_idx" ON "LegalDivision"("sigunguCode");
