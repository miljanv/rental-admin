'use client';

import { ANNOUNCEMENT_KIND_LABELS, type AnnouncementDto } from '@rental-admin/shared';
import { Megaphone, Pencil, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AnnouncementDialog } from '@/features/announcements/components/announcement-dialog';
import { DeleteAnnouncementDialog } from '@/features/announcements/components/delete-announcement-dialog';
import { useAnnouncements } from '@/features/announcements/hooks/use-announcements';
import {
  ANNOUNCEMENT_STATUS_LABELS,
  announcementStatus,
  type AnnouncementStatus,
} from '@/features/announcements/lib/announcement-status';
import { formatDateTime } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';

const COLUMN_COUNT = 6;

const STATUS_VARIANTS: Record<AnnouncementStatus, 'default' | 'secondary' | 'outline'> = {
  ACTIVE: 'default',
  SCHEDULED: 'secondary',
  EXPIRED: 'outline',
};

const describeTargets = (announcement: AnnouncementDto): string =>
  announcement.allOrganizations
    ? 'Sve firme'
    : announcement.organizations.map((organization) => organization.name).join(', ');

function AnnouncementsScreen() {
  const query = useAnnouncements();
  const [editing, setEditing] = useState<AnnouncementDto | null | undefined>(undefined);
  const [deleting, setDeleting] = useState<AnnouncementDto | null>(null);
  const now = new Date();
  const announcements = query.data ?? [];
  const createButton = (
    <Button onClick={() => setEditing(null)}>
      <Plus className="size-4" aria-hidden />
      Novo obaveštenje
    </Button>
  );

  return (
    <>
      <PageHeader
        title="Obaveštenja"
        description="Baneri na vrhu aplikacije, za sve firme ili samo za izabrane."
        actions={createButton}
      />

      <Card className="shadow-none">
        <CardContent className="px-0">
          {query.isError ? (
            <ErrorState
              error={query.error}
              title="Obaveštenja nisu učitana"
              retryLabel="Pokušaj ponovo"
              retryingLabel="Učitavanje…"
              onRetry={() => void query.refetch()}
              isRetrying={query.isFetching}
            />
          ) : !query.isPending && announcements.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="Nema obaveštenja"
              description="Objavite obaveštenje da ga korisnici vide na vrhu aplikacije."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Obaveštenje</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Za</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px] text-right">Akcije</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isPending ? (
                  <TableSkeleton rows={3} columns={COLUMN_COUNT} />
                ) : (
                  announcements.map((announcement) => {
                    const status = announcementStatus(announcement, now);

                    return (
                      <TableRow key={announcement.id}>
                        <TableCell className="max-w-[360px]">
                          <p className="line-clamp-2 whitespace-normal">{announcement.message}</p>
                        </TableCell>
                        <TableCell>{ANNOUNCEMENT_KIND_LABELS[announcement.kind]}</TableCell>
                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap tabular-nums">
                          {formatDateTime(announcement.startsAt)}
                          <br />
                          {announcement.endsAt ? formatDateTime(announcement.endsAt) : 'bez kraja'}
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          <p className="line-clamp-2 whitespace-normal">
                            {describeTargets(announcement)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={STATUS_VARIANTS[status]}>
                            {ANNOUNCEMENT_STATUS_LABELS[status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Izmeni obaveštenje"
                              onClick={() => setEditing(announcement)}
                            >
                              <Pencil className="size-4" aria-hidden />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Obriši obaveštenje"
                              onClick={() => setDeleting(announcement)}
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AnnouncementDialog
        announcement={editing}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEditing(undefined);
          }
        }}
      />
      <DeleteAnnouncementDialog
        announcement={deleting}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDeleting(null);
          }
        }}
      />
    </>
  );
}

/** The superadmin's list of banners. Anyone else is told they cannot be here. */
export function AnnouncementsManager() {
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

  return <AnnouncementsScreen />;
}
