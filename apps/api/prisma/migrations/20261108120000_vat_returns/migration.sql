-- Monthly VAT returns that VAT payments and refunds are settled against.
-- Additive only: a new enum value, a new enum and a new table.

-- AlterEnum
ALTER TYPE "SettlementTargetType" ADD VALUE 'VAT_RETURN';

-- CreateEnum
CREATE TYPE "VatReturnKind" AS ENUM ('PAYABLE', 'REFUND');

-- CreateTable
CREATE TABLE "vat_returns" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "kind" "VatReturnKind" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "documentNumber" TEXT,
    "filedAt" DATE,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vat_returns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vat_returns_organizationId_year_month_key" ON "vat_returns"("organizationId", "year", "month");

-- CreateIndex
CREATE INDEX "vat_returns_organizationId_idx" ON "vat_returns"("organizationId");

-- CreateIndex
CREATE INDEX "vat_returns_createdById_idx" ON "vat_returns"("createdById");

-- AddForeignKey
ALTER TABLE "vat_returns" ADD CONSTRAINT "vat_returns_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_returns" ADD CONSTRAINT "vat_returns_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
