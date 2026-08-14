-- CreateTable
CREATE TABLE "tachograph_calibrations" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "calibratedAt" DATE NOT NULL,
    "expiresAt" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tachograph_calibrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tachograph_calibrations_vehicleId_idx" ON "tachograph_calibrations"("vehicleId");

-- CreateIndex
CREATE INDEX "tachograph_calibrations_expiresAt_idx" ON "tachograph_calibrations"("expiresAt");

-- AddForeignKey
ALTER TABLE "tachograph_calibrations" ADD CONSTRAINT "tachograph_calibrations_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
