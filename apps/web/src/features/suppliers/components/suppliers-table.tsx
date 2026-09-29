'use client';

import type { SupplierDto } from '@rental-admin/shared';
import { MoreHorizontal, Pencil, Store, Trash2 } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/common/empty-state';
import { TableSkeleton } from '@/components/common/table-skeleton';
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

const COLUMN_COUNT = 5;

interface SuppliersTableProps {
  suppliers: SupplierDto[];
  isLoading: boolean;
  hasSearch: boolean;
  onRequestDelete: (supplier: SupplierDto) => void;
  emptyAction?: React.ReactNode;
}

const fullAddress = (supplier: SupplierDto): string =>
  [supplier.address, supplier.city].filter(Boolean).join(', ');

export function SuppliersTable({
  suppliers,
  isLoading,
  hasSearch,
  onRequestDelete,
  emptyAction,
}: SuppliersTableProps) {
  if (!isLoading && suppliers.length === 0) {
    return hasSearch ? (
      <EmptyState
        icon={Store}
        title="Nema rezultata"
        description="Nijedan dobavljač ne odgovara pretrazi. Pokušajte sa drugim pojmom."
      />
    ) : (
      <EmptyState
        icon={Store}
        title="Još nema dobavljača"
        description="Dodajte prvog dobavljača da bi se pojavljivao u unosu goriva, troškova i finansija."
        action={emptyAction}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Dobavljač</TableHead>
          <TableHead>Kontakt</TableHead>
          <TableHead>PIB</TableHead>
          <TableHead>Adresa</TableHead>
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={5} columns={COLUMN_COUNT} />
        ) : (
          suppliers.map((supplier) => (
            <TableRow key={supplier.id}>
              <TableCell className="max-w-[260px]">
                <Link href={`/suppliers/${supplier.id}/edit`} className="hover:text-primary block">
                  <span className="block truncate font-medium">{supplier.name}</span>
                  {supplier.note ? (
                    <span className="text-muted-foreground block truncate text-xs">
                      {supplier.note}
                    </span>
                  ) : null}
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[220px]">
                <span className="block truncate">{supplier.email ?? supplier.phone ?? '—'}</span>
                {supplier.email && supplier.phone ? (
                  <span className="block truncate text-xs">{supplier.phone}</span>
                ) : null}
              </TableCell>
              <TableCell>{supplier.pib ?? '—'}</TableCell>
              <TableCell className="text-muted-foreground max-w-[240px] truncate">
                {fullAddress(supplier) || '—'}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label={`Akcije za ${supplier.name}`}>
                      <MoreHorizontal className="size-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem asChild className="gap-2">
                      <Link href={`/suppliers/${supplier.id}/edit`}>
                        <Pencil className="size-4" aria-hidden />
                        Izmeni
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onRequestDelete(supplier)}
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
