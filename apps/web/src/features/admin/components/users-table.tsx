'use client';

import { USER_ROLE_LABELS, type ManagedUserDto } from '@rental-admin/shared';
import { MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react';

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

interface UsersTableProps {
  users: ManagedUserDto[];
  isLoading: boolean;
  isFiltered: boolean;
  currentUserId: string;
  onEdit: (user: ManagedUserDto) => void;
  onRequestDelete: (user: ManagedUserDto) => void;
  emptyAction?: React.ReactNode;
}

export function UsersTable({
  users,
  isLoading,
  isFiltered,
  currentUserId,
  onEdit,
  onRequestDelete,
  emptyAction,
}: UsersTableProps) {
  if (!isLoading && users.length === 0) {
    return isFiltered ? (
      <EmptyState
        icon={Users}
        title="Nema korisnika"
        description="Izabrana firma još nema nijednog korisnika."
        action={emptyAction}
      />
    ) : (
      <EmptyState
        icon={Users}
        title="Još nema korisnika"
        description="Dodajte prvog korisnika i vežite ga za firmu."
        action={emptyAction}
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Korisnik</TableHead>
          <TableHead>Uloga</TableHead>
          <TableHead>Firma</TableHead>
          <TableHead className="text-right">Kreirao vozila</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[60px] text-right">Akcije</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={4} columns={COLUMN_COUNT} />
        ) : (
          users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="max-w-[260px] truncate font-medium">
                {user.username}
                {user.id === currentUserId ? (
                  <span className="text-muted-foreground ml-2 text-xs font-normal">(vi)</span>
                ) : null}
              </TableCell>
              <TableCell>
                <Badge variant={user.role === 'SUPERADMIN' ? 'default' : 'secondary'}>
                  {USER_ROLE_LABELS[user.role]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {user.organizationName ?? '—'}
              </TableCell>
              <TableCell className="text-right tabular-nums">{user.vehiclesCreated}</TableCell>
              <TableCell>
                <Badge variant={user.isActive ? 'outline' : 'destructive'}>
                  {user.isActive ? 'Aktivan' : 'Deaktiviran'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Akcije za korisnika ${user.username}`}
                    >
                      <MoreHorizontal className="size-4" aria-hidden />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => onEdit(user)} className="gap-2">
                      <Pencil className="size-4" aria-hidden />
                      Izmeni
                    </DropdownMenuItem>
                    {user.id === currentUserId ? null : (
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={() => onRequestDelete(user)}
                        className="gap-2"
                      >
                        <Trash2 className="size-4" aria-hidden />
                        Obriši
                      </DropdownMenuItem>
                    )}
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
