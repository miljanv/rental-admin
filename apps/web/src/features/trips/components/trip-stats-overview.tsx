'use client';

import { defaultTripStatsRange } from '@rental-admin/shared';
import { Building2, MapPin, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DateField } from '@/components/common/date-field';
import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { TripMonthlyChart } from '@/features/trips/components/trip-monthly-chart';
import { TripPaymentBreakdown } from '@/features/trips/components/trip-payment-breakdown';
import { TripRankedList } from '@/features/trips/components/trip-ranked-list';
import { TripStatusBreakdown } from '@/features/trips/components/trip-status-breakdown';
import { useTripStats } from '@/features/trips/hooks/use-trip-stats';
import { formatKilometers, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

export function TripStatsOverview() {
  const defaults = useMemo(() => defaultTripStatsRange(), []);
  const [from, setFrom] = useState(defaults.from);
  const [to, setTo] = useState(defaults.to);
  const query = useTripStats({ from, to });
  const stats = query.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5 sm:w-40">
          <Label htmlFor="stats-from" className="text-xs">
            Od
          </Label>
          <DateField id="stats-from" value={from} onChange={setFrom} />
        </div>
        <div className="space-y-1.5 sm:w-40">
          <Label htmlFor="stats-to" className="text-xs">
            Do
          </Label>
          <DateField id="stats-to" value={to} onChange={setTo} />
        </div>
        <Button
          variant="outline"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
          aria-label="Osveži statistiku"
        >
          <RefreshCw className={cn('size-4', query.isFetching && 'animate-spin')} aria-hidden />
          Osveži
        </Button>
      </div>

      {query.isError ? (
        <ErrorState
          error={query.error}
          title="Statistika nije učitana"
          retryLabel="Pokušaj ponovo"
          retryingLabel="Učitavanje…"
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard title="Ukupno vožnji" value={stats?.totalTrips} loading={query.isPending} />
            <SummaryCard
              title="Ukupna kilometraža"
              value={stats ? formatKilometers(stats.totalDistanceKm) : undefined}
              loading={query.isPending}
            />
            <SummaryCard
              title="Ukupan prihod"
              value={stats ? formatMoney(stats.totalRevenue) : undefined}
              loading={query.isPending}
            />
          </div>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Vožnje po mesecima</CardTitle>
              <CardDescription>Otkazane vožnje se broje, ali ne ulaze u prihod.</CardDescription>
            </CardHeader>
            <CardContent>
              {query.isPending ? (
                <p className="text-muted-foreground text-sm">Učitavanje grafikona…</p>
              ) : (
                <TripMonthlyChart monthly={stats?.monthly ?? []} />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Po statusu</CardTitle>
              </CardHeader>
              <CardContent>
                {query.isPending ? (
                  <p className="text-muted-foreground text-sm">Učitavanje…</p>
                ) : (
                  <TripStatusBreakdown byStatus={stats?.byStatus ?? []} />
                )}
              </CardContent>
            </Card>

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Račun vs. keš</CardTitle>
              </CardHeader>
              <CardContent>
                {query.isPending ? (
                  <p className="text-muted-foreground text-sm">Učitavanje…</p>
                ) : (
                  <TripPaymentBreakdown byPaymentMethod={stats?.byPaymentMethod ?? []} />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Najčešće relacije</CardTitle>
              </CardHeader>
              {query.isPending ? (
                <CardContent>
                  <p className="text-muted-foreground text-sm">Učitavanje…</p>
                </CardContent>
              ) : (
                <TripRankedList
                  items={(stats?.topRoutes ?? []).map((item) => ({
                    id: item.route,
                    label: item.route,
                    count: item.count,
                  }))}
                  emptyIcon={MapPin}
                  emptyTitle="Nema relacija"
                  emptyDescription="Kreirajte vožnje da biste videli najčešće relacije."
                />
              )}
            </Card>

            <Card className="shadow-none">
              <CardHeader>
                <CardTitle>Najčešći naručioci</CardTitle>
              </CardHeader>
              {query.isPending ? (
                <CardContent>
                  <p className="text-muted-foreground text-sm">Učitavanje…</p>
                </CardContent>
              ) : (
                <TripRankedList
                  items={(stats?.topPartners ?? []).map((item, index) => ({
                    id: item.partnerId ?? `client-${index}`,
                    label: item.label,
                    count: item.count,
                  }))}
                  emptyIcon={Building2}
                  emptyTitle="Nema naručilaca"
                  emptyDescription="Kreirajte vožnje da biste videli najčešće naručioce."
                />
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

interface SummaryCardProps {
  title: string;
  value: number | string | undefined;
  loading: boolean;
}

function SummaryCard({ title, value, loading }: SummaryCardProps) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl">{loading ? '…' : (value ?? '—')}</CardTitle>
      </CardHeader>
    </Card>
  );
}
