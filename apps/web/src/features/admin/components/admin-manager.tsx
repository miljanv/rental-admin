'use client';

import type { ManagedUserDto, OrganizationDto } from '@rental-admin/shared';
import { Plus, RefreshCw, Search, ShieldCheck, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminSummaryCards } from '@/features/admin/components/admin-summary-cards';
import { DeleteOrganizationDialog } from '@/features/admin/components/delete-organization-dialog';
import { DeleteUserDialog } from '@/features/admin/components/delete-user-dialog';
import { OrganizationDialog } from '@/features/admin/components/organization-dialog';
import { OrganizationsTable } from '@/features/admin/components/organizations-table';
import { ResetPasswordDialog } from '@/features/admin/components/reset-password-dialog';
import { RevokeSessionsDialog } from '@/features/admin/components/revoke-sessions-dialog';
import { SuspendOrganizationDialog } from '@/features/admin/components/suspend-organization-dialog';
import { UserDialog } from '@/features/admin/components/user-dialog';
import { UsersTable } from '@/features/admin/components/users-table';
import { useOrganizations } from '@/features/admin/hooks/use-organizations';
import { useUsers } from '@/features/admin/hooks/use-users';
import {
  matchesOrganization,
  ORGANIZATION_FILTERS,
  type OrganizationFilter,
} from '@/features/admin/lib/organization-health';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

const ALL_ORGANIZATIONS = 'all';

/** A dialog is closed, or open for a new record (null), or for an existing one. */
type DialogTarget<T> = { record: T | null } | null;

function AdminScreen({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const { activeOrganizationId, selectOrganization } = useAuth();
  const [organizationFilter, setOrganizationFilter] = useState(ALL_ORGANIZATIONS);
  const [organizationSearch, setOrganizationSearch] = useState('');
  const [organizationStatus, setOrganizationStatus] = useState<OrganizationFilter>('all');
  // One reference time per visit, so "last activity" does not shift between renders.
  const [now] = useState(() => new Date());
  const [organizationDialog, setOrganizationDialog] = useState<DialogTarget<OrganizationDto>>(null);
  const [organizationToDelete, setOrganizationToDelete] = useState<OrganizationDto | null>(null);
  const [organizationToToggle, setOrganizationToToggle] = useState<OrganizationDto | null>(null);
  const [userDialog, setUserDialog] = useState<DialogTarget<ManagedUserDto>>(null);
  const [userToDelete, setUserToDelete] = useState<ManagedUserDto | null>(null);
  const [userToSignOut, setUserToSignOut] = useState<ManagedUserDto | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<ManagedUserDto | null>(null);

  const isFiltered = organizationFilter !== ALL_ORGANIZATIONS;
  const organizationsQuery = useOrganizations();
  const usersQuery = useUsers(isFiltered ? { organizationId: organizationFilter } : {});

  const organizations = organizationsQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const isOrganizationListFiltered =
    organizationSearch.trim() !== '' || organizationStatus !== 'all';
  const visibleOrganizations = organizations.filter((organization) =>
    matchesOrganization(
      organization,
      { search: organizationSearch, filter: organizationStatus },
      now,
    ),
  );

  const openOrganization = (organization: OrganizationDto) => {
    selectOrganization(organization.id);
    router.push('/');
  };

  const refetchAll = () => {
    void organizationsQuery.refetch();
    void usersQuery.refetch();
  };

  return (
    <>
      <PageHeader
        title="Firme i korisnici"
        description="Firme, njihovi nalozi i koliko je ko dodao. Svaka firma vidi samo svoje podatke."
        actions={
          <>
            <Button variant="outline" onClick={() => setOrganizationDialog({ record: null })}>
              <Plus className="size-4" aria-hidden />
              Nova firma
            </Button>
            <Button onClick={() => setUserDialog({ record: null })}>
              <UserPlus className="size-4" aria-hidden />
              Novi korisnik
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        <AdminSummaryCards />

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Firme</CardTitle>
            <CardDescription>
              {organizations.length === 0
                ? 'Još nema unetih firmi.'
                : `${organizations.length} ${organizations.length === 1 ? 'firma' : 'firmi'}. Kliknite na firmu da otvorite njen detalj.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-0">
            <div className="flex flex-col gap-3 px-6 sm:flex-row sm:items-end">
              <div className="space-y-1.5 sm:w-64">
                <Label htmlFor="organization-search" className="text-xs">
                  Pretraga
                </Label>
                <div className="relative">
                  <Search
                    className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
                    aria-hidden
                  />
                  <Input
                    id="organization-search"
                    type="search"
                    placeholder="Naziv firme"
                    className="pl-8"
                    value={organizationSearch}
                    onChange={(event) => setOrganizationSearch(event.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="organization-status-filter" className="text-xs">
                  Status
                </Label>
                <Select
                  value={organizationStatus}
                  onValueChange={(value) => setOrganizationStatus(value as OrganizationFilter)}
                >
                  <SelectTrigger id="organization-status-filter" className="w-full sm:w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ORGANIZATION_FILTERS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {organizationsQuery.isError ? (
              <ErrorState
                error={organizationsQuery.error}
                title="Lista firmi nije učitana"
                retryLabel="Pokušaj ponovo"
                retryingLabel="Učitavanje…"
                onRetry={() => void organizationsQuery.refetch()}
                isRetrying={organizationsQuery.isFetching}
              />
            ) : (
              <OrganizationsTable
                organizations={visibleOrganizations}
                isLoading={organizationsQuery.isPending}
                activeOrganizationId={activeOrganizationId}
                now={now}
                isFiltered={isOrganizationListFiltered}
                onOpen={openOrganization}
                onEdit={(organization) => setOrganizationDialog({ record: organization })}
                onRequestToggleActive={setOrganizationToToggle}
                onRequestDelete={setOrganizationToDelete}
                emptyAction={
                  <Button size="sm" onClick={() => setOrganizationDialog({ record: null })}>
                    Dodaj firmu
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Korisnici</CardTitle>
            <CardDescription>
              {users.length === 0
                ? 'Nema korisnika za prikaz.'
                : `${users.length} ${users.length === 1 ? 'korisnik' : 'korisnika'}.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-0">
            <div className="flex flex-col gap-3 px-6 sm:flex-row sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="user-organization-filter" className="text-xs">
                  Firma
                </Label>
                <Select value={organizationFilter} onValueChange={setOrganizationFilter}>
                  <SelectTrigger id="user-organization-filter" className="w-full sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_ORGANIZATIONS}>Sve firme</SelectItem>
                    {organizations.map((organization) => (
                      <SelectItem key={organization.id} value={organization.id}>
                        {organization.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                variant="outline"
                onClick={refetchAll}
                disabled={usersQuery.isFetching || organizationsQuery.isFetching}
                aria-label="Osveži firme i korisnike"
              >
                <RefreshCw
                  className={cn('size-4', usersQuery.isFetching && 'animate-spin')}
                  aria-hidden
                />
                Osveži
              </Button>
            </div>

            {usersQuery.isError ? (
              <ErrorState
                error={usersQuery.error}
                title="Lista korisnika nije učitana"
                retryLabel="Pokušaj ponovo"
                retryingLabel="Učitavanje…"
                onRetry={() => void usersQuery.refetch()}
                isRetrying={usersQuery.isFetching}
              />
            ) : (
              <UsersTable
                users={users}
                isLoading={usersQuery.isPending}
                isFiltered={isFiltered}
                currentUserId={currentUserId}
                onEdit={(user) => setUserDialog({ record: user })}
                onRequestResetPassword={setUserToResetPassword}
                onRequestRevokeSessions={setUserToSignOut}
                onRequestDelete={setUserToDelete}
                emptyAction={
                  <Button size="sm" onClick={() => setUserDialog({ record: null })}>
                    Dodaj korisnika
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      </div>

      <OrganizationDialog
        open={organizationDialog !== null}
        organization={organizationDialog?.record ?? null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setOrganizationDialog(null);
        }}
      />
      <SuspendOrganizationDialog
        organization={organizationToToggle}
        onOpenChange={(isOpen) => {
          if (!isOpen) setOrganizationToToggle(null);
        }}
      />
      <DeleteOrganizationDialog
        organization={organizationToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) setOrganizationToDelete(null);
        }}
      />
      <UserDialog
        open={userDialog !== null}
        user={userDialog?.record ?? null}
        currentUserId={currentUserId}
        onOpenChange={(isOpen) => {
          if (!isOpen) setUserDialog(null);
        }}
      />
      <ResetPasswordDialog
        user={userToResetPassword}
        onOpenChange={(isOpen) => {
          if (!isOpen) setUserToResetPassword(null);
        }}
      />
      <RevokeSessionsDialog
        user={userToSignOut}
        onOpenChange={(isOpen) => {
          if (!isOpen) setUserToSignOut(null);
        }}
      />
      <DeleteUserDialog
        user={userToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) setUserToDelete(null);
        }}
      />
    </>
  );
}

/** The superadmin screen. Anyone else is told they cannot be here (the API refuses them too). */
export function AdminManager() {
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

  return <AdminScreen currentUserId={user.id} />;
}
