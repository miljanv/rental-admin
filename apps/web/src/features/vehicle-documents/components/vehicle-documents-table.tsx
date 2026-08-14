'use client';

import { VEHICLE_DOCUMENT_TYPE_LABELS, type VehicleDocumentDto } from '@rental-admin/shared';
import { Download, Eye, FileText, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

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
import { useDownloadVehicleScan } from '@/features/vehicles/hooks/use-download-vehicle-scan';
import { usePreviewVehicleScan } from '@/features/vehicles/hooks/use-preview-vehicle-scan';
import { formatDate } from '@/lib/format';

const COLUMN_COUNT = 4;

interface VehicleDocumentsTableProps {
  documents: VehicleDocumentDto[];
  isLoading: boolean;
  onEdit: (document: VehicleDocumentDto) => void;
  onRequestDelete: (document: VehicleDocumentDto) => void;
  emptyAction?: React.ReactNode;
}

export function VehicleDocumentsTable({
  documents,
  isLoading,
  onEdit,
  onRequestDelete,
  emptyAction,
}: VehicleDocumentsTableProps) {
  const downloadMutation = useDownloadVehicleScan();
  const previewMutation = usePreviewVehicleScan();
  const isScanBusy = downloadMutation.isPending || previewMutation.isPending;

  if (!isLoading && documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Još nema dokumenata"
        description="Dodajte saobraćajnu dozvolu ili drugi dokument vozila i priložite sken."
        action={emptyAction}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tip</TableHead>
          <TableHead>Datum izdavanja</TableHead>
          <TableHead>Sken</TableHead>
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={3} columns={COLUMN_COUNT} />
        ) : (
          documents.map((document) => {
            const scan = document.file;

            return (
              <TableRow key={document.id}>
                <TableCell className="font-medium">
                  {VEHICLE_DOCUMENT_TYPE_LABELS[document.type]}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(document.issuedAt)}
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
                      <span className="max-w-[140px] truncate">{scan.originalName}</span>
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
                        aria-label={`Akcije za ${VEHICLE_DOCUMENT_TYPE_LABELS[document.type]}`}
                      >
                        <MoreHorizontal className="size-4" aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem className="gap-2" onClick={() => onEdit(document)}>
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
                        onClick={() => onRequestDelete(document)}
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
