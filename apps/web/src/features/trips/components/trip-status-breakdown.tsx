'use client';

import { TRIP_STATUS_LABELS, type TripStatusCount } from '@rental-admin/shared';

interface TripStatusBreakdownProps {
  byStatus: TripStatusCount[];
}

const STATUS_BG: Record<TripStatusCount['status'], string> = {
  PLANNED: 'bg-blue-500',
  IN_PROGRESS: 'bg-amber-500',
  COMPLETED: 'bg-emerald-500',
  CANCELLED: 'bg-red-500',
  FREE: 'bg-zinc-400',
};

export function TripStatusBreakdown({ byStatus }: TripStatusBreakdownProps) {
  const total = byStatus.reduce((sum, item) => sum + item.count, 0);

  if (total === 0) {
    return <p className="text-muted-foreground text-sm">Nema vožnji u izabranom periodu.</p>;
  }

  return (
    <div className="space-y-3">
      {byStatus
        .slice()
        .sort((a, b) => b.count - a.count)
        .map((item) => {
          const percentage = total > 0 ? (item.count / total) * 100 : 0;

          return (
            <div key={item.status} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-full ${STATUS_BG[item.status]}`} />
                  {TRIP_STATUS_LABELS[item.status]}
                </span>
                <span className="text-muted-foreground">{item.count}</span>
              </div>
              <div className="bg-muted h-2 overflow-hidden rounded-full">
                <div className={`h-full ${STATUS_BG[item.status]}`} style={{ width: `${percentage}%` }} />
              </div>
            </div>
          );
        })}
    </div>
  );
}
