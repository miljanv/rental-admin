ALTER TYPE "TransactionSourceType" ADD VALUE IF NOT EXISTS 'BANK_STATEMENT';

ALTER TABLE "transactions"
  ADD COLUMN "statementNumber" TEXT,
  ADD COLUMN "bankReference" TEXT;

CREATE INDEX "transactions_statementNumber_idx" ON "transactions"("statementNumber");
CREATE INDEX "transactions_bankReference_idx" ON "transactions"("bankReference");
