-- Separate a driver's entitlement, actual payment and travel-cost advance.
CREATE TYPE "PerDiemCurrency" AS ENUM ('RSD', 'EUR');
CREATE TYPE "PerDiemStatus" AS ENUM ('DRAFT', 'APPROVED', 'PAID');
CREATE TYPE "AdvanceStatus" AS ENUM ('DRAFT', 'PAID', 'SETTLED');

ALTER TABLE "trip_drivers"
  ADD COLUMN "perDiemCurrency" "PerDiemCurrency" NOT NULL DEFAULT 'RSD',
  ADD COLUMN "perDiemStatus" "PerDiemStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "perDiemPaidAmount" DOUBLE PRECISION,
  ADD COLUMN "perDiemPaidAt" DATE,
  ADD COLUMN "advanceStatus" "AdvanceStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "advancePaidAt" DATE;

-- Existing values were already sent to Finance by the old workflow. Preserve
-- that history as paid, rather than silently removing it after deployment.
UPDATE "trip_drivers"
SET
  "perDiemStatus" = 'PAID',
  "perDiemPaidAmount" = "perDiemAmount",
  "perDiemPaidAt" = (
    SELECT "departureDate"::date FROM "trips" WHERE "trips"."id" = "trip_drivers"."tripId"
  )
WHERE "perDiemAmount" IS NOT NULL AND "perDiemAmount" > 0;

UPDATE "trip_drivers"
SET
  "advanceStatus" = 'PAID',
  "advancePaidAt" = (
    SELECT "departureDate"::date FROM "trips" WHERE "trips"."id" = "trip_drivers"."tripId"
  )
WHERE "advanceAmount" IS NOT NULL AND "advanceAmount" > 0;

