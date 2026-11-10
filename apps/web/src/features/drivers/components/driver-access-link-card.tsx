'use client';

import type { DriverDto } from '@rental-admin/shared';
import { Copy, Link2, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';
import { toast } from 'sonner';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreateDriverAccessLink } from '@/features/drivers/hooks/use-create-driver-access-link';
import { useDriverAccessLink } from '@/features/drivers/hooks/use-driver-access-link';
import { useRevokeDriverAccessLink } from '@/features/drivers/hooks/use-revoke-driver-access-link';
import { driverPortalUrl } from '@/features/drivers/lib/driver';
import { formatDateTime } from '@/lib/format';

interface DriverAccessLinkCardProps {
  driver: DriverDto;
}

/** The driver's personal portal link: create, copy, show as QR, revoke. */
export function DriverAccessLinkCard({ driver }: DriverAccessLinkCardProps) {
  const query = useDriverAccessLink(driver.id);
  const createMutation = useCreateDriverAccessLink(driver.id);
  const revokeMutation = useRevokeDriverAccessLink(driver.id);
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const isPending = createMutation.isPending || revokeMutation.isPending;
  const isInactive = driver.status === 'INACTIVE';
  const link = query.data;

  const createLink = async () => {
    if (
      link?.active &&
      !window.confirm('Napraviti novi link? Stari link odmah prestaje da važi.')
    ) {
      return;
    }

    try {
      const created = await createMutation.mutateAsync();
      setCreatedUrl(driverPortalUrl(window.location.origin, created.token));
      setShowQr(false);
    } catch {
      // The mutation reports the failure as a toast.
    }
  };

  const revokeLink = async () => {
    if (!window.confirm('Ukinuti pristup? Vozač više neće moći da otvori link.')) {
      return;
    }

    try {
      await revokeMutation.mutateAsync();
      setCreatedUrl(null);
      setShowQr(false);
    } catch {
      // The mutation reports the failure as a toast.
    }
  };

  const copyLink = async () => {
    if (!createdUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdUrl);
      toast.success('Link je kopiran.');
    } catch {
      toast.error('Link nije kopiran. Označite ga i kopirajte ručno.');
    }
  };

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Pristup za vozača</CardTitle>
        <CardDescription>
          Lični link koji vozač otvara na telefonu, bez prijave, da unese kilometražu i troškove
          vožnje. Pošaljite ga vozaču Viberom, WhatsApp-om ili SMS-om.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isPending ? (
          <Skeleton className="h-10 w-full" />
        ) : query.isError || !link ? (
          <ErrorState
            error={query.error ?? new Error('Stanje linka nije učitano.')}
            title="Stanje linka nije učitano"
            retryLabel="Pokušaj ponovo"
            retryingLabel="Učitavanje…"
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
          />
        ) : (
          <>
            {createdUrl ? (
              <div className="space-y-3 rounded-lg border p-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    readOnly
                    value={createdUrl}
                    aria-label="Link za vozača"
                    onFocus={(event) => event.currentTarget.select()}
                  />
                  <div className="flex gap-2">
                    <Button type="button" onClick={() => void copyLink()}>
                      <Copy className="size-4" aria-hidden />
                      Kopiraj
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowQr((current) => !current)}
                    >
                      <QrCode className="size-4" aria-hidden />
                      QR kod
                    </Button>
                  </div>
                </div>
                {showQr ? (
                  <div className="flex justify-center rounded-lg bg-white p-4">
                    <QRCodeSVG value={createdUrl} size={192} marginSize={1} />
                  </div>
                ) : null}
                <p className="text-muted-foreground text-xs">
                  Link se prikazuje samo sada. Ako se izgubi, napravite novi; stari tada prestaje da
                  važi.
                </p>
              </div>
            ) : null}

            {link.active ? (
              <p className="text-sm">
                Link je aktivan od {formatDateTime(link.createdAt)}.{' '}
                {link.lastUsedAt
                  ? `Vozač ga je poslednji put otvorio ${formatDateTime(link.lastUsedAt)}.`
                  : 'Vozač ga još nije otvorio.'}
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">
                {isInactive ? 'Neaktivan vozač ne može dobiti link.' : 'Vozač nema aktivan link.'}
              </p>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={link.active ? 'outline' : 'default'}
                onClick={() => void createLink()}
                disabled={isPending || isInactive}
              >
                <Link2 className="size-4" aria-hidden />
                {createMutation.isPending
                  ? 'Pravljenje…'
                  : link.active
                    ? 'Napravi novi link'
                    : 'Napravi link'}
              </Button>
              {link.active ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void revokeLink()}
                  disabled={isPending}
                >
                  {revokeMutation.isPending ? 'Ukidanje…' : 'Ukini pristup'}
                </Button>
              ) : null}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
