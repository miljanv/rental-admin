-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('BUS', 'VAN', 'MIDIBUS');

-- CreateEnum
CREATE TYPE "VehicleFuelType" AS ENUM ('DIESEL', 'PETROL', 'LPG', 'CNG', 'ELECTRIC', 'HYBRID');

-- CreateEnum
CREATE TYPE "TachographType" AS ENUM ('ANALOG', 'DIGITAL');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'IN_SERVICE', 'OUT_OF_SERVICE');

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "vin" TEXT NOT NULL,
    "seatCount" INTEGER NOT NULL,
    "type" "VehicleType" NOT NULL,
    "fuelType" "VehicleFuelType" NOT NULL,
    "tachographType" "TachographType" NOT NULL,
    "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentMileage" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_licensePlate_key" ON "vehicles"("licensePlate");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_vin_key" ON "vehicles"("vin");

-- CreateIndex
CREATE INDEX "vehicles_status_idx" ON "vehicles"("status");

-- CreateIndex
CREATE INDEX "vehicles_type_idx" ON "vehicles"("type");

-- CreateIndex
CREATE INDEX "vehicles_make_model_idx" ON "vehicles"("make", "model");
