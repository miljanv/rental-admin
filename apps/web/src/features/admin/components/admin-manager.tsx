'use client';

import type { ManagedUserDto, OrganizationDto } from '@rental-admin/shared';
import { Plus, RefreshCw, ShieldCheck, UserPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DeleteOrganizationDialog } from '@/features/admin/components/delete-organization-dialog';
import { DeleteUserDialog } from '@/features/admin/components/delete-user-dialog';
import { OrganizationDialog } from '@/features/admin/components/organization-dialog';
import { OrganizationsTable } from '@/features/admin/components/organizations-table';
import { UserDialog } from '@/features/admin/components/user-dialog';
import { UsersTable } from '@/features/admin/components/users-table';
import { useOrganizations } from '@/features/admin/hooks/use-organizations';
import { useUsers } from '@/features/admin/hooks/use-users';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

const ALL_ORGANIZATIONS = 'all';

/** A dialog is closed, or open for a new record (null), or for an existing one. */
type DialogTarget<T> = { record: T | null } | null;

function AdminScreen({ currentUserId }: { currentUserId: string }) {
  const router = useRouter();
  const { activeOrganizationId, selectOrganization } = useAuth();
  const [organizationFilter, setOrganizationFilter] = useState(ALL_ORGANIZATIONS);
  const [organizationDialog, setOrganizationDialog] = useState<DialogTarget<OrganizationDto>>(null);
  const [organizationToDelete, setOrganizationToDelete] = useState<OrganizationDto | null>(null);
  const [userDialog, setUserDialog] = useState<DialogTarget<ManagedUserDto>>(null);
  const [userToDelete, setUserToDelete] = useState<ManagedUserDto | null>(null);

  const isFiltered = organizationFilter !== ALL_ORGANIZATIONS;
  const organizationsQuery = useOrganizations();
  const usersQuery = useUsers(isFiltered ? { organizationId: organizationFilter } : {});

  const organizations = organizationsQuery.data ?? [];
  const users = usersQuery.data ?? [];

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
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Firme</CardTitle>
            <CardDescription>
              {organizations.length === 0
                ? 'Još nema unetih firmi.'
                : `${organizations.length} ${organizations.length === 1 ? 'firma' : 'firmi'}. Kliknite na firmu da otvorite njene podatke.`}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
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
                organizations={organizations}
                isLoading={organizationsQuery.isPending}
                activeOrganizationId={activeOrganizationId}
                onOpen={openOrganization}
                onEdit={(organization) => setOrganizationDialog({ record: organization })}
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
