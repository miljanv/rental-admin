-- CreateEnum
CREATE TYPE "TripExpenseCategory" AS ENUM ('FUEL', 'TOLL', 'PARKING', 'FOOD', 'LODGING', 'PER_DIEM', 'ROADSIDE_REPAIR', 'VISA_PERMIT', 'OTHER');

-- CreateEnum
CREATE TYPE "TripExpensePaymentMethod" AS ENUM ('CASH', 'COMPANY_CARD', 'INVOICE');

-- AlterEnum
ALTER TYPE "TransactionSourceType" ADD VALUE 'TRIP_EXPENSE';

-- AlterTable
ALTER TABLE "trips" ADD COLUMN "paidAt" DATE,
ADD COLUMN "carrierId" TEXT;

-- AlterTable
ALTER TABLE "trip_drivers" ADD COLUMN "perDiemAmount" DOUBLE PRECISION,
ADD COLUMN "advanceAmount" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "trip_expenses" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "category" "TripExpenseCategory" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "TripExpensePaymentMethod" NOT NULL,
    "note" TEXT,
    "fileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trip_expenses_fileId_key" ON "trip_expenses"("fileId");

-- CreateIndex
CREATE INDEX "trip_expenses_tripId_idx" ON "trip_expenses"("tripId");

-- CreateIndex
CREATE INDEX "trips_carrierId_idx" ON "trips"("carrierId");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_carrierId_fkey" FOREIGN KEY ("carrierId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_expenses" ADD CONSTRAINT "trip_expenses_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_expenses" ADD CONSTRAINT "trip_expenses_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
