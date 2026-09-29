'use client';

import { defaultFinanceReportRange, type BusinessAnalyticsDto } from '@rental-admin/shared';
import { BarChart3, Building2, RefreshCw, Store, Truck, UserRound } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DateField } from '@/components/common/date-field';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
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
import { useBusinessAnalytics } from '@/features/analytics/hooks/use-business-analytics';
import { formatKilometers, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'company', label: 'Firma', icon: BarChart3 },
  { id: 'vehicles', label: 'Vozila', icon: Truck },
  { id: 'partners', label: 'Kupci', icon: Building2 },
  { id: 'suppliers', label: 'Dobavljači', icon: Store },
  { id: 'drivers', label: 'Vozači', icon: UserRound },
] as const;

type AnalyticsTab = (typeof TABS)[number]['id'];

interface MoneyCellProps {
  value: number;
  highlight?: boolean;
}

function MoneyCell({ value, highlight }: MoneyCellProps) {
  return (
    <TableCell className={cn('text-right tabular-nums', highlight && value < 0 && 'text-rose-700')}>
      {formatMoney(value)}
    </TableCell>
  );
}

function EmptyRows({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-muted-foreground h-24 text-center">
        Nema podataka za izabrani period.
      </TableCell>
    </TableRow>
  );
}

function CompanySummary({ report }: { report: BusinessAnalyticsDto }) {
  const summary = report.summary;
  const cards = [
    {
      label: 'Vožnje',
      value: String(summary.tripCount),
      hint: formatKilometers(summary.tripDistanceKm),
    },
    {
      label: 'Fakturisano',
      value: formatMoney(summary.invoicedRevenue),
      hint: 'Izdate fakture vožnji',
    },
    {
      label: 'Naplaćeno',
      value: formatMoney(summary.collectedRevenue),
      hint: 'Rasknjižene uplate',
    },
    {
      label: 'Otvorena potraživanja',
      value: formatMoney(summary.openReceivables),
      hint: 'Fakture minus naplate',
    },
    {
      label: 'Dug dobavljačima',
      value: formatMoney(summary.openPayables),
      hint: 'Računi minus plaćanja',
    },
    {
      label: 'Troškovi ukupno',
      value: formatMoney(summary.totalExpense),
      hint: 'Gorivo, troškovi, ture, vozači',
    },
    {
      label: 'Profit po fakturi',
      value: formatMoney(summary.invoicedProfit),
      hint: 'Fakturisano minus trošak',
    },
    {
      label: 'Profit po naplati',
      value: formatMoney(summary.collectedProfit),
      hint: 'Naplaćeno minus trošak',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>{card.label}</CardDescription>
            <CardTitle className="text-2xl">{card.value}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">{card.hint}</CardContent>
        </Card>
      ))}
    </div>
  );
}

function VehiclesTable({ report }: { report: BusinessAnalyticsDto }) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Vozila</CardTitle>
        <CardDescription>Km, fakturisano, naplaćeno i troškovi po vozilu.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vozilo</TableHead>
              <TableHead className="text-right">Km</TableHead>
              <TableHead className="text-right">Fakturisano</TableHead>
              <TableHead className="text-right">Naplaćeno</TableHead>
              <TableHead className="text-right">Gorivo</TableHead>
              <TableHead className="text-right">Održavanje/trošak</TableHead>
              <TableHead className="text-right">Vozači</TableHead>
              <TableHead className="text-right">Profit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.vehicles.length === 0 ? (
              <EmptyRows colSpan={8} />
            ) : (
              report.vehicles.map((row) => (
                <TableRow key={row.vehicleId}>
                  <TableCell className="font-medium">{row.vehicleLabel}</TableCell>
                  <TableCell className="text-right">{formatKilometers(row.distanceKm)}</TableCell>
                  <MoneyCell value={row.invoicedRevenue} />
                  <MoneyCell value={row.collectedRevenue} />
                  <MoneyCell value={row.fuelExpense} />
                  <MoneyCell value={row.maintenanceExpense + row.tripExpense} />
                  <MoneyCell value={row.driverPayouts} />
                  <MoneyCell value={row.invoicedProfit} highlight />
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PartnersTable({ report }: { report: BusinessAnalyticsDto }) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Kupci</CardTitle>
        <CardDescription>Fakturisano, naplaćeno i otvoreno po kupcu.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kupac</TableHead>
              <TableHead className="text-right">Vožnje</TableHead>
              <TableHead className="text-right">Fakturisano</TableHead>
              <TableHead className="text-right">Naplaćeno</TableHead>
              <TableHead className="text-right">Otvoreno</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.partners.length === 0 ? (
              <EmptyRows colSpan={5} />
            ) : (
              report.partners.map((row) => (
                <TableRow key={row.partnerKey}>
                  <TableCell className="font-medium">{row.partnerLabel}</TableCell>
                  <TableCell className="text-right">{row.tripCount}</TableCell>
                  <MoneyCell value={row.invoicedRevenue} />
                  <MoneyCell value={row.collectedRevenue} />
                  <MoneyCell value={row.openReceivables} />
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function SuppliersTable({ report }: { report: BusinessAnalyticsDto }) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Dobavljači</CardTitle>
        <CardDescription>Zaduženja, plaćanja i operativni troškovi po dobavljaču.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dobavljač</TableHead>
              <TableHead className="text-right">Računi</TableHead>
              <TableHead className="text-right">Plaćeno</TableHead>
              <TableHead className="text-right">Otvoreno</TableHead>
              <TableHead className="text-right">Gorivo</TableHead>
              <TableHead className="text-right">Održavanje</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.suppliers.length === 0 ? (
              <EmptyRows colSpan={6} />
            ) : (
              report.suppliers.map((row) => (
                <TableRow key={row.supplierKey}>
                  <TableCell className="font-medium">{row.supplierLabel}</TableCell>
                  <MoneyCell value={row.invoiceTotal} />
                  <MoneyCell value={row.paidTotal} />
                  <MoneyCell value={row.openTotal} />
                  <MoneyCell value={row.fuelExpense} />
                  <MoneyCell value={row.maintenanceExpense} />
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DriversTable({ report }: { report: BusinessAnalyticsDto }) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Vozači</CardTitle>
        <CardDescription>Kilometraža, dnevnice i akontacije po vozaču.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vozač</TableHead>
              <TableHead className="text-right">Vožnje</TableHead>
              <TableHead className="text-right">Km</TableHead>
              <TableHead className="text-right">Dnevnice</TableHead>
              <TableHead className="text-right">Akontacije</TableHead>
              <TableHead className="text-right">Ukupno</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.drivers.length === 0 ? (
              <EmptyRows colSpan={6} />
            ) : (
              report.drivers.map((row) => (
                <TableRow key={row.driverId}>
                  <TableCell className="font-medium">{row.driverName}</TableCell>
                  <TableCell className="text-right">{row.tripCount}</TableCell>
                  <TableCell className="text-right">{formatKilometers(row.distanceKm)}</TableCell>
                  <MoneyCell value={row.perDiemAmount} />
                  <MoneyCell value={row.advanceAmount} />
                  <MoneyCell value={row.totalPayout} />
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function BusinessAnalytics() {
  const defaults = useMemo(() => defaultFinanceReportRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('company');
  const query = useBusinessAnalytics({ from, to });
  const report = query.data;

  return (
    <>
      <PageHeader
        title="Analitika"
        description="Objedinjen pregled vožnji, vozila, kupaca, dobavljača, troškova i naplate."
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5 sm:w-40">
          <Label htmlFor="analytics-from" className="text-xs">
            Od
          </Label>
          <DateField id="analytics-from" value={from} onChange={setFrom} />
        </div>
        <div className="space-y-1.5 sm:w-40">
          <Label htmlFor="analytics-to" className="text-xs">
            Do
          </Label>
          <DateField id="analytics-to" value={to} onChange={setTo} />
        </div>
        <Button variant="outline" onClick={() => void query.refetch()} disabled={query.isFetching}>
          <RefreshCw className={cn('size-4', query.isFetching && 'animate-spin')} aria-hidden />
          Osveži
        </Button>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto border-b">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex shrink-0 items-center gap-2 border-b-2 px-3 py-2 text-sm transition-colors',
              activeTab === tab.id
                ? 'border-primary text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            <tab.icon className="size-4" aria-hidden />
            {tab.label}
          </button>
        ))}
      </div>

      {query.isError ? (
        <ErrorState
          error={query.error}
          title="Analitika nije učitana"
          retryLabel="Pokušaj ponovo"
          retryingLabel="Učitavanje…"
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : query.isPending || !report ? (
        <Card className="shadow-none">
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            Učitavanje analitike…
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {activeTab === 'company' ? <CompanySummary report={report} /> : null}
          {activeTab === 'vehicles' ? <VehiclesTable report={report} /> : null}
          {activeTab === 'partners' ? <PartnersTable report={report} /> : null}
          {activeTab === 'suppliers' ? <SuppliersTable report={report} /> : null}
          {activeTab === 'drivers' ? <DriversTable report={report} /> : null}
        </div>
      )}
    </>
  );
}
