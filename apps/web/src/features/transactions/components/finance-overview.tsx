'use client';

import { defaultFinanceReportRange } from '@rental-admin/shared';
import { Building2, MapPin, RefreshCw, Truck } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DateField } from '@/components/common/date-field';
import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ExpenseCategoryPie } from '@/features/transactions/components/expense-category-pie';
import { FinanceExportMenu } from '@/features/transactions/components/finance-export-menu';
import { MonthlyIncomeExpenseChart } from '@/features/transactions/components/monthly-income-expense-chart';
import { PaymentMethodBreakdown } from '@/features/transactions/components/payment-method-breakdown';
import { ProfitTable } from '@/features/transactions/components/profit-table';
import { UnsettledAdvancesCard } from '@/features/transactions/components/unsettled-advances-card';
import { useFinanceReport } from '@/features/transactions/hooks/use-finance-report';
import { vehicleLabel } from '@/features/vehicles/lib/vehicle';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

interface FinanceOverviewProps {
  onSettleAdvance: Parameters<typeof UnsettledAdvancesCard>[0]['onSettle'];
}

export function FinanceOverview({ onSettleAdvance }: FinanceOverviewProps) {
  const defaults = useMemo(() => defaultFinanceReportRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const query = useFinanceReport(from, to);
  const report = query.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5 sm:w-40">
          <Label htmlFor="report-from" className="text-xs">
            Od
          </Label>
          <DateField id="report-from" value={from} onChange={setFrom} />
        </div>
        <div className="space-y-1.5 sm:w-40">
          <Label htmlFor="report-to" className="text-xs">
            Do
          </Label>
          <DateField id="report-to" value={to} onChange={setTo} />
        </div>
        <Button
          variant="outline"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          aria-label="Osveži izveštaj"
        >
          <RefreshCw className={cn('size-4', query.isFetching && 'animate-spin')} aria-hidden />
          Osveži
        </Button>
        <FinanceExportMenu params={{ from, to }} />
      </div>

      {query.isError ? (
        <ErrorState
          error={query.error}
          title="Izveštaj nije učitan"
          retryLabel="Pokušaj ponovo"
          retryingLabel="Učitavanje…"
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard title="Prihod" value={report?.totals.income} loading={query.isPending} />
            <SummaryCard title="Rashod" value={report?.totals.expense} loading={query.isPending} />
            <SummaryCard
              title="Profit"
              value={report?.totals.profit}
              loading={query.isPending}
              emphasize
            />
          </div>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Prihod i rashod po mesecima</CardTitle>
              <CardDescription>Keš i račun su sabrani; raspodelu plaćanja vidi ispod.</CardDescription>
            </CardHeader>
            <CardContent>
              {query.isPending ? (
                <p className="text-muted-foreground text-sm">Učitavanje grafikona…</p>
              ) : (
                <MonthlyIncomeExpenseChart monthly={report?.monthly ?? []} />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Rashodi po kategoriji</CardTitle>
                <CardDescription>Gorivo, delovi, pregledi i ostalo u izabranom periodu.</CardDescription>
              </CardHeader>
              <CardContent>
                {query.isPending ? (
                  <p className="text-muted-foreground text-sm">Učitavanje…</p>
                ) : (
                  <ExpenseCategoryPie byCategory={report?.byCategory ?? []} />
                )}
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Račun vs. keš</CardTitle>
                <CardDescription>
                  Lokalne vožnje često idu kešom, fakture agencijama preko računa — izveštaj drži ova
                  dva toka odvojeno.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {query.isPending ? (
                  <p className="text-muted-foreground text-sm">Učitavanje…</p>
                ) : (
                  <PaymentMethodBreakdown byPaymentMethod={report?.byPaymentMethod ?? []} />
                )}
              </CardContent>
            </Card>
          </div>

          <UnsettledAdvancesCard onSettle={onSettleAdvance} />

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Profit po vozilu</CardTitle>
              <CardDescription>Sortirajte kolone. Red bez vozila skuplja knjiženja koja nisu vezana.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              {query.isPending ? (
                <p className="text-muted-foreground px-6 text-sm">Učitavanje…</p>
              ) : (
                <ProfitTable
                  labelHeader="Vozilo"
                  emptyIcon={Truck}
                  emptyTitle="Nema knjiženja po vozilu"
                  emptyDescription="Povežite transakcije sa vozilom da biste videli profitabilnost flote."
                  rows={(report?.byVehicle ?? []).map((item) => ({
                    id: item.vehicle?.id ?? 'none',
                    label: item.vehicle ? vehicleLabel(item.vehicle) : 'Bez vozila',
                    income: item.income,
                    expense: item.expense,
                    profit: item.profit,
                    count: item.count,
                  }))}
                />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Profit po partneru</CardTitle>
                <CardDescription>Naručilac / agencija sa ručnog unosa prihoda.</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                {query.isPending ? (
                  <p className="text-muted-foreground px-6 text-sm">Učitavanje…</p>
                ) : (
                  <ProfitTable
                    labelHeader="Partner"
                    emptyIcon={Building2}
                    emptyTitle="Nema partnera"
                    emptyDescription="Unesite partnera na prihodu da biste poredili profitabilnost."
                    rows={(report?.byPartner ?? []).map((item) => ({
                      id: item.partner,
                      label: item.partner,
                      income: item.income,
                      expense: item.expense,
                      profit: item.profit,
                      count: item.count,
                    }))}
                  />
                )}
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Profit po relaciji</CardTitle>
                <CardDescription>Ruta ili lokalni prevoz, ako je uneta na transakciji.</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                {query.isPending ? (
                  <p className="text-muted-foreground px-6 text-sm">Učitavanje…</p>
                ) : (
                  <ProfitTable
                    labelHeader="Relacija"
                    emptyIcon={MapPin}
                    emptyTitle="Nema relacija"
                    emptyDescription="Unesite relaciju na transakciji da biste videli profit po ruti."
                    rows={(report?.byRoute ?? []).map((item) => ({
                      id: item.route,
                      label: item.route,
                      income: item.income,
                      expense: item.expense,
                      profit: item.profit,
                      count: item.count,
                    }))}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: number | undefined;
  loading: boolean;
  emphasize?: boolean;
}

function SummaryCard({ title, value, loading, emphasize }: SummaryCardProps) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle
          className={cn(
            'text-2xl',
            emphasize && value != null && value < 0 && 'text-rose-700 dark:text-rose-300',
            emphasize && value != null && value >= 0 && 'text-emerald-700 dark:text-emerald-300',
          )}
        >
          {loading ? '…' : formatMoney(value)}
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
