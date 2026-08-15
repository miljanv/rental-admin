-- CreateEnum
CREATE TYPE "PassengerListType" AS ENUM ('DOMESTIC', 'INTERNATIONAL');

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "isInternational" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "passenger_lists" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "type" "PassengerListType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "passenger_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passengers" (
    "id" TEXT NOT NULL,
    "passengerListId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "documentNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "passengers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "travel_permits" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "permitNumber" TEXT NOT NULL,
    "issuedAt" DATE NOT NULL,
    "fileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "travel_permits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "passenger_lists_contractId_idx" ON "passenger_lists"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "passenger_lists_contractId_type_key" ON "passenger_lists"("contractId", "type");

-- CreateIndex
CREATE INDEX "passengers_passengerListId_idx" ON "passengers"("passengerListId");

-- CreateIndex
CREATE UNIQUE INDEX "travel_permits_fileId_key" ON "travel_permits"("fileId");

-- CreateIndex
CREATE INDEX "travel_permits_contractId_idx" ON "travel_permits"("contractId");

-- AddForeignKey
ALTER TABLE "passenger_lists" ADD CONSTRAINT "passenger_lists_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "passengers" ADD CONSTRAINT "passengers_passengerListId_fkey" FOREIGN KEY ("passengerListId") REFERENCES "passenger_lists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_permits" ADD CONSTRAINT "travel_permits_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "travel_permits" ADD CONSTRAINT "travel_permits_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
