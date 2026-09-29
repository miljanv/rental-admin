CREATE TYPE "SettlementTargetType" AS ENUM (
  'COMPANY_EXPENSE',
  'TRIP_INVOICE',
  'TRIP_SERIES_INVOICE'
);

CREATE TABLE "payment_allocations" (
  "id" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL,
  "targetType" "SettlementTargetType" NOT NULL,
  "targetId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_allocations_transactionId_targetType_targetId_key"
  ON "payment_allocations"("transactionId", "targetType", "targetId");

CREATE INDEX "payment_allocations_transactionId_idx"
  ON "payment_allocations"("transactionId");

CREATE INDEX "payment_allocations_targetType_targetId_idx"
  ON "payment_allocations"("targetType", "targetId");

ALTER TABLE "payment_allocations"
  ADD CONSTRAINT "payment_allocations_transactionId_fkey"
  FOREIGN KEY ("transactionId") REFERENCES "transactions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
