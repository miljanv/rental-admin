'use client';

import {
  DOMESTIC_PER_DIEM_RATE_RSD,
  FOREIGN_PER_DIEM_RATE_EUR,
  utcMonthRangeIso,
  type DriverTripPerDiemDto,
} from '@rental-admin/shared';
import { Banknote, Gauge, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';

import { DateField } from '@/components/common/date-field';
import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { DriverPerDiemDocumentsSheet } from '@/features/driver-work/components/driver-per-diem-documents-sheet';
import { DriverPerDiemTable } from '@/features/driver-work/components/driver-per-diem-table';
import { useDriverPerDiems } from '@/features/driver-work/hooks/use-driver-per-diems';
import { useGenerateMonthlyPayout } from '@/features/driver-work/hooks/use-generate-driver-per-diem-document';
import { formatDate, formatKilometers, formatMoney } from '@/lib/format';

interface DriverWorkTabProps {
  driverId: string;
}

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  isLoading,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Gauge;
  isLoading: boolean;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="truncate text-3xl font-semibold tracking-tight">{value}</p>
          )}
          <p className="text-muted-foreground text-xs">{hint}</p>
        </div>
        <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-4.5" aria-hidden />
        </span>
      </CardContent>
    </Card>
  );
}

export function DriverWorkTab({ driverId }: DriverWorkTabProps) {
  const defaultRange = useMemo(() => utcMonthRangeIso(), []);
  const [from, setFrom] = useState(defaultRange.from);
  const [to, setTo] = useState(defaultRange.to);
  const [targetTrip, setTargetTrip] = useState<DriverTripPerDiemDto | null>(null);
  const query = useDriverPerDiems(driverId, { from, to });
  const monthlyPayout = useGenerateMonthlyPayout(driverId);
  const totals = query.data?.totals;
  const periodHint = `${formatDate(from)} – ${formatDate(to)}`;
  const year = Number(from.slice(0, 4));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <Label htmlFor="per-diem-from" className="text-xs">
              Od
            </Label>
            <DateField id="per-diem-from" value={from} onChange={setFrom} className="w-full sm:w-40" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="per-diem-to" className="text-xs">
              Do
            </Label>
            <DateField id="per-diem-to" value={to} onChange={setTo} className="w-full sm:w-40" />
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          disabled={monthlyPayout.isPending}
          onClick={() => void monthlyPayout.mutateAsync(year)}
        >
          {monthlyPayout.isPending
            ? 'Generisanje…'
            : `Isplata dnevnica ${year}. (Excel)`}
        </Button>
      </div>

      {query.isError ? (
        <ErrorState
          error={query.error}
          title="Evidencija dnevnica nije učitana"
          retryLabel="Pokušaj ponovo"
          retryingLabel="Učitavanje…"
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <SummaryCard
              label="Kilometri"
              value={formatKilometers(totals?.distanceKm ?? 0)}
              hint={`${periodHint} · ${totals?.tripCount ?? 0} vožnji`}
              icon={Gauge}
              isLoading={query.isPending}
            />
            <SummaryCard
              label="Dnevnice (uneseno)"
              value={formatMoney(totals?.perDiemAmount ?? 0)}
              hint="Iznos sa obračuna vožnji"
              icon={Banknote}
              isLoading={query.isPending}
            />
            <SummaryCard
              label="Akontacije"
              value={formatMoney(totals?.advanceAmount ?? 0)}
              hint="Unapred dato, razdužuje se troškovima ture"
              icon={Wallet}
              isLoading={query.isPending}
            />
          </div>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Neoporezivi deo dnevnice</CardTitle>
              <CardDescription>
                Po zakonu: {formatMoney(DOMESTIC_PER_DIEM_RATE_RSD)} za put u zemlji i{' '}
                {FOREIGN_PER_DIEM_RATE_EUR} EUR za put u inostranstvo. Iznosi se ne konvertuju.
                Obračun po satima: 0–6h = 0, 6–12h = 0,5, 12–24h = 1 dnevnica (posebno za zemlju i
                inostranstvo).
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Vožnje i dnevnice</CardTitle>
              <CardDescription>
                Podaci sa obračuna vožnji: vozač, km, plata (dnevnica), akontacija i troškovi ture.
                Generišite odluku, nalog i obračun pre isplate.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <DriverPerDiemTable
                trips={query.data?.trips ?? []}
                isLoading={query.isPending}
                onGenerate={setTargetTrip}
              />
            </CardContent>
          </Card>
        </>
      )}

      <DriverPerDiemDocumentsSheet
        driverId={driverId}
        trip={targetTrip}
        onOpenChange={(open) => {
          if (!open) {
            setTargetTrip(null);
          }
        }}
      />
    </div>
  );
}
