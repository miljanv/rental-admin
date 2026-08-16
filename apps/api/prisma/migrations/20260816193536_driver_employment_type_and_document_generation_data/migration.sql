-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('ACTUAL', 'NOMINAL');

-- AlterTable
ALTER TABLE "driver_documents" ADD COLUMN     "generationData" JSONB;

-- AlterTable
ALTER TABLE "drivers" ADD COLUMN     "employmentType" "EmploymentType" NOT NULL DEFAULT 'ACTUAL';
