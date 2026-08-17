'use client';

import { TRIP_BILLING_DOCUMENT_TYPE_LABELS, type TripBillingDocumentDto } from '@rental-admin/shared';
import { FileText } from 'lucide-react';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGenerateTripBillingDocument } from '@/features/trip-billing-documents/hooks/use-generate-trip-billing-document';
import { useTripBillingDocuments } from '@/features/trip-billing-documents/hooks/use-trip-billing-documents';
import { formatDate } from '@/lib/format';

interface TripBillingDocumentsSectionProps {
  tripId: string;
}

function BillingDocumentCard({
  title,
  document,
  onGenerate,
  isPending,
}: {
  title: string;
  document: TripBillingDocumentDto | undefined;
  onGenerate: () => void;
  isPending: boolean;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">{title}</CardTitle>
        {document ? <CardDescription>Br. {document.documentNumber}</CardDescription> : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {document ? (
          <p className="text-muted-foreground text-xs">Izdato {formatDate(document.issuedAt)}</p>
        ) : (
          <p className="text-muted-foreground text-sm">Nije generisan.</p>
        )}
        <Button type="button" size="sm" className="w-full" onClick={onGenerate} disabled={isPending}>
          <FileText className="size-4" aria-hidden />
          {isPending ? 'Generisanje…' : document ? 'Ponovo generiši' : 'Generiši'}
        </Button>
      </CardContent>
    </Card>
  );
}

/** Internal record-keeping PDFs pulled straight from the trip's own data — not fiscal documents. */
export function TripBillingDocumentsSection({ tripId }: TripBillingDocumentsSectionProps) {
  const query = useTripBillingDocuments(tripId);
  const generatePredracun = useGenerateTripBillingDocument(tripId, 'PREDRACUN');
  const generateRacun = useGenerateTripBillingDocument(tripId, 'RACUN');

  const documents = query.data ?? [];
  const predracun = documents.find((document) => document.type === 'PREDRACUN');
  const racun = documents.find((document) => document.type === 'RACUN');

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>{TRIP_BILLING_DOCUMENT_TYPE_LABELS.PREDRACUN} i {TRIP_BILLING_DOCUMENT_TYPE_LABELS.RACUN}</CardTitle>
        <CardDescription>
          Interni dokumenti za evidenciju, popunjeni podacima vožnje — nisu fiskalni dokumenti.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {query.isError ? (
          <ErrorState
            error={query.error}
            title="Dokumenti nisu učitani"
            retryLabel="Pokušaj ponovo"
            retryingLabel="Učitavanje…"
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
          />
        ) : query.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <BillingDocumentCard
              title={TRIP_BILLING_DOCUMENT_TYPE_LABELS.PREDRACUN}
              document={predracun}
              onGenerate={() => generatePredracun.mutate()}
              isPending={generatePredracun.isPending}
            />
            <BillingDocumentCard
              title={TRIP_BILLING_DOCUMENT_TYPE_LABELS.RACUN}
              document={racun}
              onGenerate={() => generateRacun.mutate()}
              isPending={generateRacun.isPending}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
