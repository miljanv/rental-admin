'use client';

import { SAFETY_EQUIPMENT_TYPE_LABELS, type VehicleSafetyEquipmentDto } from '@rental-admin/shared';
import { MoreHorizontal, Pencil, ShieldAlert, Trash2 } from 'lucide-react';

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
import { SafetyEquipmentExpiryBadge } from '@/features/vehicle-safety-equipment/components/safety-equipment-expiry-badge';
import { formatDate } from '@/lib/format';

const COLUMN_COUNT = 4;

interface VehicleSafetyEquipmentTableProps {
  equipment: VehicleSafetyEquipmentDto[];
  isLoading: boolean;
  todayIso: string;
  onEdit: (equipment: VehicleSafetyEquipmentDto) => void;
  onRequestDelete: (equipment: VehicleSafetyEquipmentDto) => void;
  emptyAction?: React.ReactNode;
}

export function VehicleSafetyEquipmentTable({
  equipment,
  isLoading,
  todayIso,
  onEdit,
  onRequestDelete,
  emptyAction,
}: VehicleSafetyEquipmentTableProps) {
  if (!isLoading && equipment.length === 0) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Još nema evidentirane opreme"
        description="Dodajte proveru prve pomoći ili PP aparata da počnete istoriju."
        action={emptyAction}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tip</TableHead>
          <TableHead>Datum provere</TableHead>
          <TableHead>Rok isteka</TableHead>
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={4} columns={COLUMN_COUNT} />
        ) : (
          equipment.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                {SAFETY_EQUIPMENT_TYPE_LABELS[item.type]}
              </TableCell>
              <TableCell className="text-muted-foreground">{formatDate(item.checkedAt)}</TableCell>
              <TableCell>
                <SafetyEquipmentExpiryBadge expiresAt={item.expiresAt} todayIso={todayIso} />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Akcije za ${SAFETY_EQUIPMENT_TYPE_LABELS[item.type]}`}
                    >
                      <MoreHorizontal className="size-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem className="gap-2" onClick={() => onEdit(item)}>
                      <Pencil className="size-4" aria-hidden />
                      Izmeni
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      className="gap-2"
                      onClick={() => onRequestDelete(item)}
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
