-- CreateEnum
CREATE TYPE "OpeningBalanceStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'REVERSED');

-- CreateEnum
CREATE TYPE "OpeningBalanceKind" AS ENUM ('DEBT', 'CREDIT');

-- AlterEnum
ALTER TYPE "TransactionSourceType" ADD VALUE 'OPENING_BALANCE';

-- AlterEnum
ALTER TYPE "SettlementTargetType" ADD VALUE 'OPENING_BALANCE';

-- CreateTable
CREATE TABLE "opening_balances" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdById" TEXT,
    "partnerId" TEXT,
    "supplierId" TEXT,
    "activeKey" TEXT,
    "kind" "OpeningBalanceKind" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "asOfDate" DATE NOT NULL,
    "note" TEXT,
    "status" "OpeningBalanceStatus" NOT NULL DEFAULT 'DRAFT',
    "confirmedAt" TIMESTAMP(3),
    "confirmedById" TEXT,
    "reversedAt" TIMESTAMP(3),
    "reversedById" TEXT,
    "reversalReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "opening_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_audit_events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "opening_balances_organizationId_partnerId_status_idx" ON "opening_balances"("organizationId", "partnerId", "status");

-- CreateIndex
CREATE INDEX "opening_balances_organizationId_supplierId_status_idx" ON "opening_balances"("organizationId", "supplierId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "opening_balances_organizationId_activeKey_key" ON "opening_balances"("organizationId", "activeKey");

-- CreateIndex
CREATE INDEX "finance_audit_events_organizationId_entityId_createdAt_idx" ON "finance_audit_events"("organizationId", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balances_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balances_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balances_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balances_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_audit_events" ADD CONSTRAINT "finance_audit_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_audit_events" ADD CONSTRAINT "finance_audit_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balance_one_party"
CHECK (("partnerId" IS NOT NULL)::int + ("supplierId" IS NOT NULL)::int = 1);
ALTER TABLE "opening_balances" ADD CONSTRAINT "opening_balance_positive_amount" CHECK ("amount" > 0);
