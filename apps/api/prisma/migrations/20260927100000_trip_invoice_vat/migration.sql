ALTER TABLE "trips" ADD COLUMN "invoiceDescription" TEXT;
ALTER TABLE "trips" ADD COLUMN "priceIncludesVat" BOOLEAN;
ALTER TABLE "trips" ADD COLUMN "invoiceDomesticKm" DOUBLE PRECISION;
ALTER TABLE "trips" ADD COLUMN "invoiceTotalKm" DOUBLE PRECISION;
ALTER TABLE "trips" ADD COLUMN "invoiceNetAmount" DOUBLE PRECISION;
ALTER TABLE "trips" ADD COLUMN "invoiceVatAmount" DOUBLE PRECISION;
ALTER TABLE "trips" ADD COLUMN "invoiceGrossAmount" DOUBLE PRECISION;
ALTER TABLE "trips" ADD COLUMN "invoiceGroupId" TEXT;

CREATE INDEX "trips_invoiceGroupId_idx" ON "trips"("invoiceGroupId");
