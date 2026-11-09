-- Company details for the superadmin. Additive only: every column is nullable.

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN "taxId" TEXT,
ADD COLUMN "registrationNumber" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "contactName" TEXT,
ADD COLUMN "contactPhone" TEXT,
ADD COLUMN "contactEmail" TEXT;
