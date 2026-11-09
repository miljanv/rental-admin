-- Per-organization vehicle and user limits. Additive only: existing organizations stay unlimited (NULL).

-- AlterTable
ALTER TABLE "organizations"
  ADD COLUMN "maxVehicles" INTEGER,
  ADD COLUMN "maxUsers" INTEGER;
