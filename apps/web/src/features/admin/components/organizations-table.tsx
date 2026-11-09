'use client';

import type { OrganizationDto } from '@rental-admin/shared';
import {
  Ban,
  Building2,
  CircleCheck,
  Eye,
  LogIn,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { EmptyState } from '@/components/common/empty-state';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  formatLastActivity,
  isInactive,
  limitLevel,
  type LimitLevel,
} from '@/features/admin/lib/organization-health';
import { usagePercent } from '@/features/admin/lib/usage';
import { cn } from '@/lib/utils';

const COLUMN_COUNT = 8;

/** "3/5" against a limit, plain "3" without one. */
const formatUsage = (used: number, max: number | null): string =>
  max === null ? String(used) : `${used}/${max}`;

const LEVEL_TEXT: Record<LimitLevel, string> = {
  ok: '',
  near: 'text-amber-600 dark:text-amber-400',
  full: 'text-destructive',
};

const LEVEL_BAR: Record<LimitLevel, string> = {
  ok: '',
  near: '[&_[data-slot=progress-indicator]]:bg-amber-500',
  full: '[&_[data-slot=progress-indicator]]:bg-destructive',
};

function UsageCell({ used, max }: { used: number; max: number | null }) {
  const percent = usagePercent(used, max);
  const level = limitLevel(used, max);

  return (
    <div className="ml-auto w-20 space-y-1 text-right">
      <span className={cn('tabular-nums', LEVEL_TEXT[level])}>{formatUsage(used, max)}</span>
      {percent === null ? null : (
        <Progress value={percent} className={LEVEL_BAR[level]} aria-hidden />
      )}
    </div>
  );
}

interface OrganizationsTableProps {
  organizations: OrganizationDto[];
  isLoading: boolean;
  activeOrganizationId: string | null;
  /** Reference time for "last activity" and the inactivity mark. */
  now: Date;
  /** Set when a search or filter hides every organization. */
  isFiltered?: boolean;
  onOpen: (organization: OrganizationDto) => void;
  onEdit: (organization: OrganizationDto) => void;
  onRequestToggleActive: (organization: OrganizationDto) => void;
  onRequestDelete: (organization: OrganizationDto) => void;
  emptyAction?: React.ReactNode;
}

export function OrganizationsTable({
  organizations,
  isLoading,
  activeOrganizationId,
  now,
  isFiltered = false,
  onOpen,
  onEdit,
  onRequestToggleActive,
  onRequestDelete,
  emptyAction,
}: OrganizationsTableProps) {
  const router = useRouter();

  if (!isLoading && organizations.length === 0 && isFiltered) {
    return (
      <EmptyState
        icon={Building2}
        title="Nema firmi za prikaz"
        description="Nijedna firma ne odgovara pretrazi ili filteru."
      />
    );
  }

  if (!isLoading && organizations.length === 0) {
    return (
      <EmptyState
        icon={Building2}
        title="Još nema firmi"
        description="Dodajte prvu firmu, pa joj kreirajte korisnike."
        action={emptyAction}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Firma</TableHead>
          <TableHead className="text-right">Vozila</TableHead>
          <TableHead className="text-right">Korisnici</TableHead>
          <TableHead className="text-right">Zaposleni</TableHead>
          <TableHead className="text-right">Vožnje</TableHead>
          <TableHead>Zadnja aktivnost</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={4} columns={COLUMN_COUNT} />
        ) : (
          organizations.map((organization) => (
            <TableRow
              key={organization.id}
              className="cursor-pointer"
              onClick={() => router.push(`/admin/organizations/${organization.id}`)}
            >
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/organizations/${organization.id}`}
                    className="hover:text-primary text-left font-medium"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {organization.name}
                  </Link>
                  {organization.id === activeOrganizationId ? (
                    <Badge variant="secondary">Izabrana</Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell>
                <UsageCell
                  used={organization.usage.vehicles}
                  max={organization.usage.maxVehicles}
                />
              </TableCell>
              <TableCell>
                <UsageCell used={organization.usage.users} max={organization.usage.maxUsers} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{organization.driverCount}</TableCell>
              <TableCell className="text-right tabular-nums">{organization.tripCount}</TableCell>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {formatLastActivity(organization.lastActivityAt, now)}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {organization.isActive ? (
                    <Badge variant="outline">Aktivna</Badge>
                  ) : (
                    <Badge variant="destructive">Suspendovana</Badge>
                  )}
                  {isInactive(organization, now) ? (
                    <Badge variant="secondary">Neaktivna</Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Akcije za firmu ${organization.name}`}
                    >
                      <MoreHorizontal className="size-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild className="gap-2">
                      <Link href={`/admin/organizations/${organization.id}`}>
                        <Eye className="size-4" aria-hidden />
                        Detalj firme
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onOpen(organization)} className="gap-2">
                      <LogIn className="size-4" aria-hidden />
                      Uđi u firmu
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(organization)} className="gap-2">
                      <Pencil className="size-4" aria-hidden />
                      Izmeni
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onRequestToggleActive(organization)}
                      className="gap-2"
                    >
                      {organization.isActive ? (
                        <Ban className="size-4" aria-hidden />
                      ) : (
                        <CircleCheck className="size-4" aria-hidden />
                      )}
                      {organization.isActive ? 'Suspenduj' : 'Aktiviraj'}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onRequestDelete(organization)}
                      className="gap-2"
                    >
                      <Trash2 className="size-4" aria-hidden />
                      Obriši
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
