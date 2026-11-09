'use client';

import { Truck } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useOrganizationVehicles } from '@/features/admin/hooks/use-organization-vehicles';
import { useSetOrganizationVehicleEnabled } from '@/features/admin/hooks/use-set-organization-vehicle-enabled';
import {
  VehicleDisabledBadge,
  VehicleStatusBadge,
} from '@/features/vehicles/components/vehicle-status-badge';

const COLUMN_COUNT = 4;

/** Every vehicle of one organization, with the superadmin's enable / disable switch. */
export function OrganizationVehiclesTable({ organizationId }: { organizationId: string }) {
  const [page, setPage] = useState(1);
  const query = useOrganizationVehicles(organizationId, page);
  const mutation = useSetOrganizationVehicleEnabled(organizationId);

  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title="Vozila nisu učitana"
        retryLabel="Pokušaj ponovo"
        retryingLabel="Učitavanje…"
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  const vehicles = query.data?.vehicles ?? [];
  const pagination = query.data?.pagination;

  if (!query.isPending && vehicles.length === 0) {
    return (
      <EmptyState
        icon={Truck}
        title="Nema vozila"
        description="Firma još nije unela nijedno vozilo."
      />
    );
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reg. oznaka</TableHead>
            <TableHead>Vozilo</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[140px] text-right">Aktivnost</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {query.isPending ? (
            <TableSkeleton rows={4} columns={COLUMN_COUNT} />
          ) : (
            vehicles.map((vehicle) => (
              <TableRow key={vehicle.id}>
                <TableCell className="font-medium">{vehicle.licensePlate}</TableCell>
                <TableCell className="text-muted-foreground">
                  {vehicle.make} {vehicle.model}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <VehicleStatusBadge status={vehicle.status} />
                    {vehicle.isEnabled ? null : <VehicleDisabledBadge />}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={mutation.isPending && mutation.variables?.id === vehicle.id}
                    onClick={() => mutation.mutate(vehicle)}
                  >
                    {vehicle.isEnabled ? 'Deaktiviraj' : 'Aktiviraj'}
                  </Button>
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
            onClick={() => setPage((current) => current - 1)}
          >
            Prethodna
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= pagination.totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Sledeća
          </Button>
        </div>
      ) : null}
    </div>
  );
}
