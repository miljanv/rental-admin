-- Domestic and foreign fares are entered separately. VAT is 10% on the domestic fare only.
ALTER TABLE "trips" ADD COLUMN "invoiceDomesticAmount" DOUBLE PRECISION;
ALTER TABLE "trips" ADD COLUMN "invoiceForeignAmount" DOUBLE PRECISION;
