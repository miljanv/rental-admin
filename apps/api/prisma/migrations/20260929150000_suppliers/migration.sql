CREATE TABLE "suppliers" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "pib" TEXT,
  "registrationNumber" TEXT,
  "address" TEXT,
  "city" TEXT,
  "contactPerson" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "suppliers_name_key" ON "suppliers"("name");
CREATE UNIQUE INDEX "suppliers_pib_key" ON "suppliers"("pib");
CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");
CREATE INDEX "suppliers_pib_idx" ON "suppliers"("pib");
