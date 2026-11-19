-- CreateEnum
CREATE TYPE "DriverTripReportStatus" AS ENUM ('SUBMITTED', 'ACCEPTED', 'PARTIALLY_ACCEPTED', 'RETURNED');

-- CreateEnum
CREATE TYPE "DriverReportExpenseStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'DRIVER_LINK_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'DRIVER_LINK_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE 'DRIVER_REPORT_SUBMITTED';

-- CreateTable
CREATE TABLE "driver_access_tokens" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "driver_access_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_trip_reports" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "note" TEXT,
    "status" "DriverTripReportStatus" NOT NULL DEFAULT 'SUBMITTED',
    "adminComment" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,

    CONSTRAINT "driver_trip_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_trip_report_vehicles" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "startKm" DOUBLE PRECISION,
    "endKm" DOUBLE PRECISION,

    CONSTRAINT "driver_trip_report_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_trip_report_expenses" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "category" "TripExpenseCategory" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "TripExpensePaymentMethod" NOT NULL,
    "note" TEXT,
    "fileId" TEXT,
    "status" "DriverReportExpenseStatus" NOT NULL DEFAULT 'PENDING',
    "tripExpenseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_trip_report_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "driver_access_tokens_tokenHash_key" ON "driver_access_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "driver_access_tokens_organizationId_idx" ON "driver_access_tokens"("organizationId");

-- CreateIndex
CREATE INDEX "driver_access_tokens_driverId_revokedAt_idx" ON "driver_access_tokens"("driverId", "revokedAt");

-- CreateIndex
CREATE INDEX "driver_trip_reports_organizationId_status_idx" ON "driver_trip_reports"("organizationId", "status");

-- CreateIndex
CREATE INDEX "driver_trip_reports_driverId_idx" ON "driver_trip_reports"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_trip_reports_tripId_driverId_key" ON "driver_trip_reports"("tripId", "driverId");

-- CreateIndex
CREATE INDEX "driver_trip_report_vehicles_vehicleId_idx" ON "driver_trip_report_vehicles"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_trip_report_vehicles_reportId_vehicleId_key" ON "driver_trip_report_vehicles"("reportId", "vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_trip_report_expenses_fileId_key" ON "driver_trip_report_expenses"("fileId");

-- CreateIndex
CREATE UNIQUE INDEX "driver_trip_report_expenses_tripExpenseId_key" ON "driver_trip_report_expenses"("tripExpenseId");

-- CreateIndex
CREATE INDEX "driver_trip_report_expenses_reportId_idx" ON "driver_trip_report_expenses"("reportId");

-- AddForeignKey
ALTER TABLE "driver_access_tokens" ADD CONSTRAINT "driver_access_tokens_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_access_tokens" ADD CONSTRAINT "driver_access_tokens_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_access_tokens" ADD CONSTRAINT "driver_access_tokens_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_trip_reports" ADD CONSTRAINT "driver_trip_reports_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_trip_reports" ADD CONSTRAINT "driver_trip_reports_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_trip_reports" ADD CONSTRAINT "driver_trip_reports_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_trip_reports" ADD CONSTRAINT "driver_trip_reports_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_trip_report_vehicles" ADD CONSTRAINT "driver_trip_report_vehicles_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "driver_trip_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_trip_report_vehicles" ADD CONSTRAINT "driver_trip_report_vehicles_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_trip_report_expenses" ADD CONSTRAINT "driver_trip_report_expenses_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "driver_trip_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_trip_report_expenses" ADD CONSTRAINT "driver_trip_report_expenses_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_trip_report_expenses" ADD CONSTRAINT "driver_trip_report_expenses_tripExpenseId_fkey" FOREIGN KEY ("tripExpenseId") REFERENCES "trip_expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

