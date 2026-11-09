-- Session revocation. Additive only: existing tokens carry no version and match 0.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;
