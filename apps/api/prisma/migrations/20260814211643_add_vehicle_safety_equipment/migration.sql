-- CreateEnum
CREATE TYPE "SafetyEquipmentType" AS ENUM ('FIRST_AID_KIT', 'FIRE_EXTINGUISHER');

-- CreateTable
CREATE TABLE "vehicle_safety_equipment" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "SafetyEquipmentType" NOT NULL,
    "checkedAt" DATE NOT NULL,
    "expiresAt" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_safety_equipment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicle_safety_equipment_vehicleId_idx" ON "vehicle_safety_equipment"("vehicleId");

-- CreateIndex
CREATE INDEX "vehicle_safety_equipment_expiresAt_idx" ON "vehicle_safety_equipment"("expiresAt");

-- CreateIndex
CREATE INDEX "vehicle_safety_equipment_type_idx" ON "vehicle_safety_equipment"("type");

-- AddForeignKey
ALTER TABLE "vehicle_safety_equipment" ADD CONSTRAINT "vehicle_safety_equipment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
