'use client';

import type { TachographCalibrationDto } from '@rental-admin/shared';
import { Download, Eye, Gauge, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

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
import { CalibrationExpiryBadge } from '@/features/tachograph-calibrations/components/calibration-expiry-badge';
import { useDownloadVehicleScan } from '@/features/vehicles/hooks/use-download-vehicle-scan';
import { usePreviewVehicleScan } from '@/features/vehicles/hooks/use-preview-vehicle-scan';
import { formatDate } from '@/lib/format';

const COLUMN_COUNT = 4;

interface TachographCalibrationsTableProps {
  calibrations: TachographCalibrationDto[];
  isLoading: boolean;
  todayIso: string;
  onEdit: (calibration: TachographCalibrationDto) => void;
  onRequestDelete: (calibration: TachographCalibrationDto) => void;
  emptyAction?: React.ReactNode;
}

export function TachographCalibrationsTable({
  calibrations,
  isLoading,
  todayIso,
  onEdit,
  onRequestDelete,
  emptyAction,
}: TachographCalibrationsTableProps) {
  const downloadMutation = useDownloadVehicleScan();
  const previewMutation = usePreviewVehicleScan();
  const isScanBusy = downloadMutation.isPending || previewMutation.isPending;

  if (!isLoading && calibrations.length === 0) {
    return (
      <EmptyState
        icon={Gauge}
        title="Još nema kalibracija"
        description="Dodajte prvu kalibraciju tahografa da počnete istoriju."
        action={emptyAction}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Datum kalibracije</TableHead>
          <TableHead>Rok isteka</TableHead>
          <TableHead>Sken</TableHead>
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={4} columns={COLUMN_COUNT} />
        ) : (
          calibrations.map((calibration) => {
            const scan = calibration.file;

            return (
              <TableRow key={calibration.id}>
                <TableCell className="font-medium">{formatDate(calibration.calibratedAt)}</TableCell>
                <TableCell>
                  <CalibrationExpiryBadge expiresAt={calibration.expiresAt} todayIso={todayIso} />
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
                        aria-label={`Akcije za kalibraciju od ${formatDate(calibration.calibratedAt)}`}
                      >
                        <MoreHorizontal className="size-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem className="gap-2" onClick={() => onEdit(calibration)}>
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
                        onClick={() => onRequestDelete(calibration)}
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
