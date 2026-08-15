'use client';

import { contractClientDisplayName, type ContractDto } from '@rental-admin/shared';
import { FileText, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
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
import { ContractStatusBadge } from '@/features/contracts/components/contract-status-badge';
import { formatDate } from '@/lib/format';

const COLUMN_COUNT = 5;

interface ContractsTableProps {
  contracts: ContractDto[];
  isLoading: boolean;
  hasFilters: boolean;
  onRequestDelete: (contract: ContractDto) => void;
  emptyAction?: React.ReactNode;
}

export function ContractsTable({
  contracts,
  isLoading,
  hasFilters,
  onRequestDelete,
  emptyAction,
}: ContractsTableProps) {
  if (!isLoading && contracts.length === 0) {
    return hasFilters ? (
      <EmptyState
        icon={FileText}
        title="Nema rezultata"
        description="Nijedan ugovor ne odgovara filterima. Pokušajte sa drugim kriterijumima."
      />
    ) : (
      <EmptyState
        icon={FileText}
        title="Još nema ugovora"
        description="Kreirajte prvi ugovor o prevozu putnika."
        action={emptyAction}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Naručilac / relacija</TableHead>
          <TableHead>Period usluge</TableHead>
          <TableHead>Cena</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={5} columns={COLUMN_COUNT} />
        ) : (
          contracts.map((contract) => (
            <TableRow key={contract.id}>
              <TableCell className="max-w-[280px]">
                <Link href={`/contracts/${contract.id}`} className="hover:text-primary block">
                  <span className="block truncate font-medium">
                    {contractClientDisplayName(contract)}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {contract.route}
                  </span>
                </Link>
              </TableCell>
              <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                {formatDate(contract.serviceStartDate)} – {formatDate(contract.serviceEndDate)}
              </TableCell>
              <TableCell className="text-muted-foreground tabular-nums">
                {contract.price.toLocaleString('sr-RS')} RSD
              </TableCell>
              <TableCell>
                <ContractStatusBadge status={contract.status} />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Akcije za ugovor ${contract.route}`}
                    >
                      <MoreHorizontal className="size-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem asChild className="gap-2">
                      <Link href={`/contracts/${contract.id}`}>
                        <FileText className="size-4" aria-hidden />
                        Detalji
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="gap-2">
                      <Link href={`/contracts/${contract.id}/edit`}>
                        <Pencil className="size-4" aria-hidden />
                        Izmeni
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => onRequestDelete(contract)}
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
