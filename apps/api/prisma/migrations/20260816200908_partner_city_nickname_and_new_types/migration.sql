-- AlterEnum
ALTER TYPE "PartnerType" ADD VALUE 'BUS_OPERATOR';
ALTER TYPE "PartnerType" ADD VALUE 'FACTORY';
ALTER TYPE "PartnerType" ADD VALUE 'SCHOOL';
ALTER TYPE "PartnerType" ADD VALUE 'HOTEL';
ALTER TYPE "PartnerType" ADD VALUE 'MUNICIPALITY';

-- AlterTable: `city` is new and required. Existing rows only ever stored one
-- freeform "address" blob, so there's no reliable way to split it — backfill
-- `city` from that same value as a starting point instead of leaving it
-- blank; whoever owns the record can split it properly on the next edit.
ALTER TABLE "partners" ADD COLUMN "nickname" TEXT;
ALTER TABLE "partners" ADD COLUMN "city" TEXT;
UPDATE "partners" SET "city" = "address" WHERE "city" IS NULL;
ALTER TABLE "partners" ALTER COLUMN "city" SET NOT NULL;
