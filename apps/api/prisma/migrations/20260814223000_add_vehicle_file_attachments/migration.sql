-- AlterTable
ALTER TABLE "vehicle_inspections" ADD COLUMN "fileId" TEXT;

-- AlterTable
ALTER TABLE "tachograph_calibrations" ADD COLUMN "fileId" TEXT;

-- AlterTable
ALTER TABLE "vehicle_safety_equipment" ADD COLUMN "fileId" TEXT;

-- CreateEnum
CREATE TYPE "VehicleDocumentType" AS ENUM ('REGISTRATION');

-- CreateTable
CREATE TABLE "vehicle_documents" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "VehicleDocumentType" NOT NULL,
    "issuedAt" DATE,
    "fileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_inspections_fileId_key" ON "vehicle_inspections"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "tachograph_calibrations_fileId_key" ON "tachograph_calibrations"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_safety_equipment_fileId_key" ON "vehicle_safety_equipment"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_documents_fileId_key" ON "vehicle_documents"("fileId");

-- CreateIndex
CREATE INDEX "vehicle_documents_vehicleId_idx" ON "vehicle_documents"("vehicleId");

-- CreateIndex
CREATE INDEX "vehicle_documents_type_idx" ON "vehicle_documents"("type");

-- AddForeignKey
ALTER TABLE "vehicle_inspections" ADD CONSTRAINT "vehicle_inspections_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tachograph_calibrations" ADD CONSTRAINT "tachograph_calibrations_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_safety_equipment" ADD CONSTRAINT "vehicle_safety_equipment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
