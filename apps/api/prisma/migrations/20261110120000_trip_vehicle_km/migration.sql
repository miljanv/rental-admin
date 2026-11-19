-- CreateEnum
CREATE TYPE "TripKmSource" AS ENUM ('ADMIN', 'DRIVER');

-- AlterTable
ALTER TABLE "trip_vehicles" ADD COLUMN     "endKm" DOUBLE PRECISION,
ADD COLUMN     "kmSource" "TripKmSource",
ADD COLUMN     "kmUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "startKm" DOUBLE PRECISION;

-- Data: a trip with exactly one vehicle keeps its odometer readings on that vehicle.
-- Trips with several vehicles start without per-vehicle readings (their trip-level
-- distance stays as it was until someone enters the readings per vehicle).
UPDATE "trip_vehicles" AS tv
SET "startKm" = t."startKm",
    "endKm" = t."endKm",
    "kmSource" = 'ADMIN',
    "kmUpdatedAt" = t."updatedAt"
FROM "trips" AS t
WHERE tv."tripId" = t."id"
  AND (t."startKm" IS NOT NULL OR t."endKm" IS NOT NULL)
  AND (SELECT COUNT(*) FROM "trip_vehicles" AS other WHERE other."tripId" = t."id") = 1;
