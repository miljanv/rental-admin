-- CreateTable
CREATE TABLE "trip_series_pauses" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_series_pauses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_series_pauses_seriesId_idx" ON "trip_series_pauses"("seriesId");

-- AddForeignKey
ALTER TABLE "trip_series_pauses" ADD CONSTRAINT "trip_series_pauses_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "trip_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;
