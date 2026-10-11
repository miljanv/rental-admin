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
    <div className="flex items-center gap-3 pt-1">
      <h2 className="text-muted-foreground shrink-0 text-xs font-semibold tracking-[0.16em] uppercase">
        {children}
      </h2>
      <span className="bg-border h-px flex-1" aria-hidden />
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-label="Učitavanje dashboarda">
      <Card className="h-80 p-5 shadow-sm">
        <Skeleton className="h-full w-full" />
      </Card>
      {Array.from({ length: 3 }).map((_, row) => (
        <div key={row} className="grid gap-5 lg:grid-cols-2">
          <Card className="h-80 p-5 shadow-sm">
            <Skeleton className="h-full w-full" />
          </Card>
          <Card className="h-80 p-5 shadow-sm">
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
      <div className="relative mb-6 overflow-hidden rounded-2xl bg-[#0c1315] px-5 py-6 text-white shadow-[0_18px_45px_-32px_rgba(12,19,21,0.75)] sm:px-7 sm:py-7">
        <div
          className="absolute -top-20 right-8 size-48 rounded-full bg-cyan-400/15 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute -right-10 -bottom-24 size-44 rounded-full bg-red-500/20 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-cyan-300 uppercase">
              Kontrolni centar
            </p>
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
              Dnevne vožnje, otvorene obaveze, istekli rokovi i potrošnja vozila na jednom mestu.
            </p>
          </div>
          {query.data ? (
            <div className="flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/7 px-4 py-2 text-sm text-white/80 backdrop-blur-sm">
              <CalendarDays className="size-4 text-cyan-300" aria-hidden />
              Danas, {formatDate(query.data.today)}
            </div>
          ) : null}
        </div>
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
        <div className="space-y-5">
          <DashboardSectionTitle>Finansije</DashboardSectionTitle>
          <div className="grid gap-5 lg:grid-cols-2">
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
          <div className="grid gap-5 lg:grid-cols-2">
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
          <div className="grid gap-5 lg:grid-cols-2">
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
