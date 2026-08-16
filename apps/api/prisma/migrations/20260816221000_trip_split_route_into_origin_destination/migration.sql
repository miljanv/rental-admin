-- AlterTable: split the single "route" text field into "origin" and
-- "destination" — a dash-separated place name (e.g. "Novi Sad") was
-- ambiguous with the "A - B" route separator itself. There's no reliable
-- way to auto-split existing freeform route text, so both new columns start
-- out backfilled with the old full route string; whoever owns each record
-- can split it properly on the next edit.
ALTER TABLE "trips" ADD COLUMN "destination" TEXT;
ALTER TABLE "trips" ADD COLUMN "origin" TEXT;
UPDATE "trips" SET "origin" = "route", "destination" = "route" WHERE "origin" IS NULL;
ALTER TABLE "trips" ALTER COLUMN "origin" SET NOT NULL;
ALTER TABLE "trips" ALTER COLUMN "destination" SET NOT NULL;
ALTER TABLE "trips" DROP COLUMN "route";
