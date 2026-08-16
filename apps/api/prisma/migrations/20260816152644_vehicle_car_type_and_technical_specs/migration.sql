-- AlterEnum
ALTER TYPE "VehicleType" ADD VALUE 'CAR';

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN     "engineDisplacement" INTEGER,
ADD COLUMN     "engineNumber" TEXT,
ADD COLUMN     "enginePower" DOUBLE PRECISION,
ADD COLUMN     "mass" DOUBLE PRECISION,
ADD COLUMN     "standingCapacity" INTEGER;
