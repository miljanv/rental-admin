'use client';

import {
  AUDIT_ACTIONS,
  AUDIT_ACTION_LABELS,
  FINANCE_AUDIT_ACTION_LABELS,
  type AuditAction,
  type ListAuditEventsQueryInput,
  type PaginationMeta,
} from '@rental-admin/shared';
import { ScrollText } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { DateField } from '@/components/common/date-field';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuditEvents, useFinanceAuditEvents } from '@/features/admin/hooks/use-audit-events';
import { useOrganizations } from '@/features/admin/hooks/use-organizations';
import { useUsers } from '@/features/admin/hooks/use-users';
import { describeAuditDetails, describeAuditSubject } from '@/features/admin/lib/audit-format';
import { formatDateTime } from '@/lib/format';

const ALL = 'all';
const PAGE_SIZE = 25;

interface AuditFilters {
  organizationId: string;
  actorUserId: string;
  action: string;
  from: string;
  to: string;
}

const EMPTY_FILTERS: AuditFilters = {
  organizationId: ALL,
  actorUserId: ALL,
  action: ALL,
  from: '',
  to: '',
};

const toQuery = (
  filters: AuditFilters,
  page: number,
  includeAction: boolean,
): ListAuditEventsQueryInput => ({
  page,
  limit: PAGE_SIZE,
  ...(filters.organizationId !== ALL ? { organizationId: filters.organizationId } : {}),
  ...(filters.actorUserId !== ALL ? { actorUserId: filters.actorUserId } : {}),
  ...(includeAction && filters.action !== ALL ? { action: filters.action as AuditAction } : {}),
  ...(filters.from ? { from: filters.from } : {}),
  ...(filters.to ? { to: filters.to } : {}),
});

interface AuditEventsViewProps {
  /** Fixes the view on one organization and hides the organization filter and column. */
  organizationId?: string;
}

/** Who did what and when: sign-ins and admin actions, plus the finance log on its own tab. */
export function AuditEventsView({ organizationId }: AuditEventsViewProps) {
  const [filters, setFilters] = useState<AuditFilters>({
    ...EMPTY_FILTERS,
    ...(organizationId ? { organizationId } : {}),
  });
  const [tab, setTab] = useState<'events' | 'finance'>('events');
  const [page, setPage] = useState(1);
  const isPeriodInvalid = Boolean(filters.from && filters.to && filters.from > filters.to);

  const organizationsQuery = useOrganizations({ enabled: !organizationId });
  const usersQuery = useUsers(
    filters.organizationId !== ALL ? { organizationId: filters.organizationId } : {},
  );
  const eventsQuery = useAuditEvents(
    toQuery(filters, page, true),
    tab === 'events' && !isPeriodInvalid,
  );
  const financeQuery = useFinanceAuditEvents(
    toQuery(filters, page, false),
    tab === 'finance' && !isPeriodInvalid,
  );

  const updateFilters = (changes: Partial<AuditFilters>) => {
    setFilters((current) => ({
      ...current,
      ...changes,
      ...(changes.organizationId !== undefined ? { actorUserId: ALL } : {}),
    }));
    setPage(1);
  };

  const isFiltered =
    filters.actorUserId !== ALL ||
    filters.action !== ALL ||
    filters.from !== '' ||
    filters.to !== '' ||
    (!organizationId && filters.organizationId !== ALL);
  const showOrganization = !organizationId;

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        setTab(value as 'events' | 'finance');
        setPage(1);
      }}
      className="space-y-4"
    >
      <div className="flex flex-col gap-3 px-6 lg:flex-row lg:flex-wrap lg:items-end">
        <TabsList>
          <TabsTrigger value="events">Aktivnosti</TabsTrigger>
          <TabsTrigger value="finance">Finansije</TabsTrigger>
        </TabsList>

        {showOrganization ? (
          <div className="space-y-1.5">
            <Label htmlFor="audit-organization-filter" className="text-xs">
              Firma
            </Label>
            <Select
              value={filters.organizationId}
              onValueChange={(value) => updateFilters({ organizationId: value })}
            >
              <SelectTrigger id="audit-organization-filter" className="w-full lg:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Sve firme</SelectItem>
                {(organizationsQuery.data ?? []).map((organization) => (
                  <SelectItem key={organization.id} value={organization.id}>
                    {organization.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="audit-user-filter" className="text-xs">
            Korisnik
          </Label>
          <Select
            value={filters.actorUserId}
            onValueChange={(value) => updateFilters({ actorUserId: value })}
          >
            <SelectTrigger id="audit-user-filter" className="w-full lg:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Svi korisnici</SelectItem>
              {(usersQuery.data ?? []).map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {tab === 'events' ? (
          <div className="space-y-1.5">
            <Label htmlFor="audit-action-filter" className="text-xs">
              Akcija
            </Label>
            <Select
              value={filters.action}
              onValueChange={(value) => updateFilters({ action: value })}
            >
              <SelectTrigger id="audit-action-filter" className="w-full lg:w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Sve akcije</SelectItem>
                {AUDIT_ACTIONS.map((action) => (
                  <SelectItem key={action} value={action}>
                    {AUDIT_ACTION_LABELS[action]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="audit-from" className="text-xs">
            Od
          </Label>
          <DateField
            id="audit-from"
            className="lg:w-40"
            value={filters.from}
            onChange={(value) => updateFilters({ from: value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="audit-to" className="text-xs">
            Do
          </Label>
          <DateField
            id="audit-to"
            className="lg:w-40"
            value={filters.to}
            aria-invalid={isPeriodInvalid}
            onChange={(value) => updateFilters({ to: value })}
          />
        </div>

        {isFiltered ? (
          <Button
            variant="ghost"
            onClick={() => {
              setFilters({ ...EMPTY_FILTERS, ...(organizationId ? { organizationId } : {}) });
              setPage(1);
            }}
          >
            Poništi filtere
          </Button>
        ) : null}
      </div>

      {isPeriodInvalid ? (
        <p className="text-destructive px-6 text-sm">Krajnji datum ne može biti pre početnog.</p>
      ) : null}

      <TabsContent value="events">
        <EventsTable
          query={eventsQuery}
          showOrganization={showOrganization}
          isFiltered={isFiltered}
          rows={(eventsQuery.data?.events ?? []).map((event) => {
            const subject = describeAuditSubject(event);
            const details = describeAuditDetails(event);

            return {
              id: event.id,
              createdAt: event.createdAt,
              actor: event.actor?.username ?? null,
              organization: event.organization,
              action: AUDIT_ACTION_LABELS[event.action],
              subject: (
                <div className="space-y-0.5">
                  <div>
                    <span className="text-muted-foreground">{subject.type}</span>
                    {subject.name ? (
                      <>
                        {' '}
                        {subject.href ? (
                          <Link href={subject.href} className="font-medium hover:underline">
                            {subject.name}
                          </Link>
                        ) : (
                          <span className="font-medium">{subject.name}</span>
                        )}
                      </>
                    ) : null}
                  </div>
                  {details ? <div className="text-muted-foreground text-xs">{details}</div> : null}
                </div>
              ),
              ip: event.ip,
            };
          })}
          page={page}
          onPageChange={setPage}
        />
      </TabsContent>
      <TabsContent value="finance">
        <EventsTable
          query={financeQuery}
          showOrganization={showOrganization}
          isFiltered={isFiltered}
          rows={(financeQuery.data?.events ?? []).map((event) => ({
            id: event.id,
            createdAt: event.createdAt,
            actor: event.actor?.username ?? null,
            organization: event.organization,
            action: FINANCE_AUDIT_ACTION_LABELS[event.action] ?? event.action,
            subject: event.reason ? (
              <span className="text-muted-foreground">{event.reason}</span>
            ) : (
              <span className="text-muted-foreground">Transakcija</span>
            ),
            ip: null,
          }))}
          page={page}
          onPageChange={setPage}
        />
      </TabsContent>
    </Tabs>
  );
}

interface EventRow {
  id: string;
  createdAt: string;
  actor: string | null;
  organization: { id: string; name: string } | null;
  action: string;
  subject: React.ReactNode;
  ip: string | null;
}

interface EventsTableProps {
  query: {
    isPending: boolean;
    isError: boolean;
    isFetching: boolean;
    error: unknown;
    refetch: () => unknown;
    data?: { pagination: PaginationMeta } | undefined;
  };
  rows: EventRow[];
  showOrganization: boolean;
  isFiltered: boolean;
  page: number;
  onPageChange: (page: number) => void;
}

function EventsTable({
  query,
  rows,
  showOrganization,
  isFiltered,
  page,
  onPageChange,
}: EventsTableProps) {
  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title="Dnevnik nije učitan"
        retryLabel="Pokušaj ponovo"
        retryingLabel="Učitavanje…"
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  if (!query.isPending && rows.length === 0) {
    return (
      <EmptyState
        icon={ScrollText}
        title="Nema zapisa"
        description={
          isFiltered ? 'Nijedan zapis ne odgovara filterima.' : 'Još nema zabeleženih aktivnosti.'
        }
      />
    );
  }

  const pagination = query.data?.pagination;

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[160px]">Vreme</TableHead>
            <TableHead>Korisnik</TableHead>
            {showOrganization ? <TableHead>Firma</TableHead> : null}
            <TableHead>Akcija</TableHead>
            <TableHead>Objekat</TableHead>
            <TableHead className="hidden xl:table-cell">IP adresa</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {query.isPending ? (
            <TableSkeleton rows={6} columns={showOrganization ? 6 : 5} />
          ) : (
            rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-muted-foreground tabular-nums">
                  {formatDateTime(row.createdAt)}
                </TableCell>
                <TableCell className="font-medium">
                  {row.actor ?? <span className="text-muted-foreground">—</span>}
                </TableCell>
                {showOrganization ? (
                  <TableCell>
                    {row.organization ? (
                      <Link
                        href={`/admin/organizations/${row.organization.id}`}
                        className="hover:underline"
                      >
                        {row.organization.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                ) : null}
                <TableCell>{row.action}</TableCell>
                <TableCell>{row.subject}</TableCell>
                <TableCell className="text-muted-foreground hidden tabular-nums xl:table-cell">
                  {row.ip ?? '—'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2 px-6">
          <span className="text-muted-foreground text-xs tabular-nums">
            Strana {pagination.page} od {pagination.totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Prethodna
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= pagination.totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Sledeća
          </Button>
        </div>
      ) : null}
    </div>
  );
}
