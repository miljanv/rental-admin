ALTER TABLE "trips"
  ADD COLUMN "cashRecipient" TEXT,
  ADD COLUMN "cashRecordedAt" DATE,
  ADD COLUMN "cashAmount" DOUBLE PRECISION,
  ADD COLUMN "cashDescription" TEXT;

CREATE TABLE "trip_cash_payments" (
  "id" TEXT NOT NULL,
  "tripId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "paidAt" DATE NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "trip_cash_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "trip_cash_payments_tripId_idx" ON "trip_cash_payments"("tripId");
CREATE INDEX "trip_cash_payments_paidAt_idx" ON "trip_cash_payments"("paidAt");

ALTER TABLE "trip_cash_payments"
  ADD CONSTRAINT "trip_cash_payments_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Copy legacy CASH invoice values into the new internal ledger fields without
-- deleting historic documents or allocations. New CASH entries never populate
-- the official invoice columns.
UPDATE "trips"
SET
  "cashRecordedAt" = "invoicedAt",
  "cashAmount" = COALESCE("invoiceGrossAmount", "price"),
  "cashDescription" = "invoiceDescription"
WHERE "paymentMethod" = 'CASH' AND "invoicedAt" IS NOT NULL;

INSERT INTO "trip_cash_payments" (
  "id", "tripId", "amount", "paidAt", "note", "createdAt", "updatedAt"
)
SELECT
  'migrated_' || allocation."id",
  trip."id",
  LEAST(allocation."amount", COALESCE(trip."cashAmount", 0)),
  transaction."occurredAt",
  'Preneto iz prethodnog rasknjižavanja',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "payment_allocations" allocation
JOIN "transactions" transaction ON transaction."id" = allocation."transactionId"
JOIN "trips" trip
  ON allocation."targetType" = 'TRIP_INVOICE'
  AND allocation."targetId" = trip."id"
WHERE trip."paymentMethod" = 'CASH'
  AND COALESCE(trip."cashAmount", 0) > 0
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "trip_cash_payments" (
  "id", "tripId", "amount", "paidAt", "note", "createdAt", "updatedAt"
)
SELECT
  'migrated_' || allocation."id" || '_' || trip."id",
  trip."id",
  ROUND(
    (
      allocation."amount" * COALESCE(trip."cashAmount", 0) /
      NULLIF(SUM(COALESCE(trip."cashAmount", 0)) OVER (PARTITION BY allocation."id"), 0)
    )::numeric,
    2
  )::double precision,
  transaction."occurredAt",
  'Preneto iz prethodnog rasknjižavanja serije',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "payment_allocations" allocation
JOIN "transactions" transaction ON transaction."id" = allocation."transactionId"
JOIN "trips" trip
  ON allocation."targetType" = 'TRIP_SERIES_INVOICE'
  AND allocation."targetId" = trip."invoiceGroupId"
WHERE trip."paymentMethod" = 'CASH'
  AND COALESCE(trip."cashAmount", 0) > 0
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "trip_cash_payments" (
  "id", "tripId", "amount", "paidAt", "note", "createdAt", "updatedAt"
)
SELECT
  'migrated_paid_' || trip."id",
  trip."id",
  trip."cashAmount",
  trip."paidAt",
  'Preneto iz prethodnog statusa naplate',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "trips" trip
WHERE trip."paymentMethod" = 'CASH'
  AND trip."paidAt" IS NOT NULL
  AND COALESCE(trip."cashAmount", 0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM "trip_cash_payments" payment WHERE payment."tripId" = trip."id"
  )
ON CONFLICT ("id") DO NOTHING;

