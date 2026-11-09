'use client';

import { Info, TriangleAlert, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useActiveAnnouncements } from '@/features/announcements/hooks/use-active-announcements';
import { useDismissAnnouncement } from '@/features/announcements/hooks/use-dismiss-announcement';
import { cn } from '@/lib/utils';

/** The superadmin's notices above every page; a user closes each one once, for all devices. */
export function AnnouncementBanners() {
  const query = useActiveAnnouncements();
  const dismiss = useDismissAnnouncement();
  const announcements = query.data ?? [];

  if (announcements.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 space-y-2" aria-label="Obaveštenja">
      {announcements.map((announcement) => {
        const isWarning = announcement.kind === 'WARNING';
        const Icon = isWarning ? TriangleAlert : Info;

        return (
          <div
            key={announcement.id}
            role={isWarning ? 'alert' : 'status'}
            className={cn(
              'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
              isWarning
                ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100'
                : 'border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-100',
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p className="flex-1 break-words whitespace-pre-line">{announcement.message}</p>
            <Button
              variant="ghost"
              size="icon"
              className="-my-1 -mr-2 size-7 shrink-0 hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Zatvori obaveštenje"
              onClick={() => dismiss.mutate(announcement.id)}
            >
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        );
      })}
    </div>
  );
}
