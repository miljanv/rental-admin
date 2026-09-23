-- Backfill previous expense rows so the new accounting columns are complete.
UPDATE "company_expenses"
SET
  "amountWithVat" = COALESCE("amountWithVat", "amount"),
  "amountWithoutVat" = COALESCE("amountWithoutVat", "amountWithVat", "amount"),
  "paymentMethod" = COALESCE("paymentMethod", 'ACCOUNT'::"PaymentMethod");

ALTER TABLE "company_expenses" ADD COLUMN "vatAmount" DOUBLE PRECISION;

UPDATE "company_expenses"
SET "vatAmount" = GREATEST(COALESCE("amountWithVat", "amount") - COALESCE("amountWithoutVat", "amount"), 0);

ALTER TABLE "company_expenses" ALTER COLUMN "amountWithVat" SET NOT NULL;
ALTER TABLE "company_expenses" ALTER COLUMN "amountWithoutVat" SET NOT NULL;
ALTER TABLE "company_expenses" ALTER COLUMN "vatAmount" SET NOT NULL;
ALTER TABLE "company_expenses" ALTER COLUMN "paymentMethod" SET NOT NULL;
