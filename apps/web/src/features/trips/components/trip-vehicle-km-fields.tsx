'use client';

import {
  sumTripVehicleDistanceKm,
  TRIP_KM_SOURCE_LABELS,
  tripVehicleDistanceKm,
  type TripSettlementWriteInput,
  type TripSettlementWriteRequest,
  type TripVehicleDto,
} from '@rental-admin/shared';
import { useWatch, type UseFormReturn } from 'react-hook-form';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TripVehicleKmFieldsProps {
  form: UseFormReturn<TripSettlementWriteInput, unknown, TripSettlementWriteRequest>;
  vehicles: TripVehicleDto[];
  idPrefix: string;
  disabled?: boolean;
}

const toReading = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const kmFormatter = new Intl.NumberFormat('sr-RS', { maximumFractionDigits: 1 });

/** Form values for the per-vehicle odometer rows of a settlement form. */
export const toVehicleKmFormValues = (
  vehicles: TripVehicleDto[],
): NonNullable<TripSettlementWriteInput['vehicleKm']> =>
  vehicles.map((vehicle) => ({
    vehicleId: vehicle.id,
    startKm: vehicle.startKm ?? '',
    endKm: vehicle.endKm ?? '',
  }));

/** One start / end odometer row per vehicle on the trip, with the distance driven. */
export function TripVehicleKmFields({
  form,
  vehicles,
  idPrefix,
  disabled,
}: TripVehicleKmFieldsProps) {
  const watched = useWatch({ control: form.control, name: 'vehicleKm' }) ?? [];
  const errors = form.formState.errors.vehicleKm;
  const readings = watched.map((row) => ({
    startKm: toReading(row?.startKm),
    endKm: toReading(row?.endKm),
  }));
  const totalKm = sumTripVehicleDistanceKm(readings);

  return (
    <div className="space-y-3 sm:col-span-2">
      {vehicles.map((vehicle, index) => {
        const reading = readings[index];
        const distance = reading ? tripVehicleDistanceKm(reading.startKm, reading.endKm) : null;
        const rowErrors = errors?.[index];

        return (
          <div key={vehicle.id} className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{vehicle.licensePlate}</span>
              <span className="text-muted-foreground">
                {vehicle.make} {vehicle.model}
              </span>
              {vehicle.kmSource ? (
                <span className="text-muted-foreground text-xs">
                  · {TRIP_KM_SOURCE_LABELS[vehicle.kmSource]}
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-[1fr_1fr_auto] items-start gap-2">
              <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-${index}-start`} className="sr-only">
                  Početni km
                </Label>
                <Input
                  id={`${idPrefix}-${index}-start`}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="Početni km"
                  disabled={disabled}
                  aria-invalid={Boolean(rowErrors?.startKm)}
                  {...form.register(`vehicleKm.${index}.startKm`, { valueAsNumber: true })}
                />
                {rowErrors?.startKm?.message ? (
                  <p className="text-destructive text-xs">{rowErrors.startKm.message}</p>
                ) : null}
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${idPrefix}-${index}-end`} className="sr-only">
                  Završni km
                </Label>
                <Input
                  id={`${idPrefix}-${index}-end`}
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="Završni km"
                  disabled={disabled}
                  aria-invalid={Boolean(rowErrors?.endKm)}
                  {...form.register(`vehicleKm.${index}.endKm`, { valueAsNumber: true })}
                />
                {rowErrors?.endKm?.message ? (
                  <p className="text-destructive text-xs">{rowErrors.endKm.message}</p>
                ) : null}
              </div>
              <p className="text-muted-foreground flex h-8 items-center text-sm whitespace-nowrap">
                {distance !== null ? `= ${kmFormatter.format(distance)} km` : '—'}
              </p>
            </div>
          </div>
        );
      })}
      {vehicles.length > 1 ? (
        <p className="text-sm font-medium">
          Ukupno: {totalKm !== null ? `${kmFormatter.format(totalKm)} km` : '—'}
        </p>
      ) : null}
    </div>
  );
}
