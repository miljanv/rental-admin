-- AlterTable
ALTER TABLE "drivers" ALTER COLUMN "email" DROP NOT NULL;

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "passengerCount" INTEGER,
ALTER COLUMN "referenceNumber" DROP NOT NULL;
