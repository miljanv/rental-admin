'use client';

import { CalendarDays, Plus, Repeat } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { TripCalendar } from '@/features/trips/components/trip-calendar';
import { TripStatsOverview } from '@/features/trips/components/trip-stats-overview';
import { TripsList } from '@/features/trips/components/trips-list';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'table', label: 'Tabela' },
  { id: 'calendar', label: 'Kalendar' },
  { id: 'stats', label: 'Statistika' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function TripsManager() {
  const [activeTab, setActiveTab] = useState<TabId>('table');

  return (
    <>
      <PageHeader
        title="Vožnje"
        description="Pojedinačne i ponavljajuće vožnje, sa pregledom po kalendaru i statistikom."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/trips/series/new">
                <Repeat className="size-4" aria-hidden />
                Nova serija
              </Link>
            </Button>
            <Button asChild>
              <Link href="/trips/new">
                <Plus className="size-4" aria-hidden />
                Nova vožnja
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mb-6 flex gap-1 overflow-x-auto border-b">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'shrink-0 border-b-2 px-3 py-2 text-sm transition-colors',
              activeTab === tab.id
                ? 'border-primary text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'table' ? <TripsList /> : null}
      {activeTab === 'calendar' ? (
        <div className="space-y-2">
          <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <CalendarDays className="size-4" aria-hidden />
            Kliknite na vožnju za detalje.
          </p>
          <TripCalendar />
        </div>
      ) : null}
      {activeTab === 'stats' ? <TripStatsOverview /> : null}
    </>
  );
}
