'use client';

import {
  defaultFinanceReportRange,
  PARTNER_LEDGER_ENTRY_TYPE_LABELS,
  partnerFullAddress,
  partnerSelectLabel,
  type PartnerLedgerDto,
} from '@rental-admin/shared';
import { Edit, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { DateField } from '@/components/common/date-field';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePartnerLedger } from '@/features/partners/hooks/use-partner-ledger';
import { formatDate, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

interface PartnerLedgerScreenProps {
  partnerId: string;
}

export function PartnerLedgerScreen({ partnerId }: PartnerLedgerScreenProps) {
  return <PartnerLedgerContent partnerId={partnerId} />;
}

interface PartnerLedgerContentProps {
  partnerId: string;
  embedded?: boolean;
}

export function PartnerLedgerContent({ partnerId, embedded = false }: PartnerLedgerContentProps) {
  const defaults = useMemo(() => defaultFinanceReportRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const query = usePartnerLedger(partnerId, { from, to });
  const ledger = query.data;
  const partner = ledger?.partner;

  if (query.isPending) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-36 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (query.isError || !ledger || !partner) {
    return (
      <ErrorState
        error={query.error ?? new Error('Kartica partnera nije pronađena.')}
        title="Kartica partnera nije učitana"
        retryLabel="Pokušaj ponovo"
        retryingLabel="Učitavanje..."
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  return (
    <div className="space-y-6">
      {embedded ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">{partnerSelectLabel(partner)}</h2>
            <p className="text-muted-foreground text-sm">{partnerFullAddress(partner)}</p>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/partners/${partner.id}/edit`}>
              <Edit className="size-4" aria-hidden />
              Izmeni
            </Link>
          </Button>
        </div>
      ) : (
        <PageHeader
          title={partnerSelectLabel(partner)}
          description={partnerFullAddress(partner)}
          actions={
            <Button variant="outline" asChild>
              <Link href={`/partners/${partner.id}/edit`}>
                <Edit className="size-4" aria-hidden />
                Izmeni
              </Link>
            </Button>
          }
        />
      )}

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Kartica kupca</CardTitle>
          <CardDescription>
            Zaduženja iz faktura i razduženja iz uplata, izvoda i keša.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1.5 sm:w-40">
              <Label htmlFor="ledger-from" className="text-xs">
                Od
              </Label>
              <DateField id="ledger-from" value={from} onChange={setFrom} />
            </div>
            <div className="space-y-1.5 sm:w-40">
              <Label htmlFor="ledger-to" className="text-xs">
                Do
              </Label>
              <DateField id="ledger-to" value={to} onChange={setTo} />
            </div>
            <Button
              variant="outline"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
              aria-label="Osveži karticu kupca"
            >
              <RefreshCw className={cn('size-4', query.isFetching && 'animate-spin')} aria-hidden />
              Osveži
            </Button>
          </div>

          <LedgerSummary ledger={ledger} />
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Promet po dokumentima</CardTitle>
          <CardDescription>
            Saldo se računa redom: fakture povećavaju dug kupca, uplate ga smanjuju.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <PartnerLedgerTable ledger={ledger} />
        </CardContent>
      </Card>
    </div>
  );
}

function LedgerSummary({ ledger }: { ledger: PartnerLedgerDto }) {
  const items = [
    { label: 'Početni saldo', value: ledger.summary.openingBalance },
    { label: 'Duguje u periodu', value: ledger.summary.periodDebit },
    { label: 'Potražuje u periodu', value: ledger.summary.periodCredit },
    { label: 'Saldo na kraju', value: ledger.summary.endingBalance, emphasize: true },
  ];

  return (
    <div className="grid gap-3 md:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border px-4 py-3">
          <p className="text-muted-foreground text-sm">{item.label}</p>
          <p
            className={cn(
              'mt-1 text-xl font-semibold',
              item.emphasize &&
                (item.value > 0
                  ? 'text-rose-700 dark:text-rose-300'
                  : 'text-emerald-700 dark:text-emerald-300'),
            )}
          >
            {formatMoney(item.value)}
          </p>
        </div>
      ))}
    </div>
  );
}

function PartnerLedgerTable({ ledger }: { ledger: PartnerLedgerDto }) {
  if (ledger.entries.length === 0) {
    return (
      <p className="text-muted-foreground px-6 py-8 text-sm">
        Nema zaduženja ili uplata za izabrani period.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[96px]">Datum</TableHead>
          <TableHead className="w-[130px]">Vrsta</TableHead>
          <TableHead className="min-w-[140px]">Broj dokumenta</TableHead>
          <TableHead className="min-w-[220px]">Opis</TableHead>
          <TableHead className="w-[110px]">Dospeće</TableHead>
          <TableHead className="w-[120px] text-right">Preostalo</TableHead>
          <TableHead className="w-[120px] text-right">Duguje</TableHead>
          <TableHead className="w-[120px] text-right">Potražuje</TableHead>
          <TableHead className="w-[120px] text-right">Saldo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ledger.entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>{formatDate(entry.postedAt)}</TableCell>
            <TableCell>{PARTNER_LEDGER_ENTRY_TYPE_LABELS[entry.type]}</TableCell>
            <TableCell>
              <span className="block font-medium">{entry.documentNumber ?? '—'}</span>
              {entry.externalDocumentNumber ? (
                <span className="text-muted-foreground block text-xs">
                  {entry.externalDocumentNumber}
                </span>
              ) : null}
            </TableCell>
            <TableCell className="max-w-[320px]">
              <span className="line-clamp-2">{entry.description}</span>
            </TableCell>
            <TableCell>{formatDate(entry.dueDate)}</TableCell>
            <TableCell className="text-right">{formatMoney(entry.remainingAmount)}</TableCell>
            <TableCell className="text-right">
              {entry.debit ? formatMoney(entry.debit) : '—'}
            </TableCell>
            <TableCell className="text-right">
              {entry.credit ? formatMoney(entry.credit) : '—'}
            </TableCell>
            <TableCell
              className={cn(
                'text-right font-medium',
                entry.balance > 0
                  ? 'text-rose-700 dark:text-rose-300'
                  : 'text-emerald-700 dark:text-emerald-300',
              )}
            >
              {formatMoney(entry.balance)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
