-- CreateEnum
CREATE TYPE "FuelLogFuelType" AS ENUM ('DIESEL', 'ADBLUE');

-- CreateTable
CREATE TABLE "fuel_logs" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "fueledAt" DATE NOT NULL,
    "location" TEXT NOT NULL,
    "driverId" TEXT,
    "fuelType" "FuelLogFuelType" NOT NULL,
    "litersFilled" DOUBLE PRECISION NOT NULL,
    "odometerKm" INTEGER NOT NULL,
    "kmDriven" INTEGER,
    "consumptionPer100Km" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fuel_logs_vehicleId_idx" ON "fuel_logs"("vehicleId");

-- CreateIndex
CREATE INDEX "fuel_logs_vehicleId_odometerKm_idx" ON "fuel_logs"("vehicleId", "odometerKm");

-- CreateIndex
CREATE INDEX "fuel_logs_fueledAt_idx" ON "fuel_logs"("fueledAt");

-- CreateIndex
CREATE INDEX "fuel_logs_fuelType_idx" ON "fuel_logs"("fuelType");

-- AddForeignKey
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_logs" ADD CONSTRAINT "fuel_logs_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
