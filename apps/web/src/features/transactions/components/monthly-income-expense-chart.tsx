'use client';

import type { FinanceMonthlyPoint } from '@rental-admin/shared';
import { LineChart } from 'lucide-react';
import { useRef, useState } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { formatCompactMoney, formatMoney, formatMonthYear } from '@/lib/format';

interface MonthlyIncomeExpenseChartProps {
  monthly: FinanceMonthlyPoint[];
}

const WIDTH = 720;
const HEIGHT = 260;
const PADDING_LEFT = 52;
const PADDING_RIGHT = 16;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 32;
const PLOT_WIDTH = WIDTH - PADDING_LEFT - PADDING_RIGHT;
const PLOT_HEIGHT = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
const Y_TICK_COUNT = 4;

const INCOME_STROKE = 'stroke-[#059669] dark:stroke-[#34d399]';
const INCOME_FILL = 'fill-[#059669] dark:fill-[#34d399]';
const INCOME_BG = 'bg-[#059669] dark:bg-[#34d399]';
const EXPENSE_STROKE = 'stroke-[#e11d48] dark:stroke-[#fb7185]';
const EXPENSE_FILL = 'fill-[#e11d48] dark:fill-[#fb7185]';
const EXPENSE_BG = 'bg-[#e11d48] dark:bg-[#fb7185]';

const niceCeil = (value: number): number => {
  if (value <= 0) {
    return 1;
  }

  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const fraction = value / magnitude;
  const niceFraction = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;

  return niceFraction * magnitude;
};

export function MonthlyIncomeExpenseChart({ monthly }: MonthlyIncomeExpenseChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const hasData = monthly.some((point) => point.income > 0 || point.expense > 0);

  if (!hasData) {
    return (
      <EmptyState
        icon={LineChart}
        title="Nema knjiženja u izabranom periodu"
        description="Unesite prihode i rashode da biste videli kretanje kroz mesece."
      />
    );
  }

  const maxY = niceCeil(Math.max(1, ...monthly.map((point) => Math.max(point.income, point.expense))));
  const xScale = (index: number): number =>
    PADDING_LEFT + (monthly.length === 1 ? PLOT_WIDTH / 2 : (index / (monthly.length - 1)) * PLOT_WIDTH);
  const yScale = (value: number): number => PADDING_TOP + PLOT_HEIGHT - (value / maxY) * PLOT_HEIGHT;
  const yTicks = Array.from({ length: Y_TICK_COUNT + 1 }, (_, index) => (maxY / Y_TICK_COUNT) * index);

  const buildPath = (values: number[]): string =>
    values
      .map((value, index) => `${index === 0 ? 'M' : 'L'}${xScale(index)},${yScale(value)}`)
      .join(' ');

  const handlePointerMove = (event: React.PointerEvent<SVGRectElement>) => {
    const svg = svgRef.current;

    if (!svg || monthly.length === 0) {
      return;
    }

    const rect = svg.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let smallest = Number.POSITIVE_INFINITY;

    monthly.forEach((_, index) => {
      const distance = Math.abs(xScale(index) - pointerX);

      if (distance < smallest) {
        nearest = index;
        smallest = distance;
      }
    });

    setHoverIndex(nearest);
  };

  const hovered = hoverIndex !== null ? monthly[hoverIndex] : undefined;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className={`h-0.5 w-4 ${INCOME_BG}`} />
          <span className="text-muted-foreground">Prihod</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`h-0.5 w-4 ${EXPENSE_BG}`} />
          <span className="text-muted-foreground">Rashod</span>
        </span>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full min-w-[480px]"
          role="img"
          aria-label="Prihod i rashod po mesecima"
        >
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={PADDING_LEFT}
                x2={WIDTH - PADDING_RIGHT}
                y1={yScale(tick)}
                y2={yScale(tick)}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={PADDING_LEFT - 8}
                y={yScale(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {formatCompactMoney(tick)}
              </text>
            </g>
          ))}

          {monthly.map((point, index) => (
            <text
              key={`${point.year}-${point.month}`}
              x={xScale(index)}
              y={HEIGHT - PADDING_BOTTOM + 18}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {formatMonthYear(point.year, point.month).slice(0, 3)}
            </text>
          ))}

          {hoverIndex !== null ? (
            <line
              x1={xScale(hoverIndex)}
              x2={xScale(hoverIndex)}
              y1={PADDING_TOP}
              y2={HEIGHT - PADDING_BOTTOM}
              className="stroke-muted-foreground"
              strokeWidth={1}
              strokeDasharray="3,3"
            />
          ) : null}

          <path
            d={buildPath(monthly.map((point) => point.income))}
            fill="none"
            className={INCOME_STROKE}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <path
            d={buildPath(monthly.map((point) => point.expense))}
            fill="none"
            className={EXPENSE_STROKE}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {monthly.map((point, index) => (
            <g key={`dots-${point.year}-${point.month}`}>
              <circle cx={xScale(index)} cy={yScale(point.income)} r={4} className={`${INCOME_FILL} stroke-card`} strokeWidth={2} />
              <circle cx={xScale(index)} cy={yScale(point.expense)} r={4} className={`${EXPENSE_FILL} stroke-card`} strokeWidth={2} />
            </g>
          ))}

          <rect
            x={PADDING_LEFT}
            y={PADDING_TOP}
            width={PLOT_WIDTH}
            height={PLOT_HEIGHT}
            fill="transparent"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoverIndex(null)}
          />
        </svg>

        {hovered ? (
          <div
            className="bg-popover text-popover-foreground border-border pointer-events-none absolute top-2 rounded-md border px-3 py-2 text-xs shadow-md"
            style={{
              left: `${Math.min(85, Math.max(2, (xScale(hoverIndex ?? 0) / WIDTH) * 100))}%`,
            }}
          >
            <p className="text-muted-foreground mb-1 font-medium">
              {formatMonthYear(hovered.year, hovered.month)}
            </p>
            <p className="flex items-center gap-1.5">
              <span className={`h-0.5 w-3 ${INCOME_BG}`} />
              {formatMoney(hovered.income)}
            </p>
            <p className="flex items-center gap-1.5">
              <span className={`h-0.5 w-3 ${EXPENSE_BG}`} />
              {formatMoney(hovered.expense)}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
