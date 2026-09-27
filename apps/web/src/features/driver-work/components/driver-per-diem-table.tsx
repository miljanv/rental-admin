'use client';

import {
  DOMESTIC_PER_DIEM_RATE_RSD,
  FOREIGN_PER_DIEM_RATE_EUR,
  splitDomesticTaxable,
  type DriverTripPerDiemDto,
} from '@rental-admin/shared';
import { Route } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/common/empty-state';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate, formatKilometers, formatMoney } from '@/lib/format';

const COLUMN_COUNT = 8;

interface DriverPerDiemTableProps {
  trips: DriverTripPerDiemDto[];
  isLoading: boolean;
  onGenerate: (trip: DriverTripPerDiemDto) => void;
}

export function DriverPerDiemTable({ trips, isLoading, onGenerate }: DriverPerDiemTableProps) {
  if (!isLoading && trips.length === 0) {
    return (
      <EmptyState
        icon={Route}
        title="Nema vožnji u izabranom periodu"
        description="Dnevnice i akontacije se povlače sa obračuna vožnji na kojima je ovaj vozač upisan."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Datum</TableHead>
          <TableHead>Relacija</TableHead>
          <TableHead>Vozilo</TableHead>
          <TableHead className="text-right">Km</TableHead>
          <TableHead className="text-right">Dnevnica</TableHead>
          <TableHead className="text-right">Akontacija</TableHead>
          <TableHead className="text-right">Troškovi / razduženje</TableHead>
          <TableHead className="text-right">Dokumenta</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={5} columns={COLUMN_COUNT} />
        ) : (
          trips.map((trip) => {
            const taxable = trip.isDomestic
              ? splitDomesticTaxable(trip.perDiemAmount ?? 0)
              : null;

            return (
              <TableRow key={trip.tripId}>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {formatDate(trip.departureDate)}
                  {trip.returnDate && trip.returnDate !== trip.departureDate
                    ? ` – ${formatDate(trip.returnDate)}`
                    : ''}
                </TableCell>
                <TableCell>
                  <Link href={`/trips/${trip.tripId}`} className="hover:underline">
                    {trip.origin} – {trip.destination}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    {trip.isDomestic ? 'Zemlja' : trip.country ?? 'Inostranstvo'}
                  </p>
                </TableCell>
                <TableCell className="max-w-[160px] truncate">
                  {trip.vehicleLabels.length > 0 ? trip.vehicleLabels.join(', ') : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {trip.distanceKm != null ? formatKilometers(trip.distanceKm) : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {trip.perDiemAmount != null ? formatMoney(trip.perDiemAmount) : '—'}
                  {taxable && taxable.aboveCap > 0 ? (
                    <p className="text-muted-foreground text-xs">
                      do {formatMoney(DOMESTIC_PER_DIEM_RATE_RSD)} neoporezivo
                    </p>
                  ) : null}
                  {!trip.isDomestic ? (
                    <p className="text-muted-foreground text-xs">
                      plafon {FOREIGN_PER_DIEM_RATE_EUR} EUR (bez konverzije)
                    </p>
                  ) : null}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {trip.advanceAmount != null ? formatMoney(trip.advanceAmount) : '—'}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {trip.expensesTotal != null ? (
                    <>
                      <span>{formatMoney(trip.expensesTotal)}</span>
                      {trip.advanceOutstanding != null ? (
                        <p className="text-muted-foreground text-xs">
                          ostaje {formatMoney(trip.advanceOutstanding)}
                        </p>
                      ) : null}
                    </>
                  ) : trip.advanceAmount != null ? (
                    <span className="text-muted-foreground text-xs">
                      više vozača — troškovi se ne dele
                    </span>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button type="button" size="sm" variant="outline" onClick={() => onGenerate(trip)}>
                    Generiši
                  </Button>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
