'use client';

import type { TachographCalibrationDto } from '@rental-admin/shared';
import { Gauge, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

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
import { formatDate } from '@/lib/format';

const COLUMN_COUNT = 3;

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
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={4} columns={COLUMN_COUNT} />
        ) : (
          calibrations.map((calibration) => (
            <TableRow key={calibration.id}>
              <TableCell className="font-medium">{formatDate(calibration.calibratedAt)}</TableCell>
              <TableCell>
                <CalibrationExpiryBadge expiresAt={calibration.expiresAt} todayIso={todayIso} />
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
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem className="gap-2" onClick={() => onEdit(calibration)}>
                      <Pencil className="size-4" aria-hidden />
                      Izmeni
                    </DropdownMenuItem>
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
          ))
        )}
      </TableBody>
    </Table>
  );
}
