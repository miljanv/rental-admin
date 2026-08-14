-- CreateEnum
CREATE TYPE "DriverStatus" AS ENUM ('ACTIVE', 'SICK_LEAVE', 'VACATION', 'INACTIVE');

-- CreateTable
CREATE TABLE "drivers" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "jmbg" TEXT NOT NULL,
    "dateOfBirth" DATE NOT NULL,
    "residencePlace" TEXT NOT NULL,
    "educationLevel" TEXT NOT NULL,
    "idCardNumber" TEXT NOT NULL,
    "drivingLicenseNumber" TEXT NOT NULL,
    "drivingLicenseCategory" TEXT NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "status" "DriverStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "drivers_jmbg_key" ON "drivers"("jmbg");

-- CreateIndex
CREATE INDEX "drivers_status_idx" ON "drivers"("status");

-- CreateIndex
CREATE INDEX "drivers_lastName_firstName_idx" ON "drivers"("lastName", "firstName");
