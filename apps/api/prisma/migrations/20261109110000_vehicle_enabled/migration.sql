-- Superadmin switch on vehicles. Additive only: every existing vehicle starts enabled.

-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN "isEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "vehicles_organizationId_isEnabled_idx" ON "vehicles"("organizationId", "isEnabled");
