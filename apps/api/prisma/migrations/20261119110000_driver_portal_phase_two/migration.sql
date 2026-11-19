-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'DRIVER_TRIP_CONFIRMED';
ALTER TYPE "AuditAction" ADD VALUE 'DRIVER_ADVANCE_ACCEPTED';
ALTER TYPE "AuditAction" ADD VALUE 'PAYMENT_CARD_SAVED';

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "departureTime" TEXT,
ADD COLUMN     "itinerary" TEXT,
ADD COLUMN     "pickupLocation" TEXT,
ADD COLUMN     "travelTimelineSource" "TripKmSource";

-- AlterTable
ALTER TABLE "trip_vehicles" ADD COLUMN     "garageEndKm" DOUBLE PRECISION,
ADD COLUMN     "garageStartKm" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "trip_drivers" ADD COLUMN     "advanceAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "confirmedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "trip_expenses" ADD COLUMN     "paymentCardId" TEXT;

-- AlterTable
ALTER TABLE "driver_trip_reports" ADD COLUMN     "borderCrossings" JSONB,
ADD COLUMN     "finishedAt" TEXT,
ADD COLUMN     "startedAt" TEXT;

-- AlterTable
ALTER TABLE "driver_trip_report_vehicles" ADD COLUMN     "garageEndKm" DOUBLE PRECISION,
ADD COLUMN     "garageStartKm" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "driver_trip_report_expenses" ADD COLUMN     "paymentCardId" TEXT;

-- CreateTable
CREATE TABLE "payment_cards" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_cards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payment_cards_organizationId_idx" ON "payment_cards"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_cards_organizationId_name_key" ON "payment_cards"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "trip_expenses" ADD CONSTRAINT "trip_expenses_paymentCardId_fkey" FOREIGN KEY ("paymentCardId") REFERENCES "payment_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_trip_report_expenses" ADD CONSTRAINT "driver_trip_report_expenses_paymentCardId_fkey" FOREIGN KEY ("paymentCardId") REFERENCES "payment_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_cards" ADD CONSTRAINT "payment_cards_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

