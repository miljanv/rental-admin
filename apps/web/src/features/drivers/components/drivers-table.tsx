'use client';

import type { DriverDto } from '@rental-admin/shared';
import { Bus, MoreHorizontal, Pencil, Trash2, UserRound } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/common/empty-state';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { DriverStatusBadge } from '@/features/drivers/components/driver-status-badge';
import { driverFullName } from '@/features/drivers/lib/driver';

const COLUMN_COUNT = 6;

interface DriversTableProps {
  drivers: DriverDto[];
  isLoading: boolean;
  hasSearch: boolean;
  onRequestDelete: (driver: DriverDto) => void;
  emptyAction?: React.ReactNode;
}

export function DriversTable({
  drivers,
  isLoading,
  hasSearch,
  onRequestDelete,
  emptyAction,
}: DriversTableProps) {
  if (!isLoading && drivers.length === 0) {
    return hasSearch ? (
      <EmptyState
        icon={Bus}
        title="Nema rezultata"
        description="Nijedan vozač ne odgovara pretrazi. Pokušajte sa drugim pojmom."
      />
    ) : (
      <EmptyState
        icon={Bus}
        title="Još nema vozača"
        description="Dodajte prvog vozača da biste počeli evidenciju."
        action={emptyAction}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vozač</TableHead>
          <TableHead>Telefon</TableHead>
          <TableHead>Radno mesto</TableHead>
          <TableHead>Kategorija</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={5} columns={COLUMN_COUNT} />
        ) : (
          drivers.map((driver) => (
            <TableRow key={driver.id}>
              <TableCell className="max-w-[280px]">
                <Link href={`/drivers/${driver.id}`} className="hover:text-primary block">
                  <span className="block truncate font-medium">{driverFullName(driver)}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    JMBG {driver.jmbg}
                  </span>
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">{driver.phone}</TableCell>
              <TableCell>{driver.jobTitle}</TableCell>
              <TableCell className="font-mono text-xs">{driver.drivingLicenseCategory}</TableCell>
              <TableCell>
                <DriverStatusBadge status={driver.status} />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Akcije za ${driverFullName(driver)}`}
                    >
                      <MoreHorizontal className="size-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem asChild className="gap-2">
                      <Link href={`/drivers/${driver.id}`}>
                        <UserRound className="size-4" aria-hidden />
                        Profil
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="gap-2">
                      <Link href={`/drivers/${driver.id}/edit`}>
                        <Pencil className="size-4" aria-hidden />
                        Izmeni
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onRequestDelete(driver)}
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
