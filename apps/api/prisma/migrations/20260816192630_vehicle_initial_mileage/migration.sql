-- AlterTable: add as nullable first, backfill from currentMileage (the best
-- available approximation for vehicles already on file), then enforce NOT NULL.
ALTER TABLE "vehicles" ADD COLUMN "initialMileageKm" INTEGER;

UPDATE "vehicles" SET "initialMileageKm" = "currentMileage" WHERE "initialMileageKm" IS NULL;

ALTER TABLE "vehicles" ALTER COLUMN "initialMileageKm" SET NOT NULL;
