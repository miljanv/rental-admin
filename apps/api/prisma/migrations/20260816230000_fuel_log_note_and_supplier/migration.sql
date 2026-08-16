-- AlterTable
ALTER TABLE "fuel_logs" ALTER COLUMN "location" SET DEFAULT '';

-- Existing rows may have a null supplier from the previous optional column.
UPDATE "fuel_logs" SET "supplier" = 'Nepoznato' WHERE "supplier" IS NULL OR "supplier" = '';

ALTER TABLE "fuel_logs" ALTER COLUMN "supplier" SET NOT NULL;

ALTER TABLE "fuel_logs" ADD COLUMN "note" TEXT;

-- CreateIndex
CREATE INDEX "fuel_logs_vehicleId_fueledAt_idx" ON "fuel_logs"("vehicleId", "fueledAt");

-- CreateIndex
CREATE INDEX "fuel_logs_supplier_idx" ON "fuel_logs"("supplier");
