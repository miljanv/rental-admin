-- CreateEnum
CREATE TYPE "DriverDocumentType" AS ENUM ('EMPLOYMENT_CONTRACT', 'MEDICAL_CERTIFICATE', 'ACCREDITATION', 'DRIVING_LICENSE', 'LICENSE');

-- CreateEnum
CREATE TYPE "EmploymentContractType" AS ENUM ('FIXED_TERM', 'INDEFINITE');

-- CreateTable
CREATE TABLE "driver_documents" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "type" "DriverDocumentType" NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "issuedAt" DATE NOT NULL,
    "expiresAt" DATE,
    "employmentContractType" "EmploymentContractType",
    "fileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "driver_documents_fileId_key" ON "driver_documents"("fileId");

-- CreateIndex
CREATE INDEX "driver_documents_driverId_idx" ON "driver_documents"("driverId");

-- CreateIndex
CREATE INDEX "driver_documents_expiresAt_idx" ON "driver_documents"("expiresAt");

-- CreateIndex
CREATE INDEX "driver_documents_type_idx" ON "driver_documents"("type");

-- AddForeignKey
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
