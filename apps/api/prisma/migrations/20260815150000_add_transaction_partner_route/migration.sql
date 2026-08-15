-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "partner" TEXT,
ADD COLUMN "route" TEXT;

-- CreateIndex
CREATE INDEX "transactions_partner_idx" ON "transactions"("partner");

-- CreateIndex
CREATE INDEX "transactions_route_idx" ON "transactions"("route");
