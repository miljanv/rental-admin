'use client';

import { ShieldCheck } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { AuditEventsView } from '@/features/admin/components/audit-events-view';
import { useAuth } from '@/providers/auth-provider';

/** The superadmin's log of sign-ins and admin actions across every organization. */
export function AuditLogManager() {
  const { user } = useAuth();

  if (user?.role !== 'SUPERADMIN') {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Nemate pristup"
        description="Ovaj deo panela je dostupan samo superadminu."
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Dnevnik aktivnosti"
        description="Prijave, izmene naloga, firmi i vozila, fakture i troškovi — ko je šta i kada uradio."
      />
      <Card className="shadow-none">
        <CardContent className="px-0">
          <AuditEventsView />
        </CardContent>
      </Card>
    </>
  );
}
