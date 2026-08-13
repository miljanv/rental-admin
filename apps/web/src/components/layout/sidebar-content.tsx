import { HardDrive } from 'lucide-react';
import Link from 'next/link';

import { SidebarNav } from '@/components/layout/sidebar-nav';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { APP_NAME, clientEnv } from '@/lib/env';

const environmentLabel = clientEnv.appEnv.charAt(0).toUpperCase() + clientEnv.appEnv.slice(1);

interface SidebarContentProps {
  onNavigate?: () => void;
}

/** Shared body of the desktop sidebar and the mobile drawer. */
export function SidebarContent({ onNavigate }: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-3 px-5">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-3 outline-none focus-visible:underline"
        >
          <span className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-lg">
            <HardDrive className="size-4.5" aria-hidden />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight">{APP_NAME}</span>
            <span className="text-muted-foreground text-xs">File storage</span>
          </span>
        </Link>
      </div>

      <Separator />

      <div className="flex-1 overflow-y-auto py-4">
        <p className="text-muted-foreground/70 mb-2 px-6 text-xs font-medium tracking-wider uppercase">
          Overview
        </p>
        <SidebarNav onNavigate={onNavigate} />
      </div>

      <Separator />

      <div className="flex flex-col gap-2 px-5 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{APP_NAME}</span>
          <Badge variant="secondary" className="font-mono text-[11px]">
            v{clientEnv.appVersion}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-emerald-500/80 size-1.5 rounded-full" aria-hidden />
          <span className="text-muted-foreground text-xs">{environmentLabel}</span>
        </div>
      </div>
    </div>
  );
}
