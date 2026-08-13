'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { NAV_ITEMS, isActiveRoute } from '@/components/layout/nav-items';
import { cn } from '@/lib/utils';

interface SidebarNavProps {
  onNavigate?: () => void;
}

export function SidebarNav({ onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-1 px-3">
      {NAV_ITEMS.map((item) => {
        const isActive = isActiveRoute(pathname, item.href);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              'focus-visible:ring-ring/50 outline-none focus-visible:ring-2',
              isActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
            )}
          >
            <Icon
              className={cn(
                'size-4 shrink-0 transition-colors',
                isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground',
              )}
              aria-hidden
            />
            <span className="truncate">{item.title}</span>
            {isActive ? <span className="bg-foreground ml-auto size-1.5 rounded-full" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}
