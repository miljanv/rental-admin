import type { DashboardExpiredItemsDto } from '@rental-admin/shared';
import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/format';

interface DashboardExpiryCardProps {
  title: string;
  description: string;
  data: DashboardExpiredItemsDto;
  icon: LucideIcon;
}

const overdueLabel = (days: number): string => (days === 1 ? 'kasni 1 dan' : `kasni ${days} dana`);

export function DashboardExpiryCard({
  title,
  description,
  data,
  icon: Icon,
}: DashboardExpiryCardProps) {
  return (
    <Card
      size="sm"
      className="relative shadow-[0_16px_36px_-30px_rgba(12,19,21,0.65)] before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-amber-500"
    >
      <CardHeader className="border-b bg-gradient-to-r from-amber-500/[0.06] to-transparent">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="bg-amber-500/10 text-amber-700 ring-amber-500/15 dark:text-amber-300 flex size-9 shrink-0 items-center justify-center rounded-lg shadow-sm ring-1">
              <Icon className="size-4.5" aria-hidden />
            </span>
            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription className="line-clamp-1 text-xs">{description}</CardDescription>
            </div>
          </div>
          <div className="rounded-xl bg-amber-500/10 px-3 py-1.5 text-right ring-1 ring-amber-500/15">
            <p className="font-heading text-2xl font-semibold tabular-nums">{data.total}</p>
            <p className="text-muted-foreground text-xs">isteklo</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {data.items.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center text-sm">
            Nema isteklih aktivnosti.
          </p>
        ) : (
          <ol className="space-y-1">
            {data.items.map((item, index) => (
              <li key={`${item.kind}:${item.id}`}>
                <Link
                  href={item.href}
                  className="group flex items-center gap-2 rounded-md border border-transparent bg-muted/25 px-2 py-1.5 transition-colors hover:border-amber-500/15 hover:bg-amber-500/[0.055] focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="text-muted-foreground w-4 shrink-0 text-right text-xs tabular-nums">
                    {index + 1}.
                  </span>
                  <p className="min-w-0 flex-1 truncate text-xs font-medium sm:text-sm">
                    {item.subject}
                    <span className="text-muted-foreground font-normal">
                      {' '}
                      · {item.title} · {formatDate(item.expiresAt)}
                    </span>
                  </p>
                  <div className="flex shrink-0 items-center gap-1 text-right">
                    <span className="text-destructive text-xs font-semibold tabular-nums">
                      {overdueLabel(item.daysOverdue)}
                    </span>
                    <ArrowUpRight
                      className="text-muted-foreground size-3.5 opacity-0 transition-opacity group-hover:opacity-100"
                      aria-hidden
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
