-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'DRIVER_LINK_VIEWED';

-- AlterTable
ALTER TABLE "driver_access_tokens" ADD COLUMN     "tokenCiphertext" TEXT;
