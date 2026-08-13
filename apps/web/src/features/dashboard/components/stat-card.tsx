import type { LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StatCardProps {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  isLoading?: boolean;
}

export function StatCard({ label, value, hint, icon: Icon, isLoading = false }: StatCardProps) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <p className="text-muted-foreground text-sm font-medium">{label}</p>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="truncate text-3xl font-semibold tracking-tight">{value}</p>
          )}
          <p className="text-muted-foreground text-xs">{hint}</p>
        </div>
        <span className="bg-muted text-muted-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Icon className="size-4.5" aria-hidden />
        </span>
      </CardContent>
    </Card>
  );
}
