'use client';

import { Building2, CalendarDays, CircleDollarSign, IdCard, Truck } from 'lucide-react';

import { ErrorState } from '@/components/common/error-state';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardExpiryCard } from '@/features/dashboard/components/dashboard-expiry-card';
import { DashboardFinanceCard } from '@/features/dashboard/components/dashboard-finance-card';
import { DashboardFuelCard } from '@/features/dashboard/components/dashboard-fuel-card';
import { DashboardTodayTrips } from '@/features/dashboard/components/dashboard-today-trips';
import { useDashboardStats } from '@/features/dashboard/hooks/use-dashboard-stats';
import { formatDate } from '@/lib/format';

function DashboardSectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-muted-foreground shrink-0 text-xs font-semibold tracking-[0.16em] uppercase">
        {children}
      </h2>
      <span className="bg-border h-px flex-1" aria-hidden />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-3" aria-label="Učitavanje dashboarda">
      {Array.from({ length: 3 }).map((_, row) => (
        <div key={row} className="grid gap-3 lg:grid-cols-2">
          <Card className="h-60 p-4 shadow-sm">
            <Skeleton className="h-full w-full" />
          </Card>
          <Card className="h-60 p-4 shadow-sm">
            <Skeleton className="h-full w-full" />
          </Card>
        </div>
      ))}
    </div>
  );
}

export function DashboardOverview() {
  const query = useDashboardStats();

  return (
    <>
      <div className="mb-4 flex flex-col justify-between gap-2 border-b pb-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
            Dashboard
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Najvažniji podaci poslovanja na jednom mestu.
          </p>
        </div>
        {query.data ? (
          <div className="text-muted-foreground flex w-fit items-center gap-2 rounded-full bg-card px-3 py-1.5 text-xs shadow-sm ring-1 ring-foreground/10">
            <CalendarDays className="text-accent size-3.5" aria-hidden />
            Danas, {formatDate(query.data.today)}
          </div>
        ) : null}
      </div>
      {query.isPending ? <DashboardSkeleton /> : null}
      {query.isError ? (
        <Card className="shadow-sm">
          <ErrorState
            error={query.error}
            title="Dashboard nije učitan"
            retryLabel="Pokušaj ponovo"
            retryingLabel="Učitavanje…"
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
          />
        </Card>
      ) : null}
      {query.data ? (
        <div className="space-y-3">
          <DashboardSectionTitle>Finansije</DashboardSectionTitle>
          <div className="grid gap-3 lg:grid-cols-2">
            <DashboardFinanceCard
              title="Ukupno za naplatu"
              description="Fakturisano kupcima, a još nije naplaćeno. Kliknite na naslov za sve stavke."
              modalDescription="Sve fakture kupaca koje čekaju naplatu."
              data={query.data.receivables}
              icon={CircleDollarSign}
              tone="income"
            />
            <DashboardFinanceCard
              title="Dugovanja prema dobavljačima"
              description="Računi koje firma još treba da plati. Kliknite na naslov za sve stavke."
              modalDescription="Svi računi dobavljača koji čekaju plaćanje."
              data={query.data.payables}
              icon={Building2}
              tone="expense"
            />
          </div>

          <DashboardSectionTitle>Rokovi i dokumentacija</DashboardSectionTitle>
          <div className="grid gap-3 lg:grid-cols-2">
            <DashboardExpiryCard
              title="Istekle aktivnosti vozača"
              description="Pet poslednjih isteka ličnih dokumenata i potvrda."
              data={query.data.expiredDriverActivities}
              icon={IdCard}
            />
            <DashboardExpiryCard
              title="Istekle aktivnosti vozila"
              description="Pet poslednjih isteka pregleda, registracije i tahografa."
              data={query.data.expiredVehicleActivities}
              icon={Truck}
            />
          </div>

          <DashboardSectionTitle>Potrošnja vozila</DashboardSectionTitle>
          <div className="grid gap-3 lg:grid-cols-2">
            <DashboardFuelCard mode="lowest" {...query.data.fuelConsumption} />
            <DashboardFuelCard mode="highest" {...query.data.fuelConsumption} />
          </div>

          <DashboardSectionTitle>Današnji raspored</DashboardSectionTitle>
          <DashboardTodayTrips date={query.data.today} data={query.data.todayTrips} />
        </div>
      ) : null}
    </>
  );
}
