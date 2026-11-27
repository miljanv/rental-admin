'use client';

import { usePendingDriverReportsCount } from '@/features/driver-reports/hooks/use-pending-driver-reports-count';
import { useWorkplacePending } from '@/features/driver-workplace/hooks/use-driver-workplace';

/** Everything from drivers waiting for the office (reports, faults, fuel, tools). Hidden at zero. */
export function PendingDriverReportsBadge() {
  const query = usePendingDriverReportsCount();
  const workplace = useWorkplacePending();
  const count =
    (query.data?.count ?? 0) +
    (workplace.data?.faults ?? 0) +
    (workplace.data?.fuelEntries ?? 0) +
    (workplace.data?.tools ?? 0);

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
