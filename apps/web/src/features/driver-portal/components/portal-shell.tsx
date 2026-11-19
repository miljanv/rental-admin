'use client';

import { CircleAlert } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { usePortalMe } from '@/features/driver-portal/hooks/use-portal-me';
import { isDriverLinkInvalid } from '@/features/driver-portal/lib/portal';
import { getApiErrorMessage } from '@/lib/api-error';

interface PortalShellProps {
  token: string;
  children: React.ReactNode;
}

export function PortalMessage({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border px-4 py-10 text-center">
      <CircleAlert className="text-muted-foreground size-8" aria-hidden />
      <p className="text-lg font-semibold">{title}</p>
      <p className="text-muted-foreground text-sm">{description}</p>
    </div>
  );
}

/** Phone-sized frame for the driver portal: greeting on top, no office navigation. */
export function PortalShell({ token, children }: PortalShellProps) {
  const me = usePortalMe(token);

  return (
    <div className="bg-background min-h-svh">
      <div className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-5">
        <header className="space-y-0.5">
          {me.isPending ? (
            <>
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-28" />
            </>
          ) : me.data ? (
            <>
              <h1 className="text-xl font-semibold">Zdravo, {me.data.driver.firstName}</h1>
              <p className="text-muted-foreground text-sm">{me.data.organizationName}</p>
            </>
          ) : null}
        </header>

        {me.isError ? (
          isDriverLinkInvalid(me.error) ? (
            <PortalMessage
              title="Link više ne važi"
              description="Javite se kancelariji da vam pošalju novi link."
            />
          ) : (
            <PortalMessage
              title="Stranica nije učitana"
              description={getApiErrorMessage(me.error)}
            />
          )
        ) : (
          children
        )}
      </div>
    </div>
  );
}
