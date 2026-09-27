-- Invoice date and per-trip odometer / fuel readings used by the schedule
-- fakturisanje and obračun actions.
ALTER TABLE "trips" ADD COLUMN "invoicedAt" DATE;
ALTER TABLE "trips" ADD COLUMN "startKm" DOUBLE PRECISION;
ALTER TABLE "trips" ADD COLUMN "endKm" DOUBLE PRECISION;
ALTER TABLE "trips" ADD COLUMN "fuelLiters" DOUBLE PRECISION;
