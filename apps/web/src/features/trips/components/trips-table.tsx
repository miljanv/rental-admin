'use client';

import type { TripDto } from '@rental-admin/shared';
import { MoreHorizontal, Pencil, Route, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/common/empty-state';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TripStatusBadge } from '@/features/trips/components/trip-status-badge';
import { tripClientDisplayName, tripLabel } from '@/features/trips/lib/trip';
import { formatDate } from '@/lib/format';

const COLUMN_COUNT = 6;

interface TripsTableProps {
  trips: TripDto[];
  isLoading: boolean;
  hasFilters: boolean;
  onRequestDelete: (trip: TripDto) => void;
  emptyAction?: React.ReactNode;
}

export function TripsTable({ trips, isLoading, hasFilters, onRequestDelete, emptyAction }: TripsTableProps) {
  if (!isLoading && trips.length === 0) {
    return hasFilters ? (
      <EmptyState
        icon={Route}
        title="Nema rezultata"
        description="Nijedna vožnja ne odgovara filterima. Pokušajte sa drugim kriterijumima."
      />
    ) : (
      <EmptyState icon={Route} title="Još nema vožnji" description="Kreirajte prvu vožnju." action={emptyAction} />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>RN broj / relacija</TableHead>
          <TableHead>Datum polaska</TableHead>
          <TableHead>Vozila</TableHead>
          <TableHead>Vozači</TableHead>
          <TableHead>Naručilac</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={5} columns={COLUMN_COUNT} />
        ) : (
          trips.map((trip) => (
            <TableRow key={trip.id}>
              <TableCell className="max-w-[240px]">
                <Link href={`/trips/${trip.id}`} className="hover:text-primary block">
                  <span className="block truncate font-medium">
                    {trip.referenceNumber ?? 'Bez RN broja'}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">{trip.route}</span>
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                {formatDate(trip.departureDate)}
                {trip.seriesId ? <span className="text-muted-foreground ml-1 text-xs">(serija)</span> : null}
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[160px] truncate text-sm">
                {trip.vehicles.length === 0
                  ? '—'
                  : trip.vehicles.map((vehicle) => vehicle.licensePlate).join(', ')}
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[160px] truncate text-sm">
                {trip.drivers.length === 0
                  ? '—'
                  : trip.drivers.map((driver) => driver.firstName).join(', ')}
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[160px] truncate text-sm">
                {tripClientDisplayName(trip) || '—'}
              </TableCell>
              <TableCell>
                <TripStatusBadge status={trip.status} />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Akcije za vožnju ${tripLabel(trip)}`}>
                      <MoreHorizontal className="size-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem asChild className="gap-2">
                      <Link href={`/trips/${trip.id}`}>
                        <Route className="size-4" aria-hidden />
                        Detalji
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="gap-2">
                      <Link href={`/trips/${trip.id}/edit`}>
                        <Pencil className="size-4" aria-hidden />
                        Izmeni
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onRequestDelete(trip)}
                      className="gap-2"
                    >
                      <Trash2 className="size-4" aria-hidden />
                      Obriši
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
