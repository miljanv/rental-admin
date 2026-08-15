'use client';

import type { ContractDocumentDto } from '@rental-admin/shared';
import { Download, FileText, Trash2 } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDeleteContractDocument } from '@/features/contract-documents/hooks/use-delete-contract-document';
import { useDownloadContractDocument } from '@/features/contract-documents/hooks/use-download-contract-document';
import { formatDateTime } from '@/lib/format';

const COLUMN_COUNT = 4;

interface ContractDocumentsTableProps {
  contractId: string;
  documents: ContractDocumentDto[];
  isLoading: boolean;
}

export function ContractDocumentsTable({
  contractId,
  documents,
  isLoading,
}: ContractDocumentsTableProps) {
  const downloadMutation = useDownloadContractDocument();
  const deleteMutation = useDeleteContractDocument(contractId);

  if (!isLoading && documents.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="Još nema generisanih dokumenata"
        description='Kliknite na "Generiši PDF" da napravite prvu verziju ugovora.'
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Verzija</TableHead>
          <TableHead>Generisano</TableHead>
          <TableHead>Fajl</TableHead>
          <TableHead className="w-[100px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={3} columns={COLUMN_COUNT} />
        ) : (
          documents.map((document) => (
            <TableRow key={document.id}>
              <TableCell>
                <Badge variant="secondary">v{document.version}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDateTime(document.generatedAt)}
              </TableCell>
              <TableCell className="max-w-[280px] truncate text-sm">
                {document.originalName}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Preuzmi verziju ${document.version}`}
                    onClick={() => downloadMutation.mutate({ fileId: document.fileId })}
                    disabled={downloadMutation.isPending}
                  >
                    <Download className="size-4" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Obriši verziju ${document.version}`}
                    onClick={() => deleteMutation.mutate(document.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
