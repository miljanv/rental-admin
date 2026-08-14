'use client';

import { SAFETY_EQUIPMENT_TYPE_LABELS, type VehicleSafetyEquipmentDto } from '@rental-admin/shared';
import { Download, Eye, MoreHorizontal, Pencil, ShieldAlert, Trash2 } from 'lucide-react';

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
import { useDownloadVehicleScan } from '@/features/vehicles/hooks/use-download-vehicle-scan';
import { usePreviewVehicleScan } from '@/features/vehicles/hooks/use-preview-vehicle-scan';
import { formatDate } from '@/lib/format';

const COLUMN_COUNT = 5;

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
  const downloadMutation = useDownloadVehicleScan();
  const previewMutation = usePreviewVehicleScan();
  const isScanBusy = downloadMutation.isPending || previewMutation.isPending;

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
          <TableHead>Sken</TableHead>
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={4} columns={COLUMN_COUNT} />
        ) : (
          equipment.map((item) => {
            const scan = item.file;

            return (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {SAFETY_EQUIPMENT_TYPE_LABELS[item.type]}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(item.checkedAt)}</TableCell>
                <TableCell>
                  <SafetyEquipmentExpiryBadge expiresAt={item.expiresAt} todayIso={todayIso} />
                </TableCell>
                <TableCell>
                  {scan ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Pregledaj ${scan.originalName}`}
                      onClick={() =>
                        previewMutation.mutate({
                          fileId: scan.id,
                          tab: window.open('about:blank', '_blank'),
                        })
                      }
                      disabled={isScanBusy}
                    >
                      <Eye className="size-4" aria-hidden />
                      <span className="max-w-[120px] truncate">{scan.originalName}</span>
                    </Button>
                  ) : (
                    <span className="text-muted-foreground text-xs">Nema skena</span>
                  )}
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
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem className="gap-2" onClick={() => onEdit(item)}>
                        <Pencil className="size-4" aria-hidden />
                        Izmeni
                      </DropdownMenuItem>
                      {scan ? (
                        <>
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() =>
                              previewMutation.mutate({
                                fileId: scan.id,
                                tab: window.open('about:blank', '_blank'),
                              })
                            }
                          >
                            <Eye className="size-4" aria-hidden />
                            Pregledaj
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2"
                            onClick={() => downloadMutation.mutate({ fileId: scan.id })}
                          >
                            <Download className="size-4" aria-hidden />
                            Preuzmi sken
                          </DropdownMenuItem>
                        </>
                      ) : null}
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
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
