'use client';

import { VEHICLE_INSPECTION_TYPE_LABELS, type VehicleInspectionDto } from '@rental-admin/shared';
import { ClipboardCheck, Download, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

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
import { useDownloadVehicleScan } from '@/features/vehicles/hooks/use-download-vehicle-scan';
import { usePreviewVehicleScan } from '@/features/vehicles/hooks/use-preview-vehicle-scan';
import { formatDate } from '@/lib/format';

const COLUMN_COUNT = 5;

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
  const downloadMutation = useDownloadVehicleScan();
  const previewMutation = usePreviewVehicleScan();
  const isScanBusy = downloadMutation.isPending || previewMutation.isPending;

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
          <TableHead>Sken</TableHead>
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={4} columns={COLUMN_COUNT} />
        ) : (
          inspections.map((inspection) => {
            const scan = inspection.file;

            return (
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
                        aria-label={`Akcije za ${VEHICLE_INSPECTION_TYPE_LABELS[inspection.type]} pregled`}
                      >
                        <MoreHorizontal className="size-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem className="gap-2" onClick={() => onEdit(inspection)}>
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
                        onClick={() => onRequestDelete(inspection)}
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
