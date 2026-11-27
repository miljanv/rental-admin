'use client';

import { CircleAlert } from 'lucide-react';

import { usePortalMe } from '@/features/driver-portal/hooks/use-portal-me';
import { isDriverLinkInvalid } from '@/features/driver-portal/lib/portal';
import { getApiErrorMessage } from '@/lib/api-error';

interface PortalShellProps {
  token: string;
  children: React.ReactNode;
}

export function PortalMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-card flex flex-col items-center gap-3 rounded-2xl border px-4 py-10 text-center">
      <CircleAlert className="text-muted-foreground size-8" aria-hidden />
      <p className="text-lg font-semibold">{title}</p>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}

/**
 * Phone-sized frame for the driver portal, without office navigation. Each screen draws its own
 * header; the frame only stops everything when the link is no longer valid.
 */
export function PortalShell({ token, children }: PortalShellProps) {
  const me = usePortalMe(token);

  return (
    <div className="bg-muted/60 dark:bg-background min-h-svh">
      <div className="mx-auto w-full max-w-md">
        {me.isError ? (
          <div className="px-4 py-8">
            {isDriverLinkInvalid(me.error) ? (
              <PortalMessage
                title="Link više ne važi"
                description="Javite se kancelariji da vam pošalju novi link."
              />
            ) : (
              <PortalMessage
                title="Stranica nije učitana"
                description={getApiErrorMessage(me.error)}
              />
            )}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
