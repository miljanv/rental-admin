'use client';

import {
  DRIVER_DOCUMENT_TYPE_LABELS,
  type DriverDocumentStatusItem,
  type DriverMonthlyActivityDto,
} from '@rental-admin/shared';
import { Clock, FileWarning, Gauge } from 'lucide-react';

import { ErrorState } from '@/components/common/error-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DocumentExpiryBadge } from '@/features/driver-documents/components/document-expiry-badge';
import { localTodayIso } from '@/features/driver-documents/lib/document';
import { useDriverStatusOverview } from '@/features/drivers/hooks/use-driver-status-overview';
import { formatDate, formatKilometers, formatMonthYear } from '@/lib/format';

interface DriverStatusOverviewProps {
  driverId: string;
}

function ActivityCard({
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

function DocumentStatusCard({
  item,
  todayIso,
}: {
  item: DriverDocumentStatusItem;
  todayIso: string;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">{DRIVER_DOCUMENT_TYPE_LABELS[item.type]}</CardTitle>
        {item.document ? (
          <CardDescription>Br. {item.document.documentNumber}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent>
        {item.document ? (
          <div className="space-y-1.5">
            <DocumentExpiryBadge expiresAt={item.document.expiresAt} todayIso={todayIso} />
            <p className="text-muted-foreground text-xs">
              Izdato {formatDate(item.document.issuedAt)}
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">Nije unešen.</p>
        )}
      </CardContent>
    </Card>
  );
}

function activityHint(activity: DriverMonthlyActivityDto | undefined): string {
  if (!activity) {
    return 'Tekući mesec';
  }

  const monthLabel = formatMonthYear(activity.year, activity.month);

  if (activity.fuelLogCount === 0) {
    return `${monthLabel} — nema točenja sa ovim vozačem`;
  }

  return `${monthLabel} · ${activity.fuelLogCount} točenja`;
}

export function DriverStatusOverview({ driverId }: DriverStatusOverviewProps) {
  const query = useDriverStatusOverview(driverId);
  const todayIso = localTodayIso();
  const activity = query.data?.monthlyActivity;
  const documents = query.data?.documents ?? [];

  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title="Pregled statusa nije učitan"
        retryLabel="Pokušaj ponovo"
        retryingLabel="Učitavanje…"
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <ActivityCard
          label="Kilometri ovog meseca"
          value={formatKilometers(activity?.kmDriven ?? 0)}
          hint={activityHint(activity)}
          icon={Gauge}
          isLoading={query.isPending}
        />
        <ActivityCard
          label="Sati ovog meseca"
          value="—"
          hint="Evidencija sati još nije povezana (tahograf / smene)"
          icon={Clock}
          isLoading={query.isPending}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <FileWarning className="text-muted-foreground size-4" aria-hidden />
          <h2 className="text-sm font-medium">Rokovi dokumenata</h2>
        </div>
        {query.isPending ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-28 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((item) => (
              <DocumentStatusCard key={item.type} item={item} todayIso={todayIso} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
