-- CreateEnum
CREATE TYPE "TripBillingDocumentType" AS ENUM ('PREDRACUN', 'RACUN');

-- CreateTable
CREATE TABLE "trip_billing_documents" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "type" "TripBillingDocumentType" NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "issuedAt" DATE NOT NULL,
    "fileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trip_billing_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trip_billing_documents_fileId_key" ON "trip_billing_documents"("fileId");

-- CreateIndex
CREATE INDEX "trip_billing_documents_tripId_idx" ON "trip_billing_documents"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_billing_documents_tripId_type_key" ON "trip_billing_documents"("tripId", "type");

-- AddForeignKey
ALTER TABLE "trip_billing_documents" ADD CONSTRAINT "trip_billing_documents_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_billing_documents" ADD CONSTRAINT "trip_billing_documents_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
