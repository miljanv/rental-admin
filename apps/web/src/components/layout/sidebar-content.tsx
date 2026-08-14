'use client';

import { Bus, LogOut } from 'lucide-react';
import Link from 'next/link';

import { SidebarNav } from '@/components/layout/sidebar-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { APP_NAME, clientEnv } from '@/lib/env';
import { useAuth } from '@/providers/auth-provider';

const environmentLabel = clientEnv.appEnv.charAt(0).toUpperCase() + clientEnv.appEnv.slice(1);

interface SidebarContentProps {
  onNavigate?: () => void;
}

/** Shared body of the desktop sidebar and the mobile drawer. */
export function SidebarContent({ onNavigate }: SidebarContentProps) {
  const { user, logout } = useAuth();

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
            <span className="text-sidebar-foreground/55 text-xs">Rental Travel</span>
          </span>
        </Link>
      </div>

      <Separator className="bg-sidebar-border" />

      <div className="flex-1 overflow-y-auto py-4">
        <p className="text-sidebar-foreground/45 mb-2 px-6 text-xs font-medium tracking-wider uppercase">
          Overview
        </p>
        <SidebarNav onNavigate={onNavigate} />
      </div>

      <Separator className="bg-sidebar-border" />

      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium">{user?.username ?? APP_NAME}</span>
          <Badge
            variant="secondary"
            className="bg-sidebar-accent text-sidebar-accent-foreground font-mono text-[11px]"
          >
            v{clientEnv.appVersion}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-sky size-1.5 rounded-full bg-[#00a8d8]" aria-hidden />
          <span className="text-sidebar-foreground/55 text-xs">{environmentLabel}</span>
        </div>
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
          Sign out
        </Button>
      </div>
    </div>
  );
}
