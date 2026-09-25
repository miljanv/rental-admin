-- Add invoice number for tracking supplier invoice rows split across vehicles.
ALTER TABLE "company_expenses" ADD COLUMN "invoiceNumber" TEXT;

CREATE INDEX "company_expenses_invoiceNumber_idx" ON "company_expenses"("invoiceNumber");

-- Company expenses are supplier liabilities now; actual payments will come
-- later from statement/import finance records, not from this tab.
UPDATE "company_expenses" SET "paidAt" = NULL;

DELETE FROM "transactions"
WHERE "sourceType" = 'COMPANY_EXPENSE'::"TransactionSourceType"
  AND "status" <> 'SETTLED';
