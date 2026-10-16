ALTER TABLE "company_expenses"
  ADD COLUMN "supplyDate" DATE;

ALTER TABLE "trips"
  ADD COLUMN "invoiceSupplyDate" DATE;

CREATE INDEX "company_expenses_supplyDate_idx" ON "company_expenses"("supplyDate");
CREATE INDEX "trips_invoiceSupplyDate_idx" ON "trips"("invoiceSupplyDate");
