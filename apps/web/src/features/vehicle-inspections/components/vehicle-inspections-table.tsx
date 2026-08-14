'use client';

import { VEHICLE_INSPECTION_TYPE_LABELS, type VehicleInspectionDto } from '@rental-admin/shared';
import { ClipboardCheck, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

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
import { InspectionExpiryBadge } from '@/features/vehicle-inspections/components/inspection-expiry-badge';
import { formatDate } from '@/lib/format';

const COLUMN_COUNT = 4;

interface VehicleInspectionsTableProps {
  inspections: VehicleInspectionDto[];
  isLoading: boolean;
  todayIso: string;
  onEdit: (inspection: VehicleInspectionDto) => void;
  onRequestDelete: (inspection: VehicleInspectionDto) => void;
  emptyAction?: React.ReactNode;
}

export function VehicleInspectionsTable({
  inspections,
  isLoading,
  todayIso,
  onEdit,
  onRequestDelete,
  emptyAction,
}: VehicleInspectionsTableProps) {
  if (!isLoading && inspections.length === 0) {
    return (
      <EmptyState
        icon={ClipboardCheck}
        title="Još nema tehničkih pregleda"
        description="Dodajte redovni, šestomesečni ili mesečni pregled da počnete istoriju."
        action={emptyAction}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tip</TableHead>
          <TableHead>Datum pregleda</TableHead>
          <TableHead>Rok isteka</TableHead>
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={4} columns={COLUMN_COUNT} />
        ) : (
          inspections.map((inspection) => (
            <TableRow key={inspection.id}>
              <TableCell className="font-medium">
                {VEHICLE_INSPECTION_TYPE_LABELS[inspection.type]}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(inspection.inspectedAt)}
              </TableCell>
              <TableCell>
                <InspectionExpiryBadge expiresAt={inspection.expiresAt} todayIso={todayIso} />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Akcije za ${VEHICLE_INSPECTION_TYPE_LABELS[inspection.type]} pregled`}
                    >
                      <MoreHorizontal className="size-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem className="gap-2" onClick={() => onEdit(inspection)}>
                      <Pencil className="size-4" aria-hidden />
                      Izmeni
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      className="gap-2"
                      onClick={() => onRequestDelete(inspection)}
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
