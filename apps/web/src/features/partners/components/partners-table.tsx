'use client';

import { PARTNER_TYPE_LABELS, partnerFullAddress, type PartnerDto } from '@rental-admin/shared';
import { MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react';
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
import { partnerLabel } from '@/features/partners/lib/partner';

const COLUMN_COUNT = 4;

interface PartnersTableProps {
  partners: PartnerDto[];
  isLoading: boolean;
  hasSearch: boolean;
  onRequestDelete: (partner: PartnerDto) => void;
  emptyAction?: React.ReactNode;
}

export function PartnersTable({
  partners,
  isLoading,
  hasSearch,
  onRequestDelete,
  emptyAction,
}: PartnersTableProps) {
  if (!isLoading && partners.length === 0) {
    return hasSearch ? (
      <EmptyState
        icon={Users}
        title="Nema rezultata"
        description="Nijedan partner ne odgovara pretrazi. Pokušajte sa drugim pojmom."
      />
    ) : (
      <EmptyState
        icon={Users}
        title="Još nema partnera"
        description="Dodajte prvog partnera (naručioca prevoza) da biste mogli da kreirate ugovore."
        action={emptyAction}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Partner</TableHead>
          <TableHead>Tip</TableHead>
          <TableHead>Adresa</TableHead>
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={5} columns={COLUMN_COUNT} />
        ) : (
          partners.map((partner) => (
            <TableRow key={partner.id}>
              <TableCell className="max-w-[280px]">
                <Link href={`/partners/${partner.id}/edit`} className="hover:text-primary block">
                  <span className="block truncate font-medium">{partnerLabel(partner)}</span>
                  {partner.nickname ? (
                    <span className="text-muted-foreground block truncate text-xs">
                      {partner.nickname}
                    </span>
                  ) : null}
                </Link>
              </TableCell>
              <TableCell>{PARTNER_TYPE_LABELS[partner.type]}</TableCell>
              <TableCell className="text-muted-foreground max-w-[280px] truncate">
                {partnerFullAddress(partner)}
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Akcije za ${partnerLabel(partner)}`}
                    >
                      <MoreHorizontal className="size-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem asChild className="gap-2">
                      <Link href={`/partners/${partner.id}/edit`}>
                        <Pencil className="size-4" aria-hidden />
                        Izmeni
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onRequestDelete(partner)}
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
