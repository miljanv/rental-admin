'use client';

import type { TripMonthlyPoint } from '@rental-admin/shared';
import { BarChart3 } from 'lucide-react';
import { useState } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { formatKilometers, formatMoney, formatMonthYear } from '@/lib/format';

interface TripMonthlyChartProps {
  monthly: TripMonthlyPoint[];
}

const WIDTH = 720;
const HEIGHT = 260;
const PADDING_LEFT = 36;
const PADDING_RIGHT = 16;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 32;
const PLOT_WIDTH = WIDTH - PADDING_LEFT - PADDING_RIGHT;
const PLOT_HEIGHT = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
const Y_TICK_COUNT = 4;
const BAR_COLOR = 'fill-[#2a78d6] dark:fill-[#3987e5]';

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

/** Single-series bar chart of trip count per month — deliberately one axis, revenue/km live in the tooltip. */
export function TripMonthlyChart({ monthly }: TripMonthlyChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const hasData = monthly.some((point) => point.count > 0);

  if (!hasData) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Nema vožnji u izabranom periodu"
        description="Kreirajte vožnju da biste videli kretanje kroz mesece."
      />
    );
  }

  const maxY = niceCeil(Math.max(1, ...monthly.map((point) => point.count)));
  const bandWidth = monthly.length > 0 ? PLOT_WIDTH / monthly.length : PLOT_WIDTH;
  const barWidth = Math.min(40, bandWidth * 0.5);
  const xCenter = (index: number): number => PADDING_LEFT + bandWidth * (index + 0.5);
  const yScale = (value: number): number => PADDING_TOP + PLOT_HEIGHT - (value / maxY) * PLOT_HEIGHT;
  const yTicks = Array.from({ length: Y_TICK_COUNT + 1 }, (_, index) => Math.round((maxY / Y_TICK_COUNT) * index));

  const hovered = hoverIndex !== null ? monthly[hoverIndex] : undefined;

  return (
    <div className="space-y-3">
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full min-w-[480px]"
          role="img"
          aria-label="Broj vožnji po mesecima"
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
                {tick}
              </text>
            </g>
          ))}

          {monthly.map((point, index) => (
            <text
              key={`label-${point.year}-${point.month}`}
              x={xCenter(index)}
              y={HEIGHT - PADDING_BOTTOM + 18}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {formatMonthYear(point.year, point.month).slice(0, 3)}
            </text>
          ))}

          {monthly.map((point, index) => (
            <rect
              key={`bar-${point.year}-${point.month}`}
              x={xCenter(index) - barWidth / 2}
              y={yScale(point.count)}
              width={barWidth}
              height={Math.max(0, yScale(0) - yScale(point.count))}
              rx={4}
              className={hoverIndex === index ? `${BAR_COLOR} opacity-100` : `${BAR_COLOR} opacity-80`}
              onPointerEnter={() => setHoverIndex(index)}
              onPointerLeave={() => setHoverIndex(null)}
            />
          ))}
        </svg>

        {hovered ? (
          <div
            className="bg-popover text-popover-foreground border-border pointer-events-none absolute top-2 rounded-md border px-3 py-2 text-xs shadow-md"
            style={{
              left: `${Math.min(85, Math.max(2, (xCenter(hoverIndex ?? 0) / WIDTH) * 100))}%`,
            }}
          >
            <p className="text-muted-foreground mb-1 font-medium">{formatMonthYear(hovered.year, hovered.month)}</p>
            <p>{hovered.count} vožnji</p>
            <p>{formatKilometers(hovered.distanceKm)}</p>
            <p>{formatMoney(hovered.revenue)}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
