-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'DRIVER_REPORT_ACCEPTED';
ALTER TYPE "AuditAction" ADD VALUE 'DRIVER_REPORT_RETURNED';

-- AlterTable
ALTER TABLE "driver_trip_report_expenses" ADD COLUMN     "fuelLiters" DOUBLE PRECISION,
ADD COLUMN     "fuelLogId" TEXT,
ADD COLUMN     "fuelOdometerKm" INTEGER,
ADD COLUMN     "fuelStation" TEXT,
ADD COLUMN     "fuelType" "FuelLogFuelType",
ADD COLUMN     "vehicleId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "driver_trip_report_expenses_fuelLogId_key" ON "driver_trip_report_expenses"("fuelLogId");

-- AddForeignKey
ALTER TABLE "driver_trip_report_expenses" ADD CONSTRAINT "driver_trip_report_expenses_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_trip_report_expenses" ADD CONSTRAINT "driver_trip_report_expenses_fuelLogId_fkey" FOREIGN KEY ("fuelLogId") REFERENCES "fuel_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
