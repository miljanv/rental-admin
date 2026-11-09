'use client';

import type { ManagedUserDto, OrganizationOverviewDto } from '@rental-admin/shared';
import { ArrowLeft, LogIn, Pencil, ShieldCheck, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DeleteUserDialog } from '@/features/admin/components/delete-user-dialog';
import { OrganizationProfileDialog } from '@/features/admin/components/organization-profile-dialog';
import { OrganizationVehiclesTable } from '@/features/admin/components/organization-vehicles-table';
import { ResetPasswordDialog } from '@/features/admin/components/reset-password-dialog';
import { RevokeSessionsDialog } from '@/features/admin/components/revoke-sessions-dialog';
import { UserDialog } from '@/features/admin/components/user-dialog';
import { UsersTable } from '@/features/admin/components/users-table';
import { useOrganizationOverview } from '@/features/admin/hooks/use-organization-overview';
import { useUsers } from '@/features/admin/hooks/use-users';
import { isAtLimit, usagePercent } from '@/features/admin/lib/usage';
import { formatDate, formatDateTime, formatFileSize } from '@/lib/format';
import { useAuth } from '@/providers/auth-provider';

/** A dialog is closed, or open for a new record (null), or for an existing one. */
type DialogTarget<T> = { record: T | null } | null;

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-sm break-words">{value ?? '—'}</dd>
    </div>
  );
}

function LimitRow({ label, used, max }: { label: string; used: number; max: number | null }) {
  const percent = usagePercent(used, max);

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span>{label}</span>
        <span className="tabular-nums">
          {used}
          {max === null ? (
            <span className="text-muted-foreground"> · bez limita</span>
          ) : (
            <span className="text-muted-foreground">/{max}</span>
          )}
        </span>
      </div>
      {percent === null ? null : <Progress value={percent} aria-label={`${label}: ${percent}%`} />}
    </div>
  );
}

function OverviewCards({
  overview,
  onEditProfile,
}: {
  overview: OrganizationOverviewDto;
  onEditProfile: () => void;
}) {
  const { profile } = overview.organization;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card className="shadow-none">
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="space-y-1.5">
            <CardTitle>Podaci o firmi</CardTitle>
            <CardDescription>PIB, matični broj i kontakt.</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onEditProfile}
            aria-label="Izmeni podatke o firmi"
          >
            <Pencil className="size-4" aria-hidden />
          </Button>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3">
            <Detail label="PIB" value={profile.taxId} />
            <Detail label="Matični broj" value={profile.registrationNumber} />
            <div className="col-span-2">
              <Detail label="Adresa" value={profile.address} />
            </div>
            <Detail label="Kontakt osoba" value={profile.contactName} />
            <Detail label="Telefon" value={profile.contactPhone} />
            <div className="col-span-2">
              <Detail label="E-mail" value={profile.contactEmail} />
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Limiti i potrošnja</CardTitle>
          <CardDescription>Aktivna vozila i aktivni korisnici.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LimitRow label="Vozila" used={overview.vehicles.enabled} max={overview.vehicles.max} />
          <LimitRow label="Korisnici" used={overview.users.active} max={overview.users.max} />
          <p className="text-muted-foreground text-xs">
            Neaktivno: {overview.vehicles.disabled} vozila, {overview.users.inactive} korisnika.
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Statistika</CardTitle>
          <CardDescription>
            Poslednja aktivnost:{' '}
            {overview.organization.lastActivityAt
              ? formatDateTime(overview.organization.lastActivityAt)
              : 'nikad'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3">
            <Detail label="Zaposleni" value={String(overview.drivers)} />
            <Detail label="Vožnje" value={String(overview.trips)} />
            <Detail label="Fakture" value={String(overview.invoices)} />
            <Detail label="Fajlovi" value={String(overview.files)} />
          </dl>
        </CardContent>
      </Card>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Prostor za fajlove</CardTitle>
          <CardDescription>Ukupna veličina otpremljenih fajlova.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {formatFileSize(overview.storageBytes)}
          </p>
          <p className="text-muted-foreground text-xs">
            {overview.files} {overview.files === 1 ? 'fajl' : 'fajlova'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-56 rounded-xl" />
      ))}
    </div>
  );
}

function OrganizationUsers({
  organizationId,
  currentUserId,
  canAddUser,
}: {
  organizationId: string;
  currentUserId: string;
  canAddUser: boolean;
}) {
  const usersQuery = useUsers({ organizationId });
  const [userDialog, setUserDialog] = useState<DialogTarget<ManagedUserDto>>(null);
  const [userToDelete, setUserToDelete] = useState<ManagedUserDto | null>(null);
  const [userToSignOut, setUserToSignOut] = useState<ManagedUserDto | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<ManagedUserDto | null>(null);

  const addButton = (
    <Button size="sm" disabled={!canAddUser} onClick={() => setUserDialog({ record: null })}>
      <UserPlus className="size-4" aria-hidden />
      Dodaj korisnika
    </Button>
  );

  return (
    <>
      <div className="flex flex-col gap-2 px-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
          {canAddUser
            ? 'Nalozi ove firme.'
            : 'Firma je dostigla limit korisnika. Povećajte limit ili deaktivirajte nekog.'}
        </p>
        {addButton}
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
          users={usersQuery.data ?? []}
          isLoading={usersQuery.isPending}
          isFiltered
          currentUserId={currentUserId}
          onEdit={(user) => setUserDialog({ record: user })}
          onRequestResetPassword={setUserToResetPassword}
          onRequestRevokeSessions={setUserToSignOut}
          onRequestDelete={setUserToDelete}
          {...(canAddUser ? { emptyAction: addButton } : {})}
        />
      )}

      <UserDialog
        open={userDialog !== null}
        user={userDialog?.record ?? null}
        currentUserId={currentUserId}
        defaultOrganizationId={organizationId}
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

function OrganizationDetailScreen({
  organizationId,
  currentUserId,
}: {
  organizationId: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const { activeOrganizationId, selectOrganization } = useAuth();
  const query = useOrganizationOverview(organizationId);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const backLink = (
    <Button variant="outline" asChild>
      <Link href="/admin">
        <ArrowLeft className="size-4" aria-hidden />
        Sve firme
      </Link>
    </Button>
  );

  if (query.isError) {
    return (
      <>
        <PageHeader title="Firma" description="Detalj firme." actions={backLink} />
        <ErrorState
          error={query.error}
          title="Firma nije učitana"
          retryLabel="Pokušaj ponovo"
          retryingLabel="Učitavanje…"
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      </>
    );
  }

  const overview = query.data;
  const organization = overview?.organization;

  const enterOrganization = () => {
    selectOrganization(organizationId);
    router.push('/');
  };

  return (
    <>
      <PageHeader
        title={organization?.name ?? 'Firma'}
        description={
          organization
            ? `Firma od ${formatDate(organization.createdAt)}. Sve o njoj na jednom mestu.`
            : 'Učitavanje…'
        }
        actions={
          <>
            {backLink}
            <Button onClick={enterOrganization} disabled={!organization}>
              <LogIn className="size-4" aria-hidden />
              Uđi u firmu
            </Button>
          </>
        }
      />

      {organization ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {organization.isActive ? (
            <Badge variant="outline">Aktivna</Badge>
          ) : (
            <Badge variant="destructive">Suspendovana</Badge>
          )}
          {organization.id === activeOrganizationId ? (
            <Badge variant="secondary">Izabrana u zaglavlju</Badge>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-6">
        {overview ? (
          <OverviewCards overview={overview} onEditProfile={() => setIsEditingProfile(true)} />
        ) : (
          <OverviewSkeleton />
        )}

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Korisnici</TabsTrigger>
            <TabsTrigger value="vehicles">Vozila</TabsTrigger>
          </TabsList>
          <TabsContent value="users">
            <Card className="shadow-none">
              <CardContent className="space-y-4 px-0">
                <OrganizationUsers
                  organizationId={organizationId}
                  currentUserId={currentUserId}
                  canAddUser={
                    overview ? !isAtLimit(overview.users.active, overview.users.max) : false
                  }
                />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="vehicles">
            <Card className="shadow-none">
              <CardContent className="px-0">
                <OrganizationVehiclesTable organizationId={organizationId} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <OrganizationProfileDialog
        organization={isEditingProfile ? (organization ?? null) : null}
        onOpenChange={(isOpen) => {
          if (!isOpen) setIsEditingProfile(false);
        }}
      />
    </>
  );
}

/** One organization's page for the superadmin. Anyone else is told they cannot be here. */
export function OrganizationDetail({ organizationId }: { organizationId: string }) {
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

  return <OrganizationDetailScreen organizationId={organizationId} currentUserId={user.id} />;
}
