'use client';

import {
  VAT_RETURN_KIND_LABELS,
  defaultFinanceReportRange,
  type VatMonthlyPoint,
} from '@rental-admin/shared';
import { RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DateField } from '@/components/common/date-field';
import { ErrorState } from '@/components/common/error-state';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { MissingSupplyDatesCard } from '@/features/transactions/components/missing-supply-dates-card';
import { VatReturnSheet } from '@/features/transactions/components/vat-return-sheet';
import { useVatReport } from '@/features/transactions/hooks/use-vat-report';
import { formatMoney, formatMonthYear } from '@/lib/format';
import { cn } from '@/lib/utils';

const MONEY_EPSILON = 0.005;

/** Positive balance: output VAT exceeds input VAT, the company pays. Negative: the state refunds. */
function VatBalance({ balance }: { balance: number | undefined }) {
  if (balance == null || Math.abs(balance) < MONEY_EPSILON) {
    return <span className="text-muted-foreground">{formatMoney(0)}</span>;
  }

  const payable = balance > 0;

  return (
    <span
      className={cn(
        'font-medium',
        payable ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300',
      )}
    >
      {formatMoney(Math.abs(balance))}
      <span className="block text-xs font-normal">{payable ? 'za uplatu' : 'za povraćaj'}</span>
    </span>
  );
}

/** Signed open amount of a filed return: positive is still owed to the state, negative is owed back. */
const signedOpen = (row: VatMonthlyPoint): number =>
  row.vatReturn
    ? row.vatReturn.kind === 'PAYABLE'
      ? row.vatReturn.openAmount
      : -row.vatReturn.openAmount
    : 0;

const COLUMN_COUNT = 8;

export function VatReportCard() {
  const defaults = useMemo(() => defaultFinanceReportRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const query = useVatReport(from, to);
  const report = query.data;
  const [selectedMonth, setSelectedMonth] = useState<VatMonthlyPoint | null>(null);
  const totalOpen = (report?.monthly ?? []).reduce((sum, row) => sum + signedOpen(row), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5 sm:w-40">
          <Label htmlFor="vat-from" className="text-xs">
            Od
          </Label>
          <DateField id="vat-from" value={from} onChange={setFrom} />
        </div>
        <div className="space-y-1.5 sm:w-40">
          <Label htmlFor="vat-to" className="text-xs">
            Do
          </Label>
          <DateField id="vat-to" value={to} onChange={setTo} />
        </div>
        <Button
          variant="outline"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          aria-label="Osveži PDV obračun"
        >
          <RefreshCw className={cn('size-4', query.isFetching && 'animate-spin')} aria-hidden />
          Osveži
        </Button>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>PDV obračun po mesecima</CardTitle>
          <CardDescription>
            Izlazni PDV je sa vaših faktura, ulazni sa računa dobavljača, po datumu prometa. Kada je
            izlazni veći, razlika se plaća državi; kada je ulazni veći, država vraća razliku.
            Fakture u EUR ulaze u dinarima po kursu sa fakture.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {query.isError ? (
            <div className="px-6">
              <ErrorState
                error={query.error}
                title="PDV obračun nije učitan"
                onRetry={() => void query.refetch()}
                isRetrying={query.isFetching}
              />
            </div>
          ) : (
            <>
              {(report?.legacyInputCount ?? 0) + (report?.legacyOutputCount ?? 0) > 0 ? (
                <p className="mx-6 mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                  {report?.legacyInputCount ?? 0} ulaznih i {report?.legacyOutputCount ?? 0}{' '}
                  izlaznih starijih dokumenata nema datum prometa. Privremeno su svrstani po datumu
                  izdavanja računa.
                </p>
              ) : null}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mesec</TableHead>
                    <TableHead className="text-right">Izlazni PDV</TableHead>
                    <TableHead className="text-right">Ulazni PDV</TableHead>
                    <TableHead className="text-right">Razlika</TableHead>
                    <TableHead className="text-right">Po prijavi</TableHead>
                    <TableHead className="text-right">Plaćeno / vraćeno</TableHead>
                    <TableHead className="text-right">Otvoreno</TableHead>
                    <TableHead className="w-0">
                      <span className="sr-only">Prijava</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {query.isPending ? (
                    <TableSkeleton rows={4} columns={COLUMN_COUNT} />
                  ) : (report?.monthly ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={COLUMN_COUNT}
                        className="text-muted-foreground text-center"
                      >
                        Nema meseci u izabranom periodu.
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {(report?.monthly ?? []).map((row) => (
                        <TableRow key={`${row.year}-${row.month}`}>
                          <TableCell>{formatMonthYear(row.year, row.month)}</TableCell>
                          <TableCell className="text-right">{formatMoney(row.outputVat)}</TableCell>
                          <TableCell className="text-right">{formatMoney(row.inputVat)}</TableCell>
                          <TableCell className="text-right">
                            <VatBalance balance={row.balance} />
                          </TableCell>
                          <TableCell className="text-right">
                            {row.vatReturn ? (
                              <>
                                {formatMoney(row.vatReturn.amount)}
                                <span className="text-muted-foreground block text-xs">
                                  {VAT_RETURN_KIND_LABELS[row.vatReturn.kind].toLowerCase()}
                                  {row.vatReturn.documentNumber
                                    ? ` · ${row.vatReturn.documentNumber}`
                                    : ''}
                                </span>
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.vatReturn ? formatMoney(row.vatReturn.settledAmount) : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            {row.vatReturn ? <VatBalance balance={signedOpen(row)} /> : '—'}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={row.vatReturn ? 'ghost' : 'outline'}
                              onClick={() => setSelectedMonth(row)}
                            >
                              {row.vatReturn ? 'Izmeni' : 'Unesi prijavu'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell className="font-medium">Ukupno</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatMoney(report?.totals.outputVat)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatMoney(report?.totals.inputVat)}
                        </TableCell>
                        <TableCell className="text-right">
                          <VatBalance balance={report?.totals.balance} />
                        </TableCell>
                        <TableCell />
                        <TableCell />
                        <TableCell className="text-right">
                          <VatBalance balance={totalOpen} />
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-muted-foreground text-sm">
        Za svaki mesec unesite iznos sa podnete poreske prijave. Uplatu državi ili povraćaj od
        države iz izvoda označite kategorijom „PDV“ i preko „Poveži / rasporedi“ povežite sa
        prijavom; kolona „Otvoreno“ pokazuje šta je još ostalo. Kako se PDV zvanično prijavljuje i
        da li se preplata vraća ili prenosi, potvrdite sa knjigovođom.
      </p>

      <MissingSupplyDatesCard />

      <VatReturnSheet
        month={selectedMonth}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMonth(null);
          }
        }}
      />
    </div>
  );
}
