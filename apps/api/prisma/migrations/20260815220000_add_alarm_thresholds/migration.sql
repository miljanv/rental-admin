-- CreateTable
CREATE TABLE "alarm_thresholds" (
    "kind" TEXT NOT NULL,
    "criticalDays" INTEGER NOT NULL,
    "warningDays" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alarm_thresholds_pkey" PRIMARY KEY ("kind")
);
