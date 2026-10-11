'use client';

import type { DashboardOpenItemsDto, SettlementTargetDto } from '@rental-admin/shared';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate, formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

interface DashboardFinanceCardProps {
  title: string;
  description: string;
  modalDescription: string;
  data: DashboardOpenItemsDto;
  icon: LucideIcon;
  tone: 'income' | 'expense';
}

function TopOpenItems({ items }: { items: SettlementTargetDto[] }) {
  if (items.length === 0) {
    return <p className="text-muted-foreground py-8 text-center text-sm">Nema otvorenih stavki.</p>;
  }

  return (
    <ol className="space-y-1">
      {items.slice(0, 5).map((item, index) => (
        <li
          key={`${item.targetType}:${item.targetId}`}
          className="flex items-center gap-2 rounded-md border border-transparent bg-muted/35 px-2 py-1.5 transition-colors hover:border-foreground/10 hover:bg-muted/60"
        >
          <span className="text-muted-foreground w-4 shrink-0 text-right text-xs tabular-nums">
            {index + 1}.
          </span>
          <p className="min-w-0 flex-1 truncate text-xs font-medium sm:text-sm">
            {item.counterparty}
            <span className="text-muted-foreground font-normal"> · {item.label}</span>
          </p>
          <span className="shrink-0 text-sm font-semibold tabular-nums">
            {formatMoney(item.remainingAmount)}
          </span>
        </li>
      ))}
    </ol>
  );
}

export function DashboardFinanceCard({
  title,
  description,
  modalDescription,
  data,
  icon: Icon,
  tone,
}: DashboardFinanceCardProps) {
  const [open, setOpen] = useState(false);
  const toneClass =
    tone === 'income'
      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : 'bg-rose-500/10 text-rose-700 dark:text-rose-300';
  const accentClass = tone === 'income' ? 'before:bg-emerald-500' : 'before:bg-rose-500';
  const metricClass =
    tone === 'income'
      ? 'bg-emerald-500/[0.07] ring-emerald-500/15'
      : 'bg-rose-500/[0.07] ring-rose-500/15';

  return (
    <>
      <Card
        size="sm"
        className={cn(
          'relative shadow-[0_16px_36px_-30px_rgba(12,19,21,0.65)] before:absolute before:inset-y-0 before:left-0 before:w-1',
          accentClass,
        )}
      >
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <span
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-lg shadow-sm ring-1 ring-current/10',
                toneClass,
              )}
            >
              <Icon className="size-4.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <CardTitle>
                <button
                  type="button"
                  onClick={() => setOpen(true)}
                  className="group/title inline-flex items-center gap-1.5 text-left hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  {title}
                  <ArrowUpRight
                    className="text-muted-foreground size-4 transition-transform group-hover/title:translate-x-0.5 group-hover/title:-translate-y-0.5"
                    aria-hidden
                  />
                </button>
              </CardTitle>
              <CardDescription className="line-clamp-1 text-xs">{description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className={cn('min-w-0 rounded-lg p-3 ring-1', metricClass)}>
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Ukupno
            </p>
            <p
              className="font-heading mt-1 overflow-hidden text-xl leading-tight font-semibold tracking-tight text-ellipsis whitespace-nowrap tabular-nums 2xl:text-2xl"
              title={formatMoney(data.total)}
            >
              {formatMoney(data.total)}
            </p>
            <p className="text-muted-foreground mt-1 text-xs">
              {data.count} {data.count === 1 ? 'otvorena stavka' : 'otvorenih stavki'}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1.5 text-xs font-medium tracking-wide uppercase">
              Top 5
            </p>
            <TopOpenItems items={data.items} />
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {modalDescription} Ukupno {formatMoney(data.total)} kroz {data.count} stavki.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-auto border-t px-4 pb-4">
            {data.items.length === 0 ? (
              <p className="text-muted-foreground py-14 text-center text-sm">
                Nema otvorenih stavki.
              </p>
            ) : (
              <Table>
                <TableHeader className="bg-popover sticky top-0 z-10">
                  <TableRow>
                    <TableHead>Partner / dobavljač</TableHead>
                    <TableHead>Dokument</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead className="text-right">Ukupno</TableHead>
                    <TableHead className="text-right">Plaćeno</TableHead>
                    <TableHead className="text-right">Preostalo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((item) => (
                    <TableRow key={`${item.targetType}:${item.targetId}`}>
                      <TableCell className="max-w-48 truncate font-medium">
                        {item.counterparty}
                      </TableCell>
                      <TableCell className="max-w-72 truncate">{item.label}</TableCell>
                      <TableCell>{formatDate(item.issuedAt)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(item.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatMoney(item.allocatedAmount)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatMoney(item.remainingAmount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
