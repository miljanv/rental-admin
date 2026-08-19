-- AlterTable
ALTER TABLE "trips" ADD COLUMN "vehicleCount" INTEGER NOT NULL DEFAULT 1;

-- Same-day return is the default; existing rows were left without a return date.
UPDATE "trips" SET "returnDate" = "departureDate" WHERE "returnDate" IS NULL;
