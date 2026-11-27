'use client';

import type {
  DriverPortalVehicleDto,
  DriverReportWriteInput,
  DriverReportWriteRequest,
} from '@rental-admin/shared';
import { Check } from 'lucide-react';
import { type UseFormReturn, useWatch } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { PortalCard, PortalChip } from '@/features/driver-portal/components/portal-ui';
import { KM_STEP_FIELDS, formatKm, kmReadingIssues } from '@/features/driver-portal/lib/portal';
import { cn } from '@/lib/utils';

type KmField = (typeof KM_STEP_FIELDS)[number];

/** The vehicle's day in order, as on the paper travel order. */
const STEP_LABELS: Record<KmField, string> = {
  garageStartKm: 'Izlazak iz garaže',
  startKm: 'Polazak sa putnicima',
  endKm: 'Ostavljanje putnika',
  garageEndKm: 'Povratak u garažu',
};

const reading = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const span = (start: number | null, end: number | null): number | null =>
  start !== null && end !== null && end >= start ? end - start : null;

interface PortalKmCardProps {
  form: UseFormReturn<DriverReportWriteInput, unknown, DriverReportWriteRequest>;
  index: number;
  vehicle: DriverPortalVehicleDto;
  /** Show the plate in the title when the trip has more than one vehicle. */
  showPlate: boolean;
  disabled: boolean;
}

/** Four odometer readings for one vehicle as a timeline: done, current, still to come. */
export function PortalKmCard({ form, index, vehicle, showPlate, disabled }: PortalKmCardProps) {
  const values = useWatch({ control: form.control, name: `vehicles.${index}` });
  const errors = form.formState.errors.vehicles?.[index];
  const readings = KM_STEP_FIELDS.map((field) => reading(values?.[field]));
  const liveIssues = kmReadingIssues(values, vehicle.minKm);
  const filled = readings.filter((value) => value !== null).length;
  const currentStep = readings.findIndex((value) => value === null);
  const [garageStart = null, start = null, end = null, garageEnd = null] = readings;
  const total = span(garageStart, garageEnd);
  const withPassengers = span(start, end);
  const emptyRun =
    (span(garageStart, start) ?? 0) + (span(end, garageEnd) ?? 0) > 0
      ? (span(garageStart, start) ?? 0) + (span(end, garageEnd) ?? 0)
      : null;

  return (
    <PortalCard className="p-[18px]">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-base font-bold">
          Kilometraža{showPlate ? ` · ${vehicle.licensePlate}` : ''}
        </h2>
        <span className="text-muted-foreground text-[13px]">{filled} od 4 uneto</span>
      </div>
      {vehicle.lastKnownKm !== null ? (
        <p className="text-muted-foreground mt-1.5 text-[13px]">
          Poslednje poznato stanje vozila: {formatKm(vehicle.lastKnownKm)}
        </p>
      ) : null}

      <ol className="mt-[18px] flex flex-col">
        {KM_STEP_FIELDS.map((field, step) => {
          const value = readings[step] ?? null;
          const done = value !== null;
          const current = step === currentStep;
          const previous =
            readings
              .slice(0, step)
              .filter((item): item is number => item !== null)
              .at(-1) ?? null;
          const isLast = step === KM_STEP_FIELDS.length - 1;
          const inputId = `${field}-${vehicle.id}`;
          const error = liveIssues[field] ?? errors?.[field]?.message;
          let hint: React.ReactNode = null;

          if (step === 0 && done && vehicle.lastKnownKm !== null) {
            const jump = value - vehicle.lastKnownKm;
            hint =
              jump !== 0 ? (
                <PortalChip tone={jump < 0 ? 'red' : 'amber'} className="mt-1.5">
                  {jump > 0 ? '+' : ''}
                  {formatKm(jump)} od poslednjeg unosa
                </PortalChip>
              ) : null;
          } else if (step === 1 && done && garageStart !== null && value >= garageStart) {
            hint = (
              <p className="text-muted-foreground mt-1 text-xs">
                {formatKm(value - garageStart)} do postavke
              </p>
            );
          } else if (!done && previous !== null) {
            hint = (
              <p className="text-muted-foreground mt-1.5 text-xs">
                Mora biti veće od {formatKm(previous)}
              </p>
            );
          }

          return (
            <li key={field} className="flex gap-3.5">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                    done && 'bg-green-700 text-white',
                    !done && current && 'border-primary text-primary bg-card border-[2.5px]',
                    !done && !current && 'bg-muted text-muted-foreground',
                  )}
                  aria-hidden
                >
                  {done ? <Check className="size-3.5" strokeWidth={3} /> : step + 1}
                </span>
                {isLast ? null : (
                  <span
                    className={cn(
                      'min-h-5 w-0.5 flex-1',
                      done && readings[step + 1] !== null ? 'bg-green-700' : 'bg-border',
                    )}
                  />
                )}
              </div>
              <div className={cn('min-w-0 flex-1', !isLast && 'pb-[18px]')}>
                <label
                  htmlFor={inputId}
                  className={cn(
                    'block text-xs',
                    current ? 'text-foreground font-semibold' : 'text-muted-foreground',
                  )}
                >
                  {step + 1} · {STEP_LABELS[field]}
                </label>
                <Input
                  id={inputId}
                  type="number"
                  inputMode="numeric"
                  min={vehicle.minKm ?? undefined}
                  placeholder={previous !== null ? `npr. ${previous + 1}` : 'stanje km sata'}
                  disabled={disabled}
                  aria-invalid={Boolean(error)}
                  className={cn(
                    'bg-card mt-2 h-[52px] rounded-xl border-[1.5px] px-3.5 text-lg font-semibold tracking-wide md:text-lg',
                    current && !error && 'border-primary',
                  )}
                  {...form.register(`vehicles.${index}.${field}`, { valueAsNumber: true })}
                />
                {error ? <p className="text-destructive mt-1 text-xs">{error}</p> : hint}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-[18px] grid grid-cols-3 gap-2 border-t pt-3.5 text-center">
        <div>
          <p className="text-muted-foreground text-xs">Ukupno</p>
          <p className="mt-0.5 text-[15px] font-semibold">{formatKm(total)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Sa putnicima</p>
          <p className="mt-0.5 text-[15px] font-semibold">{formatKm(withPassengers)}</p>
        </div>
        <div>
          <p className="text-muted-foreground text-xs">Prazan hod</p>
          <p className="mt-0.5 text-[15px] font-semibold">{formatKm(emptyRun)}</p>
        </div>
      </div>
    </PortalCard>
  );
}
