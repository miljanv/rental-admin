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
    garageStartKm: vehicle.garageStartKm ?? '',
    startKm: vehicle.startKm ?? '',
    endKm: vehicle.endKm ?? '',
    garageEndKm: vehicle.garageEndKm ?? '',
  }));

type KmField = 'garageStartKm' | 'startKm' | 'endKm' | 'garageEndKm';

/** The day of a vehicle in order: out of the garage, departure, drop-off, back in the garage. */
export const KM_FIELDS: ReadonlyArray<{ field: KmField; label: string }> = [
  { field: 'garageStartKm', label: 'Iz garaže' },
  { field: 'startKm', label: 'Polazak (putnici)' },
  { field: 'endKm', label: 'Ostavljeni putnici' },
  { field: 'garageEndKm', label: 'U garaži' },
];

/** Four odometer readings per vehicle on the trip, with the distance driven. */
export function TripVehicleKmFields({
  form,
  vehicles,
  idPrefix,
  disabled,
}: TripVehicleKmFieldsProps) {
  const watched = useWatch({ control: form.control, name: 'vehicleKm' }) ?? [];
  const errors = form.formState.errors.vehicleKm;
  const readings = watched.map((row) => ({
    garageStartKm: toReading(row?.garageStartKm),
    startKm: toReading(row?.startKm),
    endKm: toReading(row?.endKm),
    garageEndKm: toReading(row?.garageEndKm),
  }));
  const totalKm = sumTripVehicleDistanceKm(readings);

  return (
    <div className="space-y-4 sm:col-span-2">
      {vehicles.map((vehicle, index) => {
        const reading = readings[index];
        const distance = reading ? tripVehicleDistanceKm(reading.startKm, reading.endKm) : null;
        const garageDistance = reading
          ? tripVehicleDistanceKm(reading.garageStartKm, reading.garageEndKm)
          : null;
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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {KM_FIELDS.map(({ field, label }) => (
                <div key={field} className="space-y-1">
                  <Label
                    htmlFor={`${idPrefix}-${index}-${field}`}
                    className="text-muted-foreground text-xs"
                  >
                    {label}
                  </Label>
                  <Input
                    id={`${idPrefix}-${index}-${field}`}
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    disabled={disabled}
                    aria-invalid={Boolean(rowErrors?.[field])}
                    {...form.register(`vehicleKm.${index}.${field}`, { valueAsNumber: true })}
                  />
                  {rowErrors?.[field]?.message ? (
                    <p className="text-destructive text-xs">{rowErrors[field]?.message}</p>
                  ) : null}
                </div>
              ))}
            </div>
            <p className="text-muted-foreground text-sm">
              Sa putnicima: {distance !== null ? `${kmFormatter.format(distance)} km` : '—'}
              {' · '}
              Iz garaže do garaže:{' '}
              {garageDistance !== null ? `${kmFormatter.format(garageDistance)} km` : '—'}
            </p>
          </div>
        );
      })}
      {vehicles.length > 1 ? (
        <p className="text-sm font-medium">
          Ukupno sa putnicima: {totalKm !== null ? `${kmFormatter.format(totalKm)} km` : '—'}
        </p>
      ) : null}
    </div>
  );
}
