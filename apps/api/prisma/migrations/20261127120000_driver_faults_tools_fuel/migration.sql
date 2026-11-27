-- CreateEnum
CREATE TYPE "VehicleFaultStatus" AS ENUM ('REPORTED', 'IN_REPAIR', 'RESOLVED');

-- CreateEnum
CREATE TYPE "DriverToolStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED', 'LOST', 'RETURNED');

-- CreateEnum
CREATE TYPE "DriverToolSource" AS ENUM ('OFFICE', 'DRIVER');

-- CreateEnum
CREATE TYPE "DriverFuelEntryStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'VEHICLE_FAULT_REPORTED';
ALTER TYPE "AuditAction" ADD VALUE 'VEHICLE_FAULT_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'DRIVER_TOOL_SAVED';
ALTER TYPE "AuditAction" ADD VALUE 'DRIVER_TOOL_RESPONDED';
ALTER TYPE "AuditAction" ADD VALUE 'DRIVER_FUEL_ENTRY_SUBMITTED';
ALTER TYPE "AuditAction" ADD VALUE 'DRIVER_FUEL_ENTRY_REVIEWED';

-- CreateTable
CREATE TABLE "vehicle_faults" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "reportedAt" DATE NOT NULL,
    "odometerKm" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "fileId" TEXT,
    "status" "VehicleFaultStatus" NOT NULL DEFAULT 'REPORTED',
    "officeNote" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_faults_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_tools" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "source" "DriverToolSource" NOT NULL DEFAULT 'OFFICE',
    "status" "DriverToolStatus" NOT NULL DEFAULT 'PENDING',
    "assignedAt" DATE NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "lostAt" DATE,
    "lostNote" TEXT,
    "returnedAt" DATE,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_tools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_fuel_entries" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "fueledAt" TEXT NOT NULL,
    "odometerKm" INTEGER NOT NULL,
    "liters" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "fuelType" "FuelLogFuelType" NOT NULL DEFAULT 'DIESEL',
    "paymentMethod" "TripExpensePaymentMethod" NOT NULL,
    "paymentCardId" TEXT,
    "fileId" TEXT,
    "note" TEXT,
    "status" "DriverFuelEntryStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "fuelLogId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_fuel_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_faults_fileId_key" ON "vehicle_faults"("fileId");

-- CreateIndex
CREATE INDEX "vehicle_faults_organizationId_status_idx" ON "vehicle_faults"("organizationId", "status");

-- CreateIndex
CREATE INDEX "vehicle_faults_vehicleId_idx" ON "vehicle_faults"("vehicleId");

-- CreateIndex
CREATE INDEX "vehicle_faults_driverId_idx" ON "vehicle_faults"("driverId");

-- CreateIndex
CREATE INDEX "driver_tools_organizationId_status_idx" ON "driver_tools"("organizationId", "status");

-- CreateIndex
CREATE INDEX "driver_tools_driverId_idx" ON "driver_tools"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_fuel_entries_fileId_key" ON "driver_fuel_entries"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_fuel_entries_fuelLogId_key" ON "driver_fuel_entries"("fuelLogId");

-- CreateIndex
CREATE INDEX "driver_fuel_entries_organizationId_status_idx" ON "driver_fuel_entries"("organizationId", "status");

-- CreateIndex
CREATE INDEX "driver_fuel_entries_driverId_idx" ON "driver_fuel_entries"("driverId");

-- AddForeignKey
ALTER TABLE "vehicle_faults" ADD CONSTRAINT "vehicle_faults_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_faults" ADD CONSTRAINT "vehicle_faults_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_faults" ADD CONSTRAINT "vehicle_faults_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_faults" ADD CONSTRAINT "vehicle_faults_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_tools" ADD CONSTRAINT "driver_tools_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_tools" ADD CONSTRAINT "driver_tools_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_tools" ADD CONSTRAINT "driver_tools_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_fuel_entries" ADD CONSTRAINT "driver_fuel_entries_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_fuel_entries" ADD CONSTRAINT "driver_fuel_entries_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_fuel_entries" ADD CONSTRAINT "driver_fuel_entries_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_fuel_entries" ADD CONSTRAINT "driver_fuel_entries_paymentCardId_fkey" FOREIGN KEY ("paymentCardId") REFERENCES "payment_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_fuel_entries" ADD CONSTRAINT "driver_fuel_entries_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_fuel_entries" ADD CONSTRAINT "driver_fuel_entries_fuelLogId_fkey" FOREIGN KEY ("fuelLogId") REFERENCES "fuel_logs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

