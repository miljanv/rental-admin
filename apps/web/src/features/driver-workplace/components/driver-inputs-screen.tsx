'use client';

import { useState } from 'react';

import { PageHeader } from '@/components/common/page-header';
import { DriverReportsManager } from '@/features/driver-reports/components/driver-reports-manager';
import { usePendingDriverReportsCount } from '@/features/driver-reports/hooks/use-pending-driver-reports-count';
import { DriverFuelEntriesPanel } from '@/features/driver-workplace/components/driver-fuel-entries-panel';
import { ToolsNeedingOfficePanel } from '@/features/driver-workplace/components/tools-needing-office-panel';
import { VehicleFaultsPanel } from '@/features/driver-workplace/components/vehicle-faults-panel';
import { useWorkplacePending } from '@/features/driver-workplace/hooks/use-driver-workplace';
import { cn } from '@/lib/utils';

type InputsTab = 'trips' | 'faults' | 'fuel' | 'tools';

/** Everything drivers send from the portal, one tab per kind, each with what still waits. */
export function DriverInputsScreen() {
  const [tab, setTab] = useState<InputsTab>('trips');
  const reports = usePendingDriverReportsCount();
  const pending = useWorkplacePending();
  const tabs: Array<{ id: InputsTab; label: string; count: number }> = [
    { id: 'trips', label: 'Vožnje', count: reports.data?.count ?? 0 },
    { id: 'faults', label: 'Kvarovi', count: pending.data?.faults ?? 0 },
    { id: 'fuel', label: 'Slobodan unos dizela', count: pending.data?.fuelEntries ?? 0 },
    { id: 'tools', label: 'Alat', count: pending.data?.tools ?? 0 },
  ];

  return (
    <>
      <PageHeader
        title="Unosi vozača"
        description="Šta su vozači poslali sa telefona: vožnje, kvarovi, sipanje van vožnje i alat. Troškovi ulaze u finansije tek kada ih prihvatite."
      />

      <div role="tablist" className="mb-6 flex gap-1 overflow-x-auto border-b">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors',
              tab === item.id
                ? 'border-primary text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {item.label}
            {item.count > 0 ? (
              <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[11px] leading-none font-semibold text-white tabular-nums">
                {item.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'trips' ? <DriverReportsManager /> : null}
      {tab === 'faults' ? <VehicleFaultsPanel /> : null}
      {tab === 'fuel' ? <DriverFuelEntriesPanel /> : null}
      {tab === 'tools' ? <ToolsNeedingOfficePanel /> : null}
    </>
  );
}
