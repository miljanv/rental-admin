'use client';

import Link from 'next/link';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMissingSupplyDates } from '@/features/transactions/hooks/use-missing-supply-dates';
import { formatDate, formatMoney } from '@/lib/format';

/** Lists every bill and invoice still missing a supply date, so they can be filled in by hand. */
export function MissingSupplyDatesCard() {
  const query = useMissingSupplyDates();
  const expenses = query.data?.expenses ?? [];
  const invoices = query.data?.invoices ?? [];
  const total = expenses.length + invoices.length;

  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title="Dokumenti bez datuma prometa nisu učitani"
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  if (query.isPending || total === 0) {
    return null;
  }

  return (
    <Card className="border-amber-300 shadow-none">
      <CardHeader>
        <CardTitle>Bez datuma prometa: {total}</CardTitle>
        <CardDescription>
          Ovi dokumenti se privremeno računaju po datumu izdavanja. Upišite im datum prometa:
          fakturu kroz „Fakturiši“ na vožnji, račun dobavljača kroz izmenu u Troškovima (filter
          „Samo bez datuma prometa“).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 px-0">
        {invoices.length > 0 ? (
          <div>
            <h3 className="px-6 pb-2 text-sm font-semibold">Izlazne fakture ({invoices.length})</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum fakture</TableHead>
                  <TableHead>RN</TableHead>
                  <TableHead>Kupac</TableHead>
                  <TableHead>Relacija</TableHead>
                  <TableHead className="text-right">Iznos</TableHead>
                  <TableHead className="w-0">
                    <span className="sr-only">Otvori</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.tripId}>
                    <TableCell>{formatDate(invoice.invoicedAt)}</TableCell>
                    <TableCell>{invoice.referenceNumber ?? '—'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{invoice.client}</TableCell>
                    <TableCell className="max-w-[220px] truncate">
                      {invoice.route}
                      {invoice.isSeriesInvoice ? (
                        <span className="text-muted-foreground block text-xs">
                          Mesečna faktura serije
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(invoice.amount)}
                    </TableCell>
                    <TableCell>
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/trips/${invoice.tripId}`}>Otvori</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}

        {expenses.length > 0 ? (
          <div>
            <div className="flex items-center justify-between gap-3 px-6 pb-2">
              <h3 className="text-sm font-semibold">Ulazni računi ({expenses.length})</h3>
              <Button asChild size="sm" variant="outline">
                <Link href="/expenses">Otvori Troškove</Link>
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum računa</TableHead>
                  <TableHead>Broj računa</TableHead>
                  <TableHead>Dobavljač</TableHead>
                  <TableHead>Opis</TableHead>
                  <TableHead className="text-right">Ukupno</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{formatDate(expense.issuedAt)}</TableCell>
                    <TableCell>{expense.invoiceNumber ?? '—'}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{expense.supplier}</TableCell>
                    <TableCell className="max-w-[240px] truncate">{expense.description}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMoney(expense.amountWithVat)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
