'use client';

import type { VehicleMaintenanceDto } from '@rental-admin/shared';
import { MoreHorizontal, Pencil, Trash2, Wrench } from 'lucide-react';

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
import { formatDate } from '@/lib/format';

const COLUMN_COUNT = 7;

interface VehicleMaintenanceTableProps {
  records: VehicleMaintenanceDto[];
  isLoading: boolean;
  onEdit: (record: VehicleMaintenanceDto) => void;
  onRequestDelete: (record: VehicleMaintenanceDto) => void;
  emptyAction?: React.ReactNode;
}

export function VehicleMaintenanceTable({
  records,
  isLoading,
  onEdit,
  onRequestDelete,
  emptyAction,
}: VehicleMaintenanceTableProps) {
  if (!isLoading && records.length === 0) {
    return (
      <EmptyState
        icon={Wrench}
        title="Još nema evidentiranog održavanja"
        description="Dodajte prvu zamenu dela da počnete istoriju troškova."
        action={emptyAction}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Datum</TableHead>
          <TableHead>Deo</TableHead>
          <TableHead>Dobavljač</TableHead>
          <TableHead>Majstor</TableHead>
          <TableHead className="text-right">Km</TableHead>
          <TableHead className="text-right">Cena</TableHead>
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={5} columns={COLUMN_COUNT} />
        ) : (
          records.map((record) => (
            <TableRow key={record.id}>
              <TableCell className="text-muted-foreground">{formatDate(record.date)}</TableCell>
              <TableCell className="font-medium">{record.partName}</TableCell>
              <TableCell>{record.supplier}</TableCell>
              <TableCell className="text-muted-foreground">{record.mechanic}</TableCell>
              <TableCell className="text-right tabular-nums">
                {record.odometerKm.toLocaleString('sr-RS')} km
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {record.cost.toLocaleString('sr-RS')} RSD
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Akcije za ${record.partName}`}>
                      <MoreHorizontal className="size-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem className="gap-2" onClick={() => onEdit(record)}>
                      <Pencil className="size-4" aria-hidden />
                      Izmeni
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      className="gap-2"
                      onClick={() => onRequestDelete(record)}
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
