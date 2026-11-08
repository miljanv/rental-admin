-- Tolls and similar costs passed on to the customer on a trip invoice. Additive; existing invoices have none.
ALTER TABLE "trips" ADD COLUMN "invoiceExtraAmount" DOUBLE PRECISION,
ADD COLUMN "invoiceExtraDescription" TEXT;
