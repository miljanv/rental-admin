'use client';

import { Bus, ChevronRight, Fuel } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSyncExternalStore } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { PortalFaults } from '@/features/driver-portal/components/portal-faults';
import { PortalFuelEntry } from '@/features/driver-portal/components/portal-fuel-entry';
import { PortalTools } from '@/features/driver-portal/components/portal-tools';
import { PortalTripList } from '@/features/driver-portal/components/portal-trip-list';
import { usePortalMe } from '@/features/driver-portal/hooks/use-portal-me';
import {
  driverInitials,
  portalDateLabel,
  portalGreeting,
} from '@/features/driver-portal/lib/portal';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'raspored', label: 'Raspored' },
  { id: 'kvarovi', label: 'Kvarovi' },
  { id: 'alat', label: 'Zaduženje alata' },
] as const;

type PortalTab = (typeof TABS)[number]['id'] | 'gorivo';

const isPortalTab = (value: string | null): value is PortalTab =>
  value === 'gorivo' || TABS.some((tab) => tab.id === value);

const subscribeToNothing = () => () => {};

/** "Petak, 27. novembar|14": a string, so repeated reads compare equal. */
const readClock = (): string => {
  const now = new Date();

  return `${portalDateLabel(now)}|${now.getHours()}`;
};

interface PortalHomeProps {
  token: string;
}

/** The driver's start screen: greeting, free diesel entry, and the three working tabs. */
export function PortalHome({ token }: PortalHomeProps) {
  const me = usePortalMe(token);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get('tab');
  const tab: PortalTab = isPortalTab(requested) ? requested : 'raspored';
  // The greeting depends on the phone's clock: empty on the server, filled in on the phone.
  const clock = useSyncExternalStore(subscribeToNothing, readClock, () => '');
  const [dateLabel = '', hour = ''] = clock.split('|');

  const selectTab = (next: PortalTab) => {
    router.replace(next === 'raspored' ? pathname : `${pathname}?tab=${next}`, { scroll: false });
  };

  const isFuel = tab === 'gorivo';

  return (
    <div className="pb-8">
      <header className="flex items-center justify-between px-5 pt-5 pb-2">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Bus className="size-6" aria-hidden />
          </span>
          <div className="leading-tight">
            {me.data ? (
              <p className="text-[15px] font-bold">{me.data.organizationName}</p>
            ) : (
              <Skeleton className="h-4 w-28" />
            )}
            <p className="text-muted-foreground text-xs">Portal za vozače</p>
          </div>
        </div>
        {me.data ? (
          <span
            className="bg-card flex size-10 items-center justify-center rounded-full border text-[13px] font-semibold"
            aria-label={`${me.data.driver.firstName} ${me.data.driver.lastName}`}
          >
            {driverInitials(me.data.driver.firstName, me.data.driver.lastName)}
          </span>
        ) : null}
      </header>

      <section className="px-5 pt-2.5 pb-3.5">
        <p className="text-muted-foreground min-h-5 text-sm">{dateLabel}</p>
        {me.data ? (
          <h1 className="mt-1 text-[28px] font-bold tracking-tight">
            {hour ? portalGreeting(Number(hour)) : 'Zdravo'}, {me.data.driver.firstName}
          </h1>
        ) : (
          <Skeleton className="mt-1 h-8 w-56" />
        )}
      </section>

      <div className="px-4 pb-3">
        <button
          type="button"
          onClick={() => selectTab(isFuel ? 'raspored' : 'gorivo')}
          aria-pressed={isFuel}
          className={cn(
            'flex min-h-16 w-full items-center gap-3.5 rounded-2xl border px-4 py-2.5 text-left transition-colors',
            isFuel ? 'border-foreground bg-foreground text-background' : 'bg-card hover:bg-accent',
          )}
        >
          <span
            className={cn(
              'flex size-[42px] shrink-0 items-center justify-center rounded-xl',
              isFuel ? 'bg-background/15' : 'bg-primary/10 text-primary',
            )}
          >
            <Fuel className="size-[22px]" aria-hidden />
          </span>
          <span className="flex-1">
            <span className="block text-base font-bold tracking-wide">SLOBODAN UNOS DIZELA</span>
            <span
              className={cn(
                'mt-0.5 block text-[13px]',
                isFuel ? 'text-background/75' : 'text-muted-foreground',
              )}
            >
              Sipanje bez zadužene vožnje
            </span>
          </span>
          <ChevronRight className="size-[18px]" aria-hidden />
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Delovi portala"
        className="bg-muted mx-4 mb-5 grid grid-cols-3 gap-1 rounded-[14px] p-1 dark:bg-white/5"
      >
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => selectTab(item.id)}
            className={cn(
              'h-11 rounded-[11px] text-sm font-semibold transition-colors',
              tab === item.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <main className="px-4">
        {tab === 'raspored' ? <PortalTripList token={token} /> : null}
        {tab === 'kvarovi' ? <PortalFaults token={token} /> : null}
        {tab === 'alat' ? <PortalTools token={token} /> : null}
        {tab === 'gorivo' ? <PortalFuelEntry token={token} /> : null}
      </main>
    </div>
  );
}
