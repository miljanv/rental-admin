'use client';

import {
  CASH_TRIP_PAYMENT_STATUSES,
  CASH_TRIP_PAYMENT_STATUS_LABELS,
  type CashTripLedgerRowDto,
  type CashTripPaymentStatus,
} from '@rental-admin/shared';
import { Banknote, RefreshCw } from 'lucide-react';
import { useState } from 'react';

import { DateField } from '@/components/common/date-field';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useCashTripLedger } from '@/features/trips/hooks/use-cash-trip-ledger';
import { useCreateTripCashPayment } from '@/features/trips/hooks/use-create-trip-cash-payment';
import { formatDate, formatMoney, localTodayIso } from '@/lib/format';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 10;
const ALL = 'all';

function CashPaymentDialog({
  trip,
  onOpenChange,
}: {
  trip: CashTripLedgerRowDto;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useCreateTripCashPayment(trip.tripId);
  const [amount, setAmount] = useState(String(trip.remainingAmount));
  const [paidAt, setPaidAt] = useState(localTodayIso());
  const [note, setNote] = useState('');

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await mutation.mutateAsync({ amount: Number(amount), paidAt, note });
    onOpenChange(false);
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Evidentiraj keš naplatu</DialogTitle>
          <DialogDescription>
            {trip.customer} · {trip.route}. Preostalo {formatMoney(trip.remainingAmount)}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4 px-6 pb-6">
          <div className="space-y-1.5">
            <Label htmlFor="cash-payment-amount">Naplaćeni iznos</Label>
            <div className="flex gap-2">
              <Input
                id="cash-payment-amount"
                type="number"
                inputMode="decimal"
                min="0.01"
                max={trip.remainingAmount}
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={mutation.isPending}
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setAmount(String(trip.remainingAmount))}
                disabled={mutation.isPending}
              >
                Ceo iznos
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cash-payment-date">Datum naplate</Label>
            <DateField
              id="cash-payment-date"
              value={paidAt}
              onChange={setPaidAt}
              disabled={mutation.isPending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cash-payment-note">Napomena (opciono)</Label>
            <Textarea
              id="cash-payment-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={mutation.isPending}
              rows={3}
            />
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Otkaži
            </Button>
            <Button type="submit" disabled={mutation.isPending || !amount || !paidAt}>
              {mutation.isPending ? 'Čuvanje…' : 'Sačuvaj naplatu'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const statusClassName = (status: CashTripPaymentStatus): string =>
  status === 'PAID'
    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
    : status === 'PARTIAL'
      ? 'border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
      : 'border-red-300 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200';

export function CashTripsLedger() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<typeof ALL | CashTripPaymentStatus>(ALL);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [paymentTarget, setPaymentTarget] = useState<CashTripLedgerRowDto | null>(null);
  const query = useCashTripLedger({
    page,
    limit: PAGE_SIZE,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(status !== ALL ? { status } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  });
  const summary = query.data?.summary;
  const rows = query.data?.items ?? [];
  const pagination = query.data?.pagination;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Ukupno zaduženje</CardDescription>
            <CardTitle>{formatMoney(summary?.totalCharged ?? 0)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Ukupno naplaćeno</CardDescription>
            <CardTitle className="text-emerald-700 dark:text-emerald-300">
              {formatMoney(summary?.totalCollected ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Preostalo za naplatu</CardDescription>
            <CardTitle className="text-red-700 dark:text-red-300">
              {formatMoney(summary?.totalRemaining ?? 0)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Banknote className="size-5" aria-hidden />
            Pregled keš vožnji
          </CardTitle>
          <CardDescription>
            Interna evidencija keš zaduženja i delimičnih naplata. Ne ulazi u zvanične finansije,
            profit ni PDV.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-0">
          <div className="grid gap-3 px-6 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_210px_160px_160px_auto] xl:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="cash-trip-search" className="text-xs">
                Pretraga
              </Label>
              <Input
                id="cash-trip-search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Kupac, relacija ili osoba kod koje ide keš"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status naplate</Label>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as typeof ALL | CashTripPaymentStatus);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>Svi statusi</SelectItem>
                  {CASH_TRIP_PAYMENT_STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {CASH_TRIP_PAYMENT_STATUS_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cash-trip-from" className="text-xs">
                Od
              </Label>
              <DateField
                id="cash-trip-from"
                value={from}
                onChange={(value) => {
                  setFrom(value);
                  setPage(1);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cash-trip-to" className="text-xs">
                Do
              </Label>
              <DateField
                id="cash-trip-to"
                value={to}
                onChange={(value) => {
                  setTo(value);
                  setPage(1);
                }}
              />
            </div>
            <Button
              variant="outline"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw className={cn('size-4', query.isFetching && 'animate-spin')} aria-hidden />
              Osveži
            </Button>
          </div>

          {query.isError ? (
            <ErrorState
              error={query.error}
              title="Keš vožnje nisu učitane"
              onRetry={() => void query.refetch()}
              isRetrying={query.isFetching}
            />
          ) : !query.isPending && rows.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="Nema keš vožnji"
              description="Vožnje će se pojaviti ovde kada ih evidentirate sa načinom plaćanja Keš."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vožnja</TableHead>
                    <TableHead>Kupac</TableHead>
                    <TableHead>Keš ide kod</TableHead>
                    <TableHead className="text-right">Zaduženje</TableHead>
                    <TableHead className="text-right">Naplaćeno</TableHead>
                    <TableHead className="text-right">Preostalo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Akcija</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.isPending ? <TableSkeleton rows={5} columns={8} /> : null}
                  {!query.isPending
                    ? rows.map((row) => (
                        <TableRow key={row.tripId}>
                          <TableCell className="min-w-64 align-top">
                            <p className="font-medium">{row.route}</p>
                            <p className="text-muted-foreground text-xs">
                          {formatDate(row.departureDate)} · evidentirano {formatDate(row.recordedAt)}
                              {row.referenceNumber ? ` · ${row.referenceNumber}` : ''}
                            </p>
                            {row.payments.length > 0 ? (
                              <div className="mt-2 space-y-1 border-l-2 pl-2">
                                {row.payments.map((payment) => (
                                  <p key={payment.id} className="text-muted-foreground text-xs">
                                    {formatDate(payment.paidAt)} · {formatMoney(payment.amount)}
                                    {payment.note ? ` · ${payment.note}` : ''}
                                  </p>
                                ))}
                              </div>
                            ) : null}
                          </TableCell>
                          <TableCell className="align-top">{row.customer}</TableCell>
                          <TableCell className="align-top">{row.cashRecipient ?? '—'}</TableCell>
                          <TableCell className="text-right align-top font-medium">
                            {formatMoney(row.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right align-top text-emerald-700 dark:text-emerald-300">
                            {formatMoney(row.collectedAmount)}
                          </TableCell>
                          <TableCell className="text-right align-top font-semibold">
                            {formatMoney(row.remainingAmount)}
                          </TableCell>
                          <TableCell className="align-top">
                            <Badge variant="outline" className={statusClassName(row.status)}>
                              {CASH_TRIP_PAYMENT_STATUS_LABELS[row.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right align-top">
                            <Button
                              size="sm"
                              onClick={() => setPaymentTarget(row)}
                              disabled={row.remainingAmount <= 0.005}
                            >
                              Evidentiraj naplatu
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    : null}
                </TableBody>
              </Table>
            </div>
          )}

          {(pagination?.totalPages ?? 0) > 1 ? (
            <div className="flex items-center justify-between gap-4 px-6 pt-2">
              <p className="text-muted-foreground text-sm">
                Strana {pagination?.page ?? page} od {pagination?.totalPages ?? 1}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || query.isFetching}
                >
                  Prethodna
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPage((current) => Math.min(pagination?.totalPages ?? current, current + 1))
                  }
                  disabled={page >= (pagination?.totalPages ?? 1) || query.isFetching}
                >
                  Sledeća
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {paymentTarget ? (
        <CashPaymentDialog
          key={paymentTarget.tripId}
          trip={paymentTarget}
          onOpenChange={(open) => {
            if (!open) {
              setPaymentTarget(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}
