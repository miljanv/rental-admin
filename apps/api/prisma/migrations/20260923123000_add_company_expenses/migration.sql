-- AlterEnum
ALTER TYPE "TransactionSourceType" ADD VALUE 'COMPANY_EXPENSE';

-- CreateTable
CREATE TABLE "company_expenses" (
    "id" TEXT NOT NULL,
    "issuedAt" DATE NOT NULL,
    "paidAt" DATE,
    "supplier" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paymentMethod" "PaymentMethod",
    "vehicleId" TEXT,
    "odometerKm" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_expenses_issuedAt_idx" ON "company_expenses"("issuedAt");

-- CreateIndex
CREATE INDEX "company_expenses_paidAt_idx" ON "company_expenses"("paidAt");

-- CreateIndex
CREATE INDEX "company_expenses_supplier_idx" ON "company_expenses"("supplier");

-- CreateIndex
CREATE INDEX "company_expenses_vehicleId_idx" ON "company_expenses"("vehicleId");

-- AddForeignKey
ALTER TABLE "company_expenses" ADD CONSTRAINT "company_expenses_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
