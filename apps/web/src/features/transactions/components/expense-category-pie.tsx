'use client';

import {
  TRANSACTION_CATEGORY_LABELS,
  type FinanceCategoryBreakdown,
  type TransactionCategory,
} from '@rental-admin/shared';
import { PieChart } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { formatMoney } from '@/lib/format';

interface ExpenseCategoryPieProps {
  byCategory: FinanceCategoryBreakdown[];
}

const SIZE = 220;
const CX = SIZE / 2;
const CY = SIZE / 2;
const RADIUS = 84;

const CATEGORY_FILL: Record<TransactionCategory, string> = {
  CONTRACT: 'fill-[#2a78d6] dark:fill-[#3987e5]',
  FUEL: 'fill-[#eb6834] dark:fill-[#d95926]',
  PARTS: 'fill-[#7c3aed] dark:fill-[#a78bfa]',
  TECHNICAL_INSPECTION: 'fill-[#0f766e] dark:fill-[#2dd4bf]',
  TACHOGRAPH: 'fill-[#ca8a04] dark:fill-[#facc15]',
  FIRE_EXTINGUISHER: 'fill-[#be123c] dark:fill-[#fb7185]',
  SALARY: 'fill-[#0369a1] dark:fill-[#38bdf8]',
  OTHER: 'fill-[#57534e] dark:fill-[#a8a29e]',
};

const CATEGORY_BG: Record<TransactionCategory, string> = {
  CONTRACT: 'bg-[#2a78d6] dark:bg-[#3987e5]',
  FUEL: 'bg-[#eb6834] dark:bg-[#d95926]',
  PARTS: 'bg-[#7c3aed] dark:bg-[#a78bfa]',
  TECHNICAL_INSPECTION: 'bg-[#0f766e] dark:bg-[#2dd4bf]',
  TACHOGRAPH: 'bg-[#ca8a04] dark:bg-[#facc15]',
  FIRE_EXTINGUISHER: 'bg-[#be123c] dark:bg-[#fb7185]',
  SALARY: 'bg-[#0369a1] dark:bg-[#38bdf8]',
  OTHER: 'bg-[#57534e] dark:bg-[#a8a29e]',
};

const polar = (angleDeg: number): { x: number; y: number } => {
  const angle = ((angleDeg - 90) * Math.PI) / 180;

  return { x: CX + RADIUS * Math.cos(angle), y: CY + RADIUS * Math.sin(angle) };
};

const slicePath = (startAngle: number, endAngle: number): string => {
  const start = polar(startAngle);
  const end = polar(endAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return `M ${CX} ${CY} L ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
};

export function ExpenseCategoryPie({ byCategory }: ExpenseCategoryPieProps) {
  const total = byCategory.reduce((sum, item) => sum + item.expense, 0);

  if (total <= 0) {
    return (
      <EmptyState
        icon={PieChart}
        title="Nema rashoda u periodu"
        description="Rashodi po kategoriji pojaviće se ovde kad se knjiže točenja, delovi ili ručni unosi."
      />
    );
  }

  const slices = byCategory
    .filter((item) => item.expense > 0)
    .reduce<
      Array<FinanceCategoryBreakdown & { startAngle: number; endAngle: number; share: number }>
    >((acc, item) => {
      const start = acc.at(-1)?.endAngle ?? 0;
      const end = start + (item.expense / total) * 360;

      return [...acc, { ...item, startAngle: start, endAngle: end, share: item.expense / total }];
    }, []);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-44 shrink-0" role="img" aria-label="Rashodi po kategoriji">
        {slices.length === 1 ? (
          <circle cx={CX} cy={CY} r={RADIUS} className={CATEGORY_FILL[slices[0]?.category ?? 'OTHER']} />
        ) : (
          slices.map((slice) => (
            <path
              key={slice.category}
              d={slicePath(slice.startAngle, slice.endAngle)}
              className={CATEGORY_FILL[slice.category]}
            />
          ))
        )}
      </svg>

      <ul className="w-full space-y-2 text-sm">
        {slices.map((slice) => (
          <li key={slice.category} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <span className={`size-2.5 shrink-0 rounded-full ${CATEGORY_BG[slice.category]}`} />
              <span className="truncate">{TRANSACTION_CATEGORY_LABELS[slice.category]}</span>
            </span>
            <span className="text-muted-foreground shrink-0">
              {formatMoney(slice.expense)} · {Math.round(slice.share * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
