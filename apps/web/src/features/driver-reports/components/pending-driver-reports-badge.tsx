'use client';

import { usePendingDriverReportsCount } from '@/features/driver-reports/hooks/use-pending-driver-reports-count';

/** Number of driver reports waiting for the office, for the menu. Hidden at zero. */
export function PendingDriverReportsBadge() {
  const query = usePendingDriverReportsCount();
  const count = query.data?.count ?? 0;

  if (count === 0) {
    return null;
  }

  return (
    <span
      className="ml-auto rounded-full bg-amber-500 px-1.5 py-0.5 text-[11px] leading-none font-semibold text-white tabular-nums"
      aria-label={`${count} unosa na čekanju`}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}
