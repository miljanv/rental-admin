'use client';

import { driverToolStatusLabel } from '@rental-admin/shared';
import { Hammer } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToolsNeedingOffice } from '@/features/driver-workplace/hooks/use-driver-workplace';
import { formatDate } from '@/lib/format';

/** Tools a driver wrote down, lost or did not receive; handled on the driver's profile. */
export function ToolsNeedingOfficePanel() {
  const query = useToolsNeedingOffice();

  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title="Alat nije učitan"
        retryLabel="Pokušaj ponovo"
        retryingLabel="Učitavanje…"
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  if (!query.data) {
    return <TableSkeleton columns={4} rows={3} />;
  }

  if (query.data.length === 0) {
    return (
      <EmptyState
        icon={Hammer}
        title="Ništa ne čeka kancelariju"
        description="Ovde se pojavljuje alat koji je vozač upisao, izgubio ili nije primio."
      />
    );
  }

  return (
    <Card className="shadow-none">
      <CardContent className="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Vozač</TableHead>
              <TableHead>Alat</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Detalji</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.data.map((tool) => (
              <TableRow key={tool.id}>
                <TableCell>
                  <Link
                    href={`/drivers/${tool.driverId}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {tool.driverName}
                  </Link>
                </TableCell>
                <TableCell>
                  {tool.name} × {tool.quantity}
                  {tool.vehicle ? (
                    <span className="text-muted-foreground"> · {tool.vehicle.licensePlate}</span>
                  ) : null}
                </TableCell>
                <TableCell>
                  <Badge variant={tool.status === 'PENDING' ? 'default' : 'destructive'}>
                    {driverToolStatusLabel(tool)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {tool.status === 'LOST'
                    ? `${tool.lostAt ? formatDate(tool.lostAt) : ''} · ${tool.lostNote ?? ''}`
                    : (tool.note ?? '—')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
