'use client';

import { Bus, LogOut } from 'lucide-react';
import Link from 'next/link';

import { FOOTER_NAV_ITEMS, MAIN_NAV_ITEMS } from '@/components/layout/nav-items';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { APP_NAME } from '@/lib/env';
import { useAuth } from '@/providers/auth-provider';

interface SidebarContentProps {
  onNavigate?: () => void;
}

/** Shared body of the desktop sidebar and the mobile drawer. */
export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const { logout } = useAuth();

  return (
    <div className="text-sidebar-foreground flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 px-5">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 outline-none focus-visible:underline"
        >
          <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
            <Bus className="size-4.5" aria-hidden />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
            <span className="text-sidebar-foreground/55 text-xs">Admin panel</span>
          </span>
        </Link>
      </div>

      <Separator className="bg-sidebar-border" />

      <div className="flex-1 overflow-y-auto py-4">
        <p className="text-sidebar-foreground/45 mb-2 px-6 text-xs font-medium tracking-wider uppercase">
          Navigacija
        </p>
        <SidebarNav items={MAIN_NAV_ITEMS} onNavigate={onNavigate} />
      </div>

      <div className="px-0 pb-4">
        <SidebarNav
          items={FOOTER_NAV_ITEMS}
          onNavigate={onNavigate}
          aria-label="Alarm centar i podešavanja"
        />
        <Separator className="bg-sidebar-border my-2" />
        <div className="px-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full justify-start"
            onClick={() => {
              onNavigate?.();
              logout();
            }}
          >
            <LogOut className="size-4" aria-hidden />
            Odjava
          </Button>
        </div>
      </div>
    </div>
  );
}
