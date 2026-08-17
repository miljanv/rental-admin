-- AlterTable: split the single "route" text field into "origin" and
-- "destination", mirroring the same split already done on trips. There's no
-- reliable way to auto-split existing freeform route text, so both new
-- columns start out backfilled with the old full route string; whoever owns
-- each record can split it properly on the next edit.
ALTER TABLE "contracts" ADD COLUMN "destination" TEXT;
ALTER TABLE "contracts" ADD COLUMN "origin" TEXT;
UPDATE "contracts" SET "origin" = "route", "destination" = "route" WHERE "origin" IS NULL;
ALTER TABLE "contracts" ALTER COLUMN "origin" SET NOT NULL;
ALTER TABLE "contracts" ALTER COLUMN "destination" SET NOT NULL;
ALTER TABLE "contracts" DROP COLUMN "route";
