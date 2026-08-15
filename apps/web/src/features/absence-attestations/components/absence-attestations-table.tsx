'use client';

import type { AbsenceAttestationDto } from '@rental-admin/shared';
import { ABSENCE_REASON_LABELS } from '@rental-admin/shared';
import { CalendarOff, Download, Eye, MoreHorizontal, Trash2 } from 'lucide-react';

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
import { useDownloadDocumentScan } from '@/features/driver-documents/hooks/use-download-document-scan';
import { usePreviewDocumentScan } from '@/features/driver-documents/hooks/use-preview-document-scan';
import { formatDate, formatDateTimeSr } from '@/lib/format';

const COLUMN_COUNT = 5;

interface AbsenceAttestationsTableProps {
  attestations: AbsenceAttestationDto[];
  isLoading: boolean;
  onRequestDelete: (attestation: AbsenceAttestationDto) => void;
}

export function AbsenceAttestationsTable({
  attestations,
  isLoading,
  onRequestDelete,
}: AbsenceAttestationsTableProps) {
  const downloadMutation = useDownloadDocumentScan();
  const previewMutation = usePreviewDocumentScan();
  const isScanBusy = downloadMutation.isPending || previewMutation.isPending;

  if (!isLoading && attestations.length === 0) {
    return (
      <EmptyState
        icon={CalendarOff}
        title="Još nema potvrda o odsustvu"
        description="Generišite potvrdu za svaki period u kojem vozač nije upravljao vozilom."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Period</TableHead>
          <TableHead>Razlog</TableHead>
          <TableHead>Mesto</TableHead>
          <TableHead>Izdato</TableHead>
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={4} columns={COLUMN_COUNT} />
        ) : (
          attestations.map((attestation) => {
            const reasonLabel =
              attestation.reason === 'OTHER' && attestation.otherReason
                ? `${ABSENCE_REASON_LABELS[attestation.reason]} — ${attestation.otherReason}`
                : ABSENCE_REASON_LABELS[attestation.reason];

            return (
              <TableRow key={attestation.id}>
                <TableCell>
                  {formatDateTimeSr(attestation.periodFrom)} – {formatDateTimeSr(attestation.periodTo)}
                </TableCell>
                <TableCell>{reasonLabel}</TableCell>
                <TableCell>{attestation.place}</TableCell>
                <TableCell>{formatDate(attestation.issuedAt)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Akcije potvrde">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {attestation.file ? (
                        <>
                          <DropdownMenuItem
                            disabled={isScanBusy}
                            onClick={() => {
                              if (!attestation.file) {
                                return;
                              }
                              previewMutation.mutate({
                                fileId: attestation.file.id,
                                tab: window.open('about:blank', '_blank'),
                              });
                            }}
                          >
                            <Eye className="size-4" aria-hidden />
                            Pregledaj
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            disabled={isScanBusy}
                            onClick={() => {
                              if (!attestation.file) {
                                return;
                              }
                              downloadMutation.mutate({ fileId: attestation.file.id });
                            }}
                          >
                            <Download className="size-4" aria-hidden />
                            Preuzmi PDF
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                        </>
                      ) : null}
                      <DropdownMenuItem variant="destructive" onClick={() => onRequestDelete(attestation)}>
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
