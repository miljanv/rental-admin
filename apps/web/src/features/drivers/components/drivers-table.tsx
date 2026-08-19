'use client';

import type { DriverDto } from '@rental-admin/shared';
import { MoreHorizontal, Pencil, Trash2, UserRound } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/common/empty-state';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { Badge } from '@/components/ui/badge';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DriverStatusBadge } from '@/features/drivers/components/driver-status-badge';
import { driverFullName } from '@/features/drivers/lib/driver';
import { cn } from '@/lib/utils';

const COLUMN_COUNT = 6;

const splitCommaList = (value: string): string[] =>
  value
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);

interface DriversTableProps {
  drivers: DriverDto[];
  isLoading: boolean;
  hasSearch: boolean;
  onRequestDelete: (driver: DriverDto) => void;
  emptyAction?: React.ReactNode;
}

function TruncatedHint({
  items,
  className,
  mono,
}: {
  items: string[];
  className?: string;
  mono?: boolean;
}) {
  if (items.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }

  const first = items[0];
  const rest = items.slice(1);

  if (!first) {
    return <span className="text-muted-foreground">—</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex max-w-full cursor-default items-center gap-1.5 bg-transparent p-0 text-left text-sm font-normal',
            className,
          )}
        >
          <span className={cn('min-w-0 truncate', mono && 'font-mono text-xs')}>{first}</span>
          {rest.length > 0 ? (
            <Badge variant="secondary" className="px-1.5 font-normal tabular-nums">
              +{rest.length}
            </Badge>
          ) : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-sm flex-col items-start gap-1 py-2 text-left">
        {items.map((item) => (
          <span key={item} className={cn('block', mono && 'font-mono')}>
            {item}
          </span>
        ))}
      </TooltipContent>
    </Tooltip>
  );
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
        icon={UserRound}
        title="Nema rezultata"
        description="Nijedan zaposleni ne odgovara pretrazi. Pokušajte sa drugim pojmom."
      />
    ) : (
      <EmptyState
        icon={UserRound}
        title="Još nema zaposlenih"
        description="Dodajte prvog zaposlenog da biste počeli evidenciju."
        action={emptyAction}
      />
    );
  }

  return (
    <TooltipProvider delayDuration={250}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Zaposleni</TableHead>
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
                <TableCell className="max-w-[220px] min-w-0">
                  <Link href={`/drivers/${driver.id}`} className="hover:text-primary block">
                    <span className="block truncate font-medium">{driverFullName(driver)}</span>
                    <span className="text-muted-foreground block truncate text-xs">
                      JMBG {driver.jmbg}
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground tabular-nums">{driver.phone}</TableCell>
                <TableCell className="max-w-[240px] min-w-0">
                  <TruncatedHint items={splitCommaList(driver.jobTitle)} />
                </TableCell>
                <TableCell className="max-w-[140px] min-w-0">
                  <TruncatedHint items={splitCommaList(driver.drivingLicenseCategory)} mono />
                </TableCell>
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
    </TooltipProvider>
  );
}
