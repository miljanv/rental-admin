'use client';

import { FUEL_LOG_FUEL_TYPE_LABELS, type FuelLogDto } from '@rental-admin/shared';
import { Fuel, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

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
import { formatDate } from '@/lib/format';

const COLUMN_COUNT = 8;

interface FuelLogsTableProps {
  fuelLogs: FuelLogDto[];
  isLoading: boolean;
  onEdit: (fuelLog: FuelLogDto) => void;
  onRequestDelete: (fuelLog: FuelLogDto) => void;
  emptyAction?: React.ReactNode;
}

export function FuelLogsTable({
  fuelLogs,
  isLoading,
  onEdit,
  onRequestDelete,
  emptyAction,
}: FuelLogsTableProps) {
  if (!isLoading && fuelLogs.length === 0) {
    return (
      <EmptyState
        icon={Fuel}
        title="Još nema evidentiranih točenja"
        description="Dodajte prvo točenje da počnete evidenciju potrošnje."
        action={emptyAction}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Datum</TableHead>
          <TableHead>Mesto</TableHead>
          <TableHead>Vozač</TableHead>
          <TableHead>Tip</TableHead>
          <TableHead className="text-right">Litara</TableHead>
          <TableHead className="text-right">Km</TableHead>
          <TableHead className="text-right">Potrošnja</TableHead>
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={5} columns={COLUMN_COUNT} />
        ) : (
          fuelLogs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="text-muted-foreground">{formatDate(log.fueledAt)}</TableCell>
              <TableCell className="max-w-[160px] truncate">{log.location}</TableCell>
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
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Akcije za točenje ${formatDate(log.fueledAt)}`}>
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
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
