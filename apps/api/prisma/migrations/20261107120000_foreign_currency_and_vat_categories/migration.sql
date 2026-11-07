-- Adds EUR invoicing/payments and the VAT/TRANSFER finance categories.
-- Additive only: existing rows default to RSD and keep their values.

-- AlterEnum
ALTER TYPE "TransactionCategory" ADD VALUE 'VAT';
ALTER TYPE "TransactionCategory" ADD VALUE 'TRANSFER';

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('RSD', 'EUR');

-- AlterTable
ALTER TABLE "trips"
  ADD COLUMN "invoiceCurrency" "Currency" NOT NULL DEFAULT 'RSD',
  ADD COLUMN "invoiceExchangeRate" DOUBLE PRECISION,
  ADD COLUMN "invoiceCurrencyGrossAmount" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "transactions"
  ADD COLUMN "currency" "Currency" NOT NULL DEFAULT 'RSD',
  ADD COLUMN "currencyAmount" DOUBLE PRECISION,
  ADD COLUMN "exchangeRate" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "payment_allocations"
  ADD COLUMN "currencyAmount" DOUBLE PRECISION,
  ADD COLUMN "exchangeDifference" DOUBLE PRECISION;
