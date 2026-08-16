'use client';

import { FUEL_LOG_FUEL_TYPE_LABELS, type FuelLogDto } from '@rental-admin/shared';
import { Fuel, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
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
import { fuelLogDriverLabel } from '@/features/fuel-logs/lib/fuel-log';
import { vehicleLabel } from '@/features/vehicles/lib/vehicle';
import { formatDate } from '@/lib/format';

interface FuelLogsTableProps {
  fuelLogs: FuelLogDto[];
  isLoading: boolean;
  showVehicle?: boolean;
  readOnly?: boolean;
  onEdit?: (fuelLog: FuelLogDto) => void;
  onRequestDelete?: (fuelLog: FuelLogDto) => void;
  emptyAction?: React.ReactNode;
}

export function FuelLogsTable({
  fuelLogs,
  isLoading,
  showVehicle = false,
  readOnly = false,
  onEdit,
  onRequestDelete,
  emptyAction,
}: FuelLogsTableProps) {
  const columnCount = (showVehicle ? 8 : 7) + (readOnly ? 0 : 1);

  if (!isLoading && fuelLogs.length === 0) {
    return (
      <EmptyState
        icon={Fuel}
        title="Još nema evidentiranih sipanja"
        description="Unos sipanja je na kartici Gorivo, iz grupnog ili pojedinačnog računa."
        action={emptyAction}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Datum</TableHead>
          {showVehicle ? <TableHead>Vozilo</TableHead> : null}
          <TableHead>Dobavljač</TableHead>
          <TableHead>Vozač</TableHead>
          <TableHead>Tip</TableHead>
          <TableHead className="text-right">Litara</TableHead>
          <TableHead className="text-right">Km</TableHead>
          <TableHead className="text-right">Potrošnja</TableHead>
          {readOnly ? null : <TableHead className="w-[60px] text-right">Akcije</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={5} columns={columnCount} />
        ) : (
          fuelLogs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="text-muted-foreground">{formatDate(log.fueledAt)}</TableCell>
              {showVehicle ? (
                <TableCell>
                  <Link href={`/vehicles/${log.vehicle.id}`} className="hover:underline">
                    {vehicleLabel(log.vehicle)}
                  </Link>
                </TableCell>
              ) : null}
              <TableCell className="max-w-[140px] truncate">{log.supplier}</TableCell>
              <TableCell className="text-muted-foreground">
                {fuelLogDriverLabel(log.driver)}
              </TableCell>
              <TableCell>{FUEL_LOG_FUEL_TYPE_LABELS[log.fuelType]}</TableCell>
              <TableCell className="text-right tabular-nums">
                {log.litersFilled.toLocaleString('sr-RS')} L
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {log.kmDriven !== null ? `${log.kmDriven.toLocaleString('sr-RS')} km` : '—'}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {log.consumptionPer100Km !== null
                  ? `${log.consumptionPer100Km.toLocaleString('sr-RS')} L/100km`
                  : '—'}
              </TableCell>
              {readOnly || !onEdit || !onRequestDelete ? null : (
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Akcije za sipanje ${formatDate(log.fueledAt)}`}
                      >
                        <MoreHorizontal className="size-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem className="gap-2" onClick={() => onEdit(log)}>
                        <Pencil className="size-4" aria-hidden />
                        Izmeni
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        className="gap-2"
                        onClick={() => onRequestDelete(log)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                        Obriši
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              )}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
