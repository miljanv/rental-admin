'use client';

import type { LucideIcon } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';

interface RankedItem {
  id: string;
  label: string;
  count: number;
}

interface TripRankedListProps {
  items: RankedItem[];
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
}

/** Simple label + count + relative bar list, used for top routes and top partners. */
export function TripRankedList({ items, emptyIcon, emptyTitle, emptyDescription }: TripRankedListProps) {
  if (items.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />;
  }

  const maxCount = Math.max(...items.map((item) => item.count));

  return (
    <div className="space-y-3 px-6 pb-6">
      {items.map((item) => (
        <div key={item.id} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate pr-2">{item.label}</span>
            <span className="text-muted-foreground shrink-0">{item.count}</span>
          </div>
          <div className="bg-muted h-2 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full"
              style={{ width: `${maxCount > 0 ? (item.count / maxCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
