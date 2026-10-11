import { TRIP_STATUS_LABELS, type DashboardTodayTripsDto } from '@rental-admin/shared';
import { BusFront, CalendarDays } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate } from '@/lib/format';

interface DashboardTodayTripsProps {
  date: string;
  data: DashboardTodayTripsDto;
}

const joined = (values: string[]): string => (values.length > 0 ? values.join(', ') : '—');

export function DashboardTodayTrips({ date, data }: DashboardTodayTripsProps) {
  return (
    <Card className="relative shadow-[0_16px_36px_-30px_rgba(12,19,21,0.65)] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-primary before:via-accent before:to-transparent">
      <CardHeader className="border-b bg-gradient-to-r from-primary/[0.055] via-accent/[0.035] to-transparent sm:grid-cols-[1fr_auto] sm:items-start">
        <div className="flex items-start gap-3">
          <span className="bg-primary/10 text-primary ring-primary/15 flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1">
            <CalendarDays className="size-5" aria-hidden />
          </span>
          <div>
            <CardTitle>Današnje vožnje</CardTitle>
            <CardDescription>
              {formatDate(date)} · 10 redova je vidljivo, ostali su u skrolu
            </CardDescription>
          </div>
        </div>
        <div className="mt-3 rounded-xl bg-background/65 px-4 py-2 text-left ring-1 ring-foreground/8 sm:mt-0 sm:text-right">
          <p className="font-heading text-4xl font-semibold tracking-tight tabular-nums">
            {data.total}
          </p>
          <p className="text-muted-foreground text-xs">ukupno danas</p>
        </div>
      </CardHeader>
      <CardContent>
        {data.items.length === 0 ? (
          <div className="text-muted-foreground flex min-h-36 flex-col items-center justify-center gap-2 text-center text-sm">
            <BusFront className="size-8 opacity-50" aria-hidden />
            Danas nema zakazanih vožnji.
          </div>
        ) : (
          <div className="max-h-[520px] overflow-y-auto rounded-lg border">
            <Table>
              <TableHeader className="bg-muted sticky top-0 z-10">
                <TableRow>
                  <TableHead>RN broj</TableHead>
                  <TableHead>Relacija</TableHead>
                  <TableHead>Kupac</TableHead>
                  <TableHead>Vozilo</TableHead>
                  <TableHead>Vozač</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((trip) => (
                  <TableRow
                    key={trip.id}
                    className="h-12 transition-colors hover:bg-accent/[0.055]"
                  >
                    <TableCell>
                      <Link href={`/trips/${trip.id}`} className="font-medium hover:underline">
                        {trip.referenceNumber ?? 'Bez RN broja'}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-64 truncate">{trip.route}</TableCell>
                    <TableCell className="max-w-52 truncate">{trip.client}</TableCell>
                    <TableCell className="font-mono text-xs">{joined(trip.vehicles)}</TableCell>
                    <TableCell>{joined(trip.drivers)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{TRIP_STATUS_LABELS[trip.status]}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
