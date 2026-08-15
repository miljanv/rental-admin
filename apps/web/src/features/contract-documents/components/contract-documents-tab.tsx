'use client';

import { FileText } from 'lucide-react';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ContractDocumentsTable } from '@/features/contract-documents/components/contract-documents-table';
import { useContractDocuments } from '@/features/contract-documents/hooks/use-contract-documents';
import { useGenerateContractDocument } from '@/features/contract-documents/hooks/use-generate-contract-document';

interface ContractDocumentsTabProps {
  contractId: string;
}

export function ContractDocumentsTab({ contractId }: ContractDocumentsTabProps) {
  const query = useContractDocuments(contractId);
  const generateMutation = useGenerateContractDocument(contractId);

  const documents = query.data ?? [];

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Dokumenti</CardTitle>
          <CardDescription>
            Generisane verzije ugovora u PDF-u. Svaka nova generacija dodaje novu verziju — prethodne
            ostaju dostupne.
          </CardDescription>
        </div>
        <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
          <FileText className="size-4" aria-hidden />
          {generateMutation.isPending ? 'Generisanje…' : 'Generiši PDF'}
        </Button>
      </CardHeader>
      <CardContent className="px-0">
        {query.isError ? (
          <ErrorState
            error={query.error}
            title="Dokumenti nisu učitani"
            retryLabel="Pokušaj ponovo"
            retryingLabel="Učitavanje…"
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
          />
        ) : (
          <ContractDocumentsTable
            contractId={contractId}
            documents={documents}
            isLoading={query.isPending}
          />
        )}
      </CardContent>
    </Card>
  );
}
