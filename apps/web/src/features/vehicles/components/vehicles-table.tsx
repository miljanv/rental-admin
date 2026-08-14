'use client';

import { VEHICLE_TYPE_LABELS, VEHICLE_FUEL_TYPE_LABELS, type VehicleDto } from '@rental-admin/shared';
import { MoreHorizontal, Pencil, Trash2, Truck } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/common/empty-state';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { VehicleStatusBadge } from '@/features/vehicles/components/vehicle-status-badge';

const COLUMN_COUNT = 6;

interface VehiclesTableProps {
  vehicles: VehicleDto[];
  isLoading: boolean;
  hasSearch: boolean;
  onRequestDelete: (vehicle: VehicleDto) => void;
  emptyAction?: React.ReactNode;
}

export function VehiclesTable({
  vehicles,
  isLoading,
  hasSearch,
  onRequestDelete,
  emptyAction,
}: VehiclesTableProps) {
  if (!isLoading && vehicles.length === 0) {
    return hasSearch ? (
      <EmptyState
        icon={Truck}
        title="Nema rezultata"
        description="Nijedno vozilo ne odgovara pretrazi. Pokušajte sa drugim pojmom."
      />
    ) : (
      <EmptyState
        icon={Truck}
        title="Još nema vozila"
        description="Dodajte prvo vozilo da biste počeli evidenciju voznog parka."
        action={emptyAction}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vozilo</TableHead>
          <TableHead>Tip</TableHead>
          <TableHead>Gorivo</TableHead>
          <TableHead>Kilometraža</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={5} columns={COLUMN_COUNT} />
        ) : (
          vehicles.map((vehicle) => (
            <TableRow key={vehicle.id}>
              <TableCell className="max-w-[280px]">
                <Link href={`/vehicles/${vehicle.id}`} className="hover:text-primary block">
                  <span className="block truncate font-medium">
                    {vehicle.make} {vehicle.model}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {vehicle.licensePlate}
                  </span>
                </Link>
              </TableCell>
              <TableCell>{VEHICLE_TYPE_LABELS[vehicle.type]}</TableCell>
              <TableCell>{VEHICLE_FUEL_TYPE_LABELS[vehicle.fuelType]}</TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {vehicle.currentMileage.toLocaleString('sr-RS')} km
              </TableCell>
              <TableCell>
                <VehicleStatusBadge status={vehicle.status} />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Akcije za ${vehicle.make} ${vehicle.model}`}
                    >
                      <MoreHorizontal className="size-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem asChild className="gap-2">
                      <Link href={`/vehicles/${vehicle.id}`}>
                        <Truck className="size-4" aria-hidden />
                        Detalji
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="gap-2">
                      <Link href={`/vehicles/${vehicle.id}/edit`}>
                        <Pencil className="size-4" aria-hidden />
                        Izmeni
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onRequestDelete(vehicle)}
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
