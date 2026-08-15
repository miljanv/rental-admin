'use client';

import type { TravelPermitDto } from '@rental-admin/shared';
import { Download, FileWarning, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

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
import { useDownloadTravelPermit } from '@/features/travel-permits/hooks/use-download-travel-permit';
import { formatDate } from '@/lib/format';

const COLUMN_COUNT = 4;

interface TravelPermitsTableProps {
  permits: TravelPermitDto[];
  isLoading: boolean;
  onEdit: (permit: TravelPermitDto) => void;
  onRequestDelete: (permit: TravelPermitDto) => void;
  emptyAction?: React.ReactNode;
}

export function TravelPermitsTable({
  permits,
  isLoading,
  onEdit,
  onRequestDelete,
  emptyAction,
}: TravelPermitsTableProps) {
  const downloadMutation = useDownloadTravelPermit();

  if (!isLoading && permits.length === 0) {
    return (
      <EmptyState
        icon={FileWarning}
        title="Još nema putnih dozvola"
        description="Dodajte dozvolu za svaku zemlju kroz koju ruta prolazi."
        action={emptyAction}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Zemlja</TableHead>
          <TableHead>Broj dozvole</TableHead>
          <TableHead>Datum izdavanja</TableHead>
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={3} columns={COLUMN_COUNT} />
        ) : (
          permits.map((permit) => (
            <TableRow key={permit.id}>
              <TableCell className="font-medium">{permit.country}</TableCell>
              <TableCell className="text-muted-foreground">{permit.permitNumber}</TableCell>
              <TableCell className="text-muted-foreground">{formatDate(permit.issuedAt)}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Akcije za dozvolu ${permit.country}`}
                    >
                      <MoreHorizontal className="size-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem className="gap-2" onClick={() => onEdit(permit)}>
                      <Pencil className="size-4" aria-hidden />
                      Izmeni
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2"
                      onClick={() => downloadMutation.mutate({ fileId: permit.fileId })}
                    >
                      <Download className="size-4" aria-hidden />
                      Preuzmi
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      className="gap-2"
                      onClick={() => onRequestDelete(permit)}
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
