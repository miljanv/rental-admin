-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'FREE');

-- CreateEnum
CREATE TYPE "TripSeriesFrequency" AS ENUM ('DAILY', 'WEEKLY');

-- CreateTable
CREATE TABLE "trip_series" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "frequency" "TripSeriesFrequency" NOT NULL,
    "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "terminatedAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "departureDate" DATE NOT NULL,
    "returnDate" DATE,
    "country" TEXT,
    "route" TEXT NOT NULL,
    "partnerId" TEXT,
    "clientName" TEXT,
    "notes" TEXT,
    "price" DOUBLE PRECISION,
    "paymentMethod" "PaymentMethod",
    "status" "TripStatus" NOT NULL DEFAULT 'PLANNED',
    "contractId" TEXT,
    "distanceKm" DOUBLE PRECISION,
    "seriesId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_vehicles" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_drivers" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_drivers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trips_status_idx" ON "trips"("status");

-- CreateIndex
CREATE INDEX "trips_departureDate_idx" ON "trips"("departureDate");

-- CreateIndex
CREATE INDEX "trips_country_idx" ON "trips"("country");

-- CreateIndex
CREATE INDEX "trips_partnerId_idx" ON "trips"("partnerId");

-- CreateIndex
CREATE INDEX "trips_contractId_idx" ON "trips"("contractId");

-- CreateIndex
CREATE INDEX "trips_seriesId_idx" ON "trips"("seriesId");

-- CreateIndex
CREATE INDEX "trip_vehicles_vehicleId_idx" ON "trip_vehicles"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_vehicles_tripId_vehicleId_key" ON "trip_vehicles"("tripId", "vehicleId");

-- CreateIndex
CREATE INDEX "trip_drivers_driverId_idx" ON "trip_drivers"("driverId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_drivers_tripId_driverId_key" ON "trip_drivers"("tripId", "driverId");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "trip_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_vehicles" ADD CONSTRAINT "trip_vehicles_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_vehicles" ADD CONSTRAINT "trip_vehicles_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_drivers" ADD CONSTRAINT "trip_drivers_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_drivers" ADD CONSTRAINT "trip_drivers_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
