'use client';

import { utcMonthRangeIso } from '@rental-admin/shared';
import { Clock, Gauge } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AetrStatusCard } from '@/features/driver-work/components/aetr-status-card';
import { DriverWorkTable } from '@/features/driver-work/components/driver-work-table';
import { useDriverWorkRecords } from '@/features/driver-work/hooks/use-driver-work-records';
import { formatDate, formatKilometers } from '@/lib/format';

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
  const query = useDriverWorkRecords(driverId, { from, to });
  const summary = query.data?.summary;
  const drives = query.data?.drives ?? [];
  const periodHint = `${formatDate(from)} – ${formatDate(to)}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="work-from" className="text-xs">
            Od
          </Label>
          <Input
            id="work-from"
            type="date"
            value={from}
            max={to}
            onChange={(event) => setFrom(event.target.value)}
            className="w-full sm:w-40"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="work-to" className="text-xs">
            Do
          </Label>
          <Input
            id="work-to"
            type="date"
            value={to}
            min={from}
            onChange={(event) => setTo(event.target.value)}
            className="w-full sm:w-40"
          />
        </div>
      </div>

      {query.isError ? (
        <ErrorState
          error={query.error}
          title="Evidencija rada nije učitana"
          retryLabel="Pokušaj ponovo"
          retryingLabel="Učitavanje…"
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <SummaryCard
              label="Odrađeni kilometri"
              value={formatKilometers(summary?.kmDriven ?? 0)}
              hint={`${periodHint} · ${summary?.driveCount ?? 0} vožnji`}
              icon={Gauge}
              isLoading={query.isPending}
            />
            <SummaryCard
              label="Sati vožnje"
              value="—"
              hint="Osnova za zaradu kada se poveže tahograf"
              icon={Clock}
              isLoading={query.isPending}
            />
          </div>

          {query.data ? <AetrStatusCard aetr={query.data.aetr} /> : <Skeleton className="h-32 w-full" />}

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Prethodne vožnje</CardTitle>
              <CardDescription>
                Segmenti sa točenja dizela na kojjima je ovaj vozač upisan. Ista cifra ide u
                pregled na osnovnim podacima.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <DriverWorkTable drives={drives} isLoading={query.isPending} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
