-- AlterEnum
ALTER TYPE "DriverDocumentType" ADD VALUE 'MA_FORM';

-- CreateEnum
CREATE TYPE "AbsenceReason" AS ENUM ('SICK_LEAVE', 'ANNUAL_LEAVE', 'LEAVE_OR_REST', 'OTHER');

-- CreateTable
CREATE TABLE "driver_absence_attestations" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "periodFrom" TIMESTAMP(3) NOT NULL,
    "periodTo" TIMESTAMP(3) NOT NULL,
    "reason" "AbsenceReason" NOT NULL,
    "otherReason" TEXT,
    "place" TEXT NOT NULL,
    "issuedAt" DATE NOT NULL,
    "startedWorkAt" DATE NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_absence_attestations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "driver_absence_attestations_fileId_key" ON "driver_absence_attestations"("fileId");

-- CreateIndex
CREATE INDEX "driver_absence_attestations_driverId_idx" ON "driver_absence_attestations"("driverId");

-- CreateIndex
CREATE INDEX "driver_absence_attestations_periodFrom_idx" ON "driver_absence_attestations"("periodFrom");

-- AddForeignKey
ALTER TABLE "driver_absence_attestations" ADD CONSTRAINT "driver_absence_attestations_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_absence_attestations" ADD CONSTRAINT "driver_absence_attestations_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
