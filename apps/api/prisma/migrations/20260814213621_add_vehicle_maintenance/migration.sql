-- CreateTable
CREATE TABLE "vehicle_maintenance" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "odometerKm" INTEGER NOT NULL,
    "partName" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "mechanic" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_maintenance_vehicleId_idx" ON "vehicle_maintenance"("vehicleId");

-- CreateIndex
CREATE INDEX "vehicle_maintenance_date_idx" ON "vehicle_maintenance"("date");

-- CreateIndex
CREATE INDEX "vehicle_maintenance_supplier_idx" ON "vehicle_maintenance"("supplier");

-- AddForeignKey
ALTER TABLE "vehicle_maintenance" ADD CONSTRAINT "vehicle_maintenance_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
