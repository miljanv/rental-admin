-- Multi-tenancy: every business record now belongs to an Organization, and
-- users carry a role. Existing data is NOT deleted or rewritten: it is assigned
-- to a single organization ("Rental Travel") that the existing user(s) join.
--
-- New NOT NULL "organizationId" columns are added with a temporary DEFAULT so
-- existing rows are filled in one statement, then the DEFAULT is dropped so new
-- rows must always name their organization explicitly.

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPERADMIN', 'USER');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "organizations_name_key" ON "organizations"("name");

-- The organization that owns everything that exists before multi-tenancy.
INSERT INTO "organizations" ("id", "name", "isActive", "createdAt", "updatedAt")
VALUES ('cmseedorg0000000000000001', 'Rental Travel', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Users: role, deactivation flag, organization.
ALTER TABLE "User"
  ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'USER',
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "organizationId" TEXT;

UPDATE "User" SET "organizationId" = 'cmseedorg0000000000000001';

ALTER TABLE "User"
  ADD CONSTRAINT "User_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- Tenant ownership columns (backfilled with the organization above).
ALTER TABLE "FileObject" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'cmseedorg0000000000000001';
ALTER TABLE "drivers" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'cmseedorg0000000000000001';
ALTER TABLE "vehicles" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'cmseedorg0000000000000001';
ALTER TABLE "company_expenses" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'cmseedorg0000000000000001';
ALTER TABLE "suppliers" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'cmseedorg0000000000000001';
ALTER TABLE "supplier_bank_accounts" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'cmseedorg0000000000000001';
ALTER TABLE "partners" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'cmseedorg0000000000000001';
ALTER TABLE "partner_bank_accounts" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'cmseedorg0000000000000001';
ALTER TABLE "contracts" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'cmseedorg0000000000000001';
ALTER TABLE "transactions" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'cmseedorg0000000000000001';
ALTER TABLE "trip_series" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'cmseedorg0000000000000001';
ALTER TABLE "trips" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'cmseedorg0000000000000001';

ALTER TABLE "FileObject" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "drivers" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "vehicles" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "company_expenses" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "suppliers" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "supplier_bank_accounts" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "partners" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "partner_bank_accounts" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "contracts" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "transactions" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "trip_series" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "trips" ALTER COLUMN "organizationId" DROP DEFAULT;

-- Alarm thresholds were global (primary key = kind). Each organization now has
-- its own set; the existing rows go to the organization above.
ALTER TABLE "alarm_thresholds" ADD COLUMN "organizationId" TEXT NOT NULL DEFAULT 'cmseedorg0000000000000001';
ALTER TABLE "alarm_thresholds" ALTER COLUMN "organizationId" DROP DEFAULT;
ALTER TABLE "alarm_thresholds" DROP CONSTRAINT "alarm_thresholds_pkey",
  ADD CONSTRAINT "alarm_thresholds_pkey" PRIMARY KEY ("organizationId", "kind");

-- "Who created it". Only knowable when exactly one user has ever existed, so
-- historic rows are attributed to that user in that case and left NULL otherwise.
ALTER TABLE "drivers" ADD COLUMN "createdById" TEXT;
ALTER TABLE "vehicles" ADD COLUMN "createdById" TEXT;
ALTER TABLE "company_expenses" ADD COLUMN "createdById" TEXT;
ALTER TABLE "suppliers" ADD COLUMN "createdById" TEXT;
ALTER TABLE "partners" ADD COLUMN "createdById" TEXT;
ALTER TABLE "contracts" ADD COLUMN "createdById" TEXT;
ALTER TABLE "transactions" ADD COLUMN "createdById" TEXT;
ALTER TABLE "trips" ADD COLUMN "createdById" TEXT;

DO $$
DECLARE
  sole_user_id TEXT;
BEGIN
  IF (SELECT count(*) FROM "User") = 1 THEN
    SELECT "id" INTO sole_user_id FROM "User";

    UPDATE "drivers" SET "createdById" = sole_user_id;
    UPDATE "vehicles" SET "createdById" = sole_user_id;
    UPDATE "company_expenses" SET "createdById" = sole_user_id;
    UPDATE "suppliers" SET "createdById" = sole_user_id;
    UPDATE "partners" SET "createdById" = sole_user_id;
    UPDATE "contracts" SET "createdById" = sole_user_id;
    UPDATE "transactions" SET "createdById" = sole_user_id;
    UPDATE "trips" SET "createdById" = sole_user_id;
  END IF;
END $$;

-- Uniqueness is now per organization, so two companies can each register the
-- same plate, VIN, JMBG, supplier or bank account without colliding.
DROP INDEX "drivers_jmbg_key";
DROP INDEX "partner_bank_accounts_accountNumber_key";
DROP INDEX "supplier_bank_accounts_accountNumber_key";
DROP INDEX "suppliers_name_key";
DROP INDEX "suppliers_pib_key";
DROP INDEX "vehicles_licensePlate_key";
DROP INDEX "vehicles_vin_key";

CREATE UNIQUE INDEX "drivers_organizationId_jmbg_key" ON "drivers"("organizationId", "jmbg");
CREATE UNIQUE INDEX "partner_bank_accounts_organizationId_accountNumber_key" ON "partner_bank_accounts"("organizationId", "accountNumber");
CREATE UNIQUE INDEX "supplier_bank_accounts_organizationId_accountNumber_key" ON "supplier_bank_accounts"("organizationId", "accountNumber");
CREATE UNIQUE INDEX "suppliers_organizationId_name_key" ON "suppliers"("organizationId", "name");
CREATE UNIQUE INDEX "suppliers_organizationId_pib_key" ON "suppliers"("organizationId", "pib");
CREATE UNIQUE INDEX "vehicles_organizationId_licensePlate_key" ON "vehicles"("organizationId", "licensePlate");
CREATE UNIQUE INDEX "vehicles_organizationId_vin_key" ON "vehicles"("organizationId", "vin");

-- CreateIndex
CREATE INDEX "FileObject_organizationId_idx" ON "FileObject"("organizationId");
CREATE INDEX "company_expenses_organizationId_idx" ON "company_expenses"("organizationId");
CREATE INDEX "company_expenses_createdById_idx" ON "company_expenses"("createdById");
CREATE INDEX "contracts_organizationId_idx" ON "contracts"("organizationId");
CREATE INDEX "contracts_createdById_idx" ON "contracts"("createdById");
CREATE INDEX "drivers_organizationId_idx" ON "drivers"("organizationId");
CREATE INDEX "drivers_createdById_idx" ON "drivers"("createdById");
CREATE INDEX "partners_organizationId_idx" ON "partners"("organizationId");
CREATE INDEX "partners_createdById_idx" ON "partners"("createdById");
CREATE INDEX "suppliers_organizationId_idx" ON "suppliers"("organizationId");
CREATE INDEX "suppliers_createdById_idx" ON "suppliers"("createdById");
CREATE INDEX "transactions_organizationId_idx" ON "transactions"("organizationId");
CREATE INDEX "transactions_createdById_idx" ON "transactions"("createdById");
CREATE INDEX "trip_series_organizationId_idx" ON "trip_series"("organizationId");
CREATE INDEX "trips_organizationId_idx" ON "trips"("organizationId");
CREATE INDEX "trips_createdById_idx" ON "trips"("createdById");
CREATE INDEX "vehicles_organizationId_idx" ON "vehicles"("organizationId");
CREATE INDEX "vehicles_createdById_idx" ON "vehicles"("createdById");

-- AddForeignKey: organization (RESTRICT: an organization with data cannot be deleted)
ALTER TABLE "FileObject" ADD CONSTRAINT "FileObject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "company_expenses" ADD CONSTRAINT "company_expenses_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "supplier_bank_accounts" ADD CONSTRAINT "supplier_bank_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "partners" ADD CONSTRAINT "partners_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "partner_bank_accounts" ADD CONSTRAINT "partner_bank_accounts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "alarm_thresholds" ADD CONSTRAINT "alarm_thresholds_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trip_series" ADD CONSTRAINT "trip_series_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: creator (SET NULL: removing a user keeps the records)
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "company_expenses" ADD CONSTRAINT "company_expenses_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "partners" ADD CONSTRAINT "partners_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "trips" ADD CONSTRAINT "trips_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
