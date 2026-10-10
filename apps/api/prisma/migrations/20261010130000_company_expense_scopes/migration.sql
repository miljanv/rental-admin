CREATE TYPE "CompanyExpenseScope" AS ENUM ('VEHICLE', 'COMMON', 'SUBCONTRACTOR', 'BANK');

ALTER TABLE "company_expenses"
  ADD COLUMN "scope" "CompanyExpenseScope" NOT NULL DEFAULT 'COMMON';

UPDATE "company_expenses"
SET "scope" = 'VEHICLE'
WHERE "vehicleId" IS NOT NULL;

CREATE INDEX "company_expenses_scope_idx" ON "company_expenses"("scope");

ALTER TYPE "TransactionCategory" ADD VALUE IF NOT EXISTS 'SUBCONTRACTOR';
ALTER TYPE "TransactionCategory" ADD VALUE IF NOT EXISTS 'BANK';
