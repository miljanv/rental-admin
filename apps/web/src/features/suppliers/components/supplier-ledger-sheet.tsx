'use client';

import {
  defaultFinanceReportRange,
  SUPPLIER_LEDGER_ENTRY_TYPE_LABELS,
  supplierLabel,
  type SupplierDto,
  type SupplierLedgerDto,
} from '@rental-admin/shared';
import { Edit, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { DateField } from '@/components/common/date-field';
import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useSupplierLedger } from '@/features/suppliers/hooks/use-supplier-ledger';
import { formatDate, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

interface SupplierLedgerSheetProps {
  supplier: SupplierDto | null;
  onOpenChange: (open: boolean) => void;
}

export function SupplierLedgerSheet({ supplier, onOpenChange }: SupplierLedgerSheetProps) {
  return (
    <Sheet open={supplier !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-6xl">
        <SheetHeader>
          <SheetTitle>Kartica dobavljača</SheetTitle>
          <SheetDescription>
            {supplier ? supplierLabel(supplier) : 'Zaduženja i plaćanja dobavljača.'}
          </SheetDescription>
        </SheetHeader>
        {supplier ? (
          <div className="px-4 pb-4">
            <SupplierLedgerContent supplierId={supplier.id} />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export function SupplierLedgerContent({ supplierId }: { supplierId: string }) {
  const defaults = useMemo(() => defaultFinanceReportRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const query = useSupplierLedger(supplierId, { from, to });
  const ledger = query.data;
  const supplier = ledger?.supplier;

  if (query.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (query.isError || !ledger || !supplier) {
    return (
      <ErrorState
        error={query.error ?? new Error('Kartica dobavljača nije pronađena.')}
        title="Kartica dobavljača nije učitana"
        retryLabel="Pokušaj ponovo"
        retryingLabel="Učitavanje..."
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{supplierLabel(supplier)}</h2>
          <p className="text-muted-foreground text-sm">
            {[supplier.address, supplier.city].filter(Boolean).join(', ') || 'Bez adrese'}
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href={`/suppliers/${supplier.id}/edit`}>
            <Edit className="size-4" aria-hidden />
            Izmeni
          </Link>
        </Button>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Kartica dobavljača</CardTitle>
          <CardDescription>
            Računi i troškovi povećavaju dug, plaćanja preko izvoda ili keša ga smanjuju.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1.5 sm:w-40">
              <Label htmlFor="supplier-ledger-from" className="text-xs">
                Od
              </Label>
              <DateField id="supplier-ledger-from" value={from} onChange={setFrom} />
            </div>
            <div className="space-y-1.5 sm:w-40">
              <Label htmlFor="supplier-ledger-to" className="text-xs">
                Do
              </Label>
              <DateField id="supplier-ledger-to" value={to} onChange={setTo} />
            </div>
            <Button
              variant="outline"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
              aria-label="Osveži karticu dobavljača"
            >
              <RefreshCw className={cn('size-4', query.isFetching && 'animate-spin')} aria-hidden />
              Osveži
            </Button>
          </div>

          <SupplierLedgerSummary ledger={ledger} />
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Promet po dokumentima</CardTitle>
          <CardDescription>
            Saldo se računa redom: zaduženja povećavaju dug, plaćanja ga smanjuju.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <SupplierLedgerTable ledger={ledger} />
        </CardContent>
      </Card>
    </div>
  );
}

function SupplierLedgerSummary({ ledger }: { ledger: SupplierLedgerDto }) {
  const items = [
    { label: 'Početni saldo', value: ledger.summary.openingBalance },
    { label: 'Zaduženo u periodu', value: ledger.summary.periodDebit },
    { label: 'Plaćeno u periodu', value: ledger.summary.periodCredit },
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

function SupplierLedgerTable({ ledger }: { ledger: SupplierLedgerDto }) {
  if (ledger.entries.length === 0) {
    return (
      <p className="text-muted-foreground px-6 py-8 text-sm">
        Nema zaduženja ili plaćanja za izabrani period.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[96px]">Datum</TableHead>
          <TableHead className="w-[130px]">Vrsta</TableHead>
          <TableHead className="min-w-[150px]">Dokument</TableHead>
          <TableHead className="min-w-[260px]">Opis</TableHead>
          <TableHead className="w-[120px] text-right">Duguje</TableHead>
          <TableHead className="w-[120px] text-right">Potražuje</TableHead>
          <TableHead className="w-[120px] text-right">Saldo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ledger.entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>{formatDate(entry.postedAt)}</TableCell>
            <TableCell>{SUPPLIER_LEDGER_ENTRY_TYPE_LABELS[entry.type]}</TableCell>
            <TableCell>{entry.documentNumber ?? '—'}</TableCell>
            <TableCell className="max-w-[360px]">
              <span className="line-clamp-2">{entry.description}</span>
            </TableCell>
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
