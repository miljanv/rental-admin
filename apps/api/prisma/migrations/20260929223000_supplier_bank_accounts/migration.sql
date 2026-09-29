CREATE TABLE "supplier_bank_accounts" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_bank_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supplier_bank_accounts_accountNumber_key" ON "supplier_bank_accounts"("accountNumber");

CREATE INDEX "supplier_bank_accounts_supplierId_idx" ON "supplier_bank_accounts"("supplierId");

ALTER TABLE "supplier_bank_accounts" ADD CONSTRAINT "supplier_bank_accounts_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
