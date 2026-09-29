ALTER TABLE "company_expenses" ADD COLUMN "supplierId" TEXT;
ALTER TABLE "fuel_logs" ADD COLUMN "supplierId" TEXT;
ALTER TABLE "vehicle_maintenance" ADD COLUMN "supplierId" TEXT;
ALTER TABLE "transactions" ADD COLUMN "supplierId" TEXT;

UPDATE "company_expenses" ce
SET "supplierId" = s."id"
FROM "suppliers" s
WHERE lower(trim(ce."supplier")) = lower(trim(s."name"));

UPDATE "fuel_logs" fl
SET "supplierId" = s."id"
FROM "suppliers" s
WHERE lower(trim(fl."supplier")) = lower(trim(s."name"));

UPDATE "vehicle_maintenance" vm
SET "supplierId" = s."id"
FROM "suppliers" s
WHERE lower(trim(vm."supplier")) = lower(trim(s."name"));

UPDATE "transactions" t
SET "supplierId" = s."id"
FROM "suppliers" s
WHERE t."supplier" IS NOT NULL
  AND lower(trim(t."supplier")) = lower(trim(s."name"));

CREATE INDEX "company_expenses_supplierId_idx" ON "company_expenses"("supplierId");
CREATE INDEX "fuel_logs_supplierId_idx" ON "fuel_logs"("supplierId");
CREATE INDEX "vehicle_maintenance_supplierId_idx" ON "vehicle_maintenance"("supplierId");
CREATE INDEX "transactions_supplierId_idx" ON "transactions"("supplierId");

ALTER TABLE "company_expenses"
  ADD CONSTRAINT "company_expenses_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "fuel_logs"
  ADD CONSTRAINT "fuel_logs_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "vehicle_maintenance"
  ADD CONSTRAINT "vehicle_maintenance_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "transactions"
  ADD CONSTRAINT "transactions_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
