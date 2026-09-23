-- AlterTable
ALTER TABLE "company_expenses" ADD COLUMN "amountWithVat" DOUBLE PRECISION;
ALTER TABLE "company_expenses" ADD COLUMN "amountWithoutVat" DOUBLE PRECISION;

-- Backfill existing rows so old totals remain visible as the VAT-inclusive amount.
UPDATE "company_expenses"
SET "amountWithVat" = "amount"
WHERE "amountWithVat" IS NULL AND "amountWithoutVat" IS NULL;
