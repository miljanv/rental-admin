'use client';

import type { DriverDocumentDto } from '@rental-admin/shared';
import { DRIVER_DOCUMENT_TYPE_LABELS, EMPLOYMENT_CONTRACT_TYPE_LABELS } from '@rental-admin/shared';
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
import { DocumentExpiryBadge } from '@/features/driver-documents/components/document-expiry-badge';
import { useDownloadDocumentScan } from '@/features/driver-documents/hooks/use-download-document-scan';
import { usePreviewDocumentScan } from '@/features/driver-documents/hooks/use-preview-document-scan';
import { formatDate } from '@/lib/format';

const COLUMN_COUNT = 6;

interface DriverDocumentsTableProps {
  documents: DriverDocumentDto[];
  isLoading: boolean;
  todayIso: string;
  onEdit: (document: DriverDocumentDto) => void;
  onRequestDelete: (document: DriverDocumentDto) => void;
  emptyAction?: React.ReactNode;
}

export function DriverDocumentsTable({
  documents,
  isLoading,
  todayIso,
  onEdit,
  onRequestDelete,
  emptyAction,
}: DriverDocumentsTableProps) {
  const downloadMutation = useDownloadDocumentScan();
  const previewMutation = usePreviewDocumentScan();
  const isScanBusy = downloadMutation.isPending || previewMutation.isPending;

  if (!isLoading && documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Još nema dokumenata"
        description="Dodajte ugovor, lekarski, akreditaciju, vozačku ili licencu i priložite sken."
        action={emptyAction}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Tip</TableHead>
          <TableHead>Broj</TableHead>
          <TableHead>Izdato</TableHead>
          <TableHead>Važenje</TableHead>
          <TableHead>Sken</TableHead>
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={4} columns={COLUMN_COUNT} />
        ) : (
          documents.map((document) => {
            const contractLabel = document.employmentContractType
              ? EMPLOYMENT_CONTRACT_TYPE_LABELS[document.employmentContractType]
              : null;
            const scan = document.file;

            return (
              <TableRow key={document.id}>
                <TableCell>
                  <span className="block font-medium">
                    {DRIVER_DOCUMENT_TYPE_LABELS[document.type]}
                  </span>
                  {contractLabel ? (
                    <span className="text-muted-foreground text-xs">{contractLabel}</span>
                  ) : null}
                </TableCell>
                <TableCell className="font-mono text-xs">{document.documentNumber}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(document.issuedAt)}
                </TableCell>
                <TableCell>
                  <DocumentExpiryBadge expiresAt={document.expiresAt} todayIso={todayIso} />
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
                        aria-label={`Akcije za ${DRIVER_DOCUMENT_TYPE_LABELS[document.type]}`}
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
