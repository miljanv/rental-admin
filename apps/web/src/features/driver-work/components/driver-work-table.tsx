'use client';

import type { DriverDriveDto } from '@rental-admin/shared';
import { Route } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/common/empty-state';
import { TableSkeleton } from '@/components/common/table-skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate, formatKilometers } from '@/lib/format';

const COLUMN_COUNT = 4;

interface DriverWorkTableProps {
  drives: DriverDriveDto[];
  isLoading: boolean;
}

export function DriverWorkTable({ drives, isLoading }: DriverWorkTableProps) {
  if (!isLoading && drives.length === 0) {
    return (
      <EmptyState
        icon={Route}
        title="Nema vožnji u izabranom periodu"
        description="Kilometri se uzimaju sa točenja dizela gde je ovaj vozač upisan na vozilu."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Datum</TableHead>
          <TableHead>Vozilo</TableHead>
          <TableHead>Mesto</TableHead>
          <TableHead className="text-right">Km</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={5} columns={COLUMN_COUNT} />
        ) : (
          drives.map((drive) => (
            <TableRow key={drive.id}>
              <TableCell className="text-muted-foreground">{formatDate(drive.fueledAt)}</TableCell>
              <TableCell>
                <Link href={`/vehicles/${drive.vehicleId}`} className="hover:underline">
                  {drive.vehicleLabel}
                </Link>
              </TableCell>
              <TableCell className="max-w-[180px] truncate">{drive.location}</TableCell>
              <TableCell className="text-right tabular-nums">
                {drive.kmDriven !== null ? formatKilometers(drive.kmDriven) : '—'}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
