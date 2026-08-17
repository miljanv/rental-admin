-- AlterEnum: trip revenue and per-driver per-diem/advance now also auto-post
-- to the Finance ledger, alongside the existing expense-only sources.
ALTER TYPE "TransactionSourceType" ADD VALUE 'TRIP_REVENUE';
ALTER TYPE "TransactionSourceType" ADD VALUE 'TRIP_DRIVER_PER_DIEM';
ALTER TYPE "TransactionSourceType" ADD VALUE 'TRIP_DRIVER_ADVANCE';
