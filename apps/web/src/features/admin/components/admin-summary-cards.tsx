'use client';

import { Ban, Building2, Truck, Users } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminSummary } from '@/features/admin/hooks/use-admin-summary';
import { getApiErrorMessage } from '@/lib/api-error';

const CARDS = [
  { key: 'activeOrganizations', label: 'Aktivne firme', icon: Building2 },
  { key: 'suspendedOrganizations', label: 'Suspendovane firme', icon: Ban },
  { key: 'enabledVehicles', label: 'Aktivna vozila', icon: Truck },
  { key: 'activeUsers', label: 'Aktivni korisnici', icon: Users },
] as const;

export function AdminSummaryCards() {
  const query = useAdminSummary();

  if (query.isError) {
    return (
      <p className="text-destructive text-sm" role="alert">
        Brojke nisu učitane: {getApiErrorMessage(query.error)}
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {CARDS.map((card) => (
        <Card key={card.key} className="shadow-none">
          <CardContent className="flex items-center gap-3">
            <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
              <card.icon className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-muted-foreground truncate text-xs">{card.label}</p>
              {query.data ? (
                <p className="text-xl font-semibold tabular-nums">{query.data[card.key]}</p>
              ) : (
                <Skeleton className="mt-1 h-6 w-10" />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
