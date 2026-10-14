'use client';

import type { OrganizationDto } from '@rental-admin/shared';
import { Building2, LogIn, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

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

const COLUMN_COUNT = 6;

interface OrganizationsTableProps {
  organizations: OrganizationDto[];
  isLoading: boolean;
  activeOrganizationId: string | null;
  onOpen: (organization: OrganizationDto) => void;
  onEdit: (organization: OrganizationDto) => void;
  onRequestDelete: (organization: OrganizationDto) => void;
  emptyAction?: React.ReactNode;
}

export function OrganizationsTable({
  organizations,
  isLoading,
  activeOrganizationId,
  onOpen,
  onEdit,
  onRequestDelete,
  emptyAction,
}: OrganizationsTableProps) {
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
          <TableHead className="text-right">Korisnici</TableHead>
          <TableHead className="text-right">Vozila</TableHead>
          <TableHead className="text-right">Zaposleni</TableHead>
          <TableHead className="text-right">Vožnje</TableHead>
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={4} columns={COLUMN_COUNT} />
        ) : (
          organizations.map((organization) => (
            <TableRow key={organization.id}>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpen(organization)}
                    className="hover:text-primary text-left font-medium"
                  >
                    {organization.name}
                  </button>
                  {organization.id === activeOrganizationId ? (
                    <Badge variant="secondary">Izabrana</Badge>
                  ) : null}
                  {organization.isActive ? null : <Badge variant="destructive">Neaktivna</Badge>}
                </div>
              </TableCell>
              <TableCell className="text-right tabular-nums">{organization.userCount}</TableCell>
              <TableCell className="text-right tabular-nums">{organization.vehicleCount}</TableCell>
              <TableCell className="text-right tabular-nums">{organization.driverCount}</TableCell>
              <TableCell className="text-right tabular-nums">{organization.tripCount}</TableCell>
              <TableCell className="text-right">
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
                    <DropdownMenuItem onClick={() => onOpen(organization)} className="gap-2">
                      <LogIn className="size-4" aria-hidden />
                      Otvori podatke firme
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(organization)} className="gap-2">
                      <Pencil className="size-4" aria-hidden />
                      Izmeni
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
