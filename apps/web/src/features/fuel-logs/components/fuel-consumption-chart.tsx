'use client';

import { FUEL_LOG_FUEL_TYPE_LABELS, type FuelLogDto } from '@rental-admin/shared';
import { LineChart } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

import { EmptyState } from '@/components/common/empty-state';
import { formatDate } from '@/lib/format';

interface FuelConsumptionChartProps {
  fuelLogs: FuelLogDto[];
}

interface ChartPoint {
  x: number;
  y: number;
  dateIso: string;
}

const WIDTH = 720;
const HEIGHT = 260;
const PADDING_LEFT = 44;
const PADDING_RIGHT = 16;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 32;
const PLOT_WIDTH = WIDTH - PADDING_LEFT - PADDING_RIGHT;
const PLOT_HEIGHT = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
const X_TICK_COUNT = 5;
const Y_TICK_COUNT = 4;

// Categorical slots 1 (blue) and 2 (orange) from the validated palette —
// adjacent-pair CVD ΔE 9.1 light / 8.4 dark, clear of the ≥8 target.
// Every variant is written out literally (not derived via string
// replacement) because Tailwind's JIT scanner only picks up class names that
// appear verbatim in source — a runtime-built class name is never generated.
const DIESEL_STROKE = 'stroke-[#2a78d6] dark:stroke-[#3987e5]';
const DIESEL_FILL = 'fill-[#2a78d6] dark:fill-[#3987e5]';
const DIESEL_BG = 'bg-[#2a78d6] dark:bg-[#3987e5]';
const ADBLUE_STROKE = 'stroke-[#eb6834] dark:stroke-[#d95926]';
const ADBLUE_FILL = 'fill-[#eb6834] dark:fill-[#d95926]';
const ADBLUE_BG = 'bg-[#eb6834] dark:bg-[#d95926]';

/** Rounds up to a clean step (1/2/5 × 10^n) so axis ticks read as whole numbers. */
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

const toPoints = (fuelLogs: FuelLogDto[]): ChartPoint[] =>
  fuelLogs
    .filter((log) => log.consumptionPer100Km !== null)
    .map((log) => ({
      x: Date.parse(log.fueledAt),
      y: log.consumptionPer100Km as number,
      dateIso: log.fueledAt,
    }))
    .sort((a, b) => a.x - b.x);

export function FuelConsumptionChart({ fuelLogs }: FuelConsumptionChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const dieselPoints = useMemo(
    () => toPoints(fuelLogs.filter((log) => log.fuelType === 'DIESEL')),
    [fuelLogs],
  );
  const adbluePoints = useMemo(
    () => toPoints(fuelLogs.filter((log) => log.fuelType === 'ADBLUE')),
    [fuelLogs],
  );

  const allTimestamps = useMemo(
    () => Array.from(new Set([...dieselPoints, ...adbluePoints].map((p) => p.x))).sort((a, b) => a - b),
    [dieselPoints, adbluePoints],
  );

  if (allTimestamps.length === 0) {
    return (
      <EmptyState
        icon={LineChart}
        title="Nema dovoljno podataka za grafikon"
        description="Potrebna su bar dva točenja istog vozila da bi se izračunala potrošnja."
      />
    );
  }

  const minX = allTimestamps[0] as number;
  const maxX = allTimestamps[allTimestamps.length - 1] as number;
  const maxY = niceCeil(Math.max(1, ...dieselPoints.map((p) => p.y), ...adbluePoints.map((p) => p.y)));

  const xScale = (timestamp: number): number =>
    PADDING_LEFT + (maxX === minX ? PLOT_WIDTH / 2 : ((timestamp - minX) / (maxX - minX)) * PLOT_WIDTH);
  const yScale = (value: number): number => PADDING_TOP + PLOT_HEIGHT - (value / maxY) * PLOT_HEIGHT;

  const buildPath = (points: ChartPoint[]): string =>
    points.map((point, index) => `${index === 0 ? 'M' : 'L'}${xScale(point.x)},${yScale(point.y)}`).join(' ');

  const yTicks = Array.from({ length: Y_TICK_COUNT + 1 }, (_, index) => (maxY / Y_TICK_COUNT) * index);

  const xTickTimestamps =
    allTimestamps.length <= X_TICK_COUNT
      ? allTimestamps
      : Array.from({ length: X_TICK_COUNT }, (_, index) => minX + ((maxX - minX) / (X_TICK_COUNT - 1)) * index);

  const nearestTimestamp = (pointerX: number): number => {
    let nearest = allTimestamps[0] as number;
    let smallestDistance = Math.abs(xScale(nearest) - pointerX);

    for (const timestamp of allTimestamps) {
      const distance = Math.abs(xScale(timestamp) - pointerX);

      if (distance < smallestDistance) {
        nearest = timestamp;
        smallestDistance = distance;
      }
    }

    return nearest;
  };

  const handlePointerMove = (event: React.PointerEvent<SVGRectElement>) => {
    const svg = svgRef.current;

    if (!svg) {
      return;
    }

    const rect = svg.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width) * WIDTH;
    setHoverX(nearestTimestamp(pointerX));
  };

  const hoveredDiesel = hoverX !== null ? dieselPoints.find((p) => p.x === hoverX) : undefined;
  const hoveredAdblue = hoverX !== null ? adbluePoints.find((p) => p.x === hoverX) : undefined;
  const tooltipDateIso = hoveredDiesel?.dateIso ?? hoveredAdblue?.dateIso;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className={`h-0.5 w-4 ${DIESEL_BG}`} />
          <span className="text-muted-foreground">{FUEL_LOG_FUEL_TYPE_LABELS.DIESEL}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`h-0.5 w-4 ${ADBLUE_BG}`} />
          <span className="text-muted-foreground">{FUEL_LOG_FUEL_TYPE_LABELS.ADBLUE}</span>
        </span>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full min-w-[480px]"
          role="img"
          aria-label="Grafikon potrošnje goriva kroz vreme"
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
                {tick.toFixed(tick < 10 ? 1 : 0)}
              </text>
            </g>
          ))}

          {xTickTimestamps.map((timestamp) => (
            <text
              key={timestamp}
              x={xScale(timestamp)}
              y={HEIGHT - PADDING_BOTTOM + 18}
              textAnchor="middle"
              className="fill-muted-foreground text-[10px]"
            >
              {formatDate(new Date(timestamp).toISOString())}
            </text>
          ))}

          {hoverX !== null ? (
            <line
              x1={xScale(hoverX)}
              x2={xScale(hoverX)}
              y1={PADDING_TOP}
              y2={HEIGHT - PADDING_BOTTOM}
              className="stroke-muted-foreground"
              strokeWidth={1}
              strokeDasharray="3,3"
            />
          ) : null}

          {dieselPoints.length > 0 ? (
            <path d={buildPath(dieselPoints)} fill="none" className={DIESEL_STROKE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ) : null}
          {adbluePoints.length > 0 ? (
            <path d={buildPath(adbluePoints)} fill="none" className={ADBLUE_STROKE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          ) : null}

          {dieselPoints.map((point) => (
            <circle
              key={`diesel-${point.dateIso}-${point.x}`}
              cx={xScale(point.x)}
              cy={yScale(point.y)}
              r={4}
              className={`${DIESEL_FILL} stroke-card`}
              strokeWidth={2}
            />
          ))}
          {adbluePoints.map((point) => (
            <circle
              key={`adblue-${point.dateIso}-${point.x}`}
              cx={xScale(point.x)}
              cy={yScale(point.y)}
              r={4}
              className={`${ADBLUE_FILL} stroke-card`}
              strokeWidth={2}
            />
          ))}

          <rect
            x={PADDING_LEFT}
            y={PADDING_TOP}
            width={PLOT_WIDTH}
            height={PLOT_HEIGHT}
            fill="transparent"
            onPointerMove={handlePointerMove}
            onPointerLeave={() => setHoverX(null)}
          />
        </svg>

        {hoverX !== null && tooltipDateIso ? (
          <div
            className="bg-popover text-popover-foreground border-border pointer-events-none absolute top-2 rounded-md border px-3 py-2 text-xs shadow-md"
            style={{
              left: `${Math.min(85, Math.max(2, (xScale(hoverX) / WIDTH) * 100))}%`,
            }}
          >
            <p className="text-muted-foreground mb-1 font-medium">{formatDate(tooltipDateIso)}</p>
            {hoveredDiesel ? (
              <p className="flex items-center gap-1.5">
                <span className={`h-0.5 w-3 ${DIESEL_BG}`} />
                <span className="font-medium">{hoveredDiesel.y.toLocaleString('sr-RS')} L/100km</span>
                <span className="text-muted-foreground">{FUEL_LOG_FUEL_TYPE_LABELS.DIESEL}</span>
              </p>
            ) : null}
            {hoveredAdblue ? (
              <p className="flex items-center gap-1.5">
                <span className={`h-0.5 w-3 ${ADBLUE_BG}`} />
                <span className="font-medium">{hoveredAdblue.y.toLocaleString('sr-RS')} L/100km</span>
                <span className="text-muted-foreground">{FUEL_LOG_FUEL_TYPE_LABELS.ADBLUE}</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
