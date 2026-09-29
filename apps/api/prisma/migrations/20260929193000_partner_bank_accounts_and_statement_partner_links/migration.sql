CREATE TABLE "partner_bank_accounts" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "partner_bank_accounts_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "transactions" ADD COLUMN "partnerId" TEXT;

CREATE UNIQUE INDEX "partner_bank_accounts_accountNumber_key" ON "partner_bank_accounts"("accountNumber");
CREATE INDEX "partner_bank_accounts_partnerId_idx" ON "partner_bank_accounts"("partnerId");
CREATE INDEX "transactions_partnerId_idx" ON "transactions"("partnerId");

ALTER TABLE "partner_bank_accounts"
ADD CONSTRAINT "partner_bank_accounts_partnerId_fkey"
FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "transactions"
ADD CONSTRAINT "transactions_partnerId_fkey"
FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
