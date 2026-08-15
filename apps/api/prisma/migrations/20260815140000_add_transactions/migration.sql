-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM ('CONTRACT', 'FUEL', 'PARTS', 'TECHNICAL_INSPECTION', 'TACHOGRAPH', 'FIRE_EXTINGUISHER', 'SALARY', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('ACCOUNT', 'CASH');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('OPEN', 'SETTLED');

-- CreateEnum
CREATE TYPE "TransactionSourceType" AS ENUM ('MANUAL', 'FUEL_LOG', 'MAINTENANCE', 'INSPECTION', 'CALIBRATION', 'SAFETY_EQUIPMENT');

-- AlterTable
ALTER TABLE "vehicle_inspections" ADD COLUMN "cost" DOUBLE PRECISION,
ADD COLUMN "paymentMethod" "PaymentMethod";

-- AlterTable
ALTER TABLE "tachograph_calibrations" ADD COLUMN "cost" DOUBLE PRECISION,
ADD COLUMN "paymentMethod" "PaymentMethod";

-- AlterTable
ALTER TABLE "vehicle_safety_equipment" ADD COLUMN "cost" DOUBLE PRECISION,
ADD COLUMN "paymentMethod" "PaymentMethod";

-- AlterTable
ALTER TABLE "fuel_logs" ADD COLUMN "cost" DOUBLE PRECISION,
ADD COLUMN "paymentMethod" "PaymentMethod",
ADD COLUMN "supplier" TEXT;

-- AlterTable
ALTER TABLE "vehicle_maintenance" ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'ACCOUNT';

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "category" "TransactionCategory" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "occurredAt" DATE NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "note" TEXT,
    "supplier" TEXT,
    "vehicleId" TEXT,
    "driverId" TEXT,
    "contractId" TEXT,
    "isAdvance" BOOLEAN NOT NULL DEFAULT false,
    "status" "TransactionStatus" NOT NULL DEFAULT 'OPEN',
    "linkedTransactionId" TEXT,
    "sourceType" "TransactionSourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transactions_occurredAt_idx" ON "transactions"("occurredAt");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_category_idx" ON "transactions"("category");

-- CreateIndex
CREATE INDEX "transactions_paymentMethod_idx" ON "transactions"("paymentMethod");

-- CreateIndex
CREATE INDEX "transactions_vehicleId_idx" ON "transactions"("vehicleId");

-- CreateIndex
CREATE INDEX "transactions_driverId_idx" ON "transactions"("driverId");

-- CreateIndex
CREATE INDEX "transactions_supplier_isAdvance_status_idx" ON "transactions"("supplier", "isAdvance", "status");

-- CreateIndex
CREATE INDEX "transactions_sourceType_sourceId_idx" ON "transactions"("sourceType", "sourceId");

-- One auto-generated row per operational source. Manual rows keep sourceId null
-- and are not constrained by this index (PostgreSQL UNIQUE allows multiple NULLs).
CREATE UNIQUE INDEX "transactions_sourceType_sourceId_key" ON "transactions"("sourceType", "sourceId") WHERE "sourceId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_linkedTransactionId_fkey" FOREIGN KEY ("linkedTransactionId") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
