import type { AlarmItemDto } from '@rental-admin/shared';
import { ArrowUpRight, Radar } from 'lucide-react';
import Link from 'next/link';

import { EmptyState } from '@/components/common/empty-state';
import { TableSkeleton } from '@/components/common/table-skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlarmUrgencyBadge } from '@/features/alarms/components/alarm-urgency-badge';
import { formatDate } from '@/lib/format';

const COLUMN_COUNT = 6;

interface AlarmsTableProps {
  items: AlarmItemDto[];
  isLoading: boolean;
  hasFilters: boolean;
}

const daysLabel = (days: number): string => {
  if (days < 0) {
    return `−${Math.abs(days)}`;
  }

  if (days === 0) {
    return 'Danas';
  }

  return `+${days}`;
};

export function AlarmsTable({ items, isLoading, hasFilters }: AlarmsTableProps) {
  if (!isLoading && items.length === 0) {
    return hasFilters ? (
      <EmptyState
        icon={Radar}
        title="Nema rezultata"
        description="Nijedan rok ne odgovara filterima. Promenite tip, vozilo ili hitnost."
      />
    ) : (
      <EmptyState
        icon={Radar}
        title="Još nema rokova"
        description="Unesite dokumente zaposlenih, tehničke preglede, tahograf ili PP aparate da bi se rokovi pojavili ovde."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rok</TableHead>
          <TableHead>Tip</TableHead>
          <TableHead>Subjekt</TableHead>
          <TableHead>Ističe</TableHead>
          <TableHead>Hitnost</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableSkeleton rows={8} columns={COLUMN_COUNT} />
        ) : (
          items.map((item) => {
            const subject = item.driver?.label ?? item.vehicle?.label ?? '—';

            return (
              <TableRow key={item.id}>
                <TableCell className="font-heading text-base font-semibold tabular-nums">
                  {daysLabel(item.daysUntil)}
                </TableCell>
                <TableCell className="max-w-[220px] truncate font-medium">{item.title}</TableCell>
                <TableCell className="text-muted-foreground max-w-[200px] truncate">
                  {subject}
                </TableCell>
                <TableCell className="tabular-nums">{formatDate(item.expiresAt)}</TableCell>
                <TableCell>
                  <AlarmUrgencyBadge urgency={item.urgency} />
                </TableCell>
                <TableCell>
                  <Link
                    href={item.href}
                    className="text-muted-foreground hover:text-foreground inline-flex size-8 items-center justify-center rounded-lg"
                    aria-label={`Otvori ${subject}`}
                  >
                    <ArrowUpRight className="size-4" aria-hidden />
                  </Link>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}
