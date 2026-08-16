'use client';

import {
  FUEL_LOG_FUEL_TYPE_LABELS,
  FUEL_LOG_FUEL_TYPES,
  fuelLogBulkWriteSchema,
  type FuelLogFuelType,
} from '@rental-admin/shared';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { DateField, parseMaskedDate } from '@/components/common/date-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDrivers } from '@/features/drivers/hooks/use-drivers';
import { FuelSupplierField } from '@/features/fuel-logs/components/fuel-supplier-field';
import { useCreateFuelLogsBulk } from '@/features/fuel-logs/hooks/use-create-fuel-logs-bulk';
import {
  EMPTY_BULK_FORM,
  EMPTY_BULK_ROW,
  type FuelLogBulkRowValues,
} from '@/features/fuel-logs/schemas/fuel-log-bulk-form-schema';
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles';

interface FuelBulkFormProps {
  onDone: () => void;
}

const INHERIT_FUEL_TYPE = 'inherit';
const NO_DRIVER = 'none';
const UNSET_VEHICLE = 'unset';

const isFilledRow = (row: FuelLogBulkRowValues): boolean => row.vehicleId.trim().length > 0;

export function FuelBulkForm({ onDone }: FuelBulkFormProps) {
  const mutation = useCreateFuelLogsBulk();
  const [values, setValues] = useState(EMPTY_BULK_FORM);
  const [error, setError] = useState<string | null>(null);

  const driversQuery = useDrivers({
    page: 1,
    limit: 100,
    sortBy: 'lastName',
    sortOrder: 'asc',
    status: 'ACTIVE',
  });
  const vehiclesQuery = useVehicles({
    page: 1,
    limit: 100,
    sortBy: 'make',
    sortOrder: 'asc',
  });
  const drivers = driversQuery.data?.drivers ?? [];
  const vehicles = vehiclesQuery.data?.vehicles ?? [];

  const updateRow = (index: number, patch: Partial<FuelLogBulkRowValues>): void => {
    setValues((current) => ({
      ...current,
      rows: current.rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    }));
  };

  const addRow = (): void => {
    setValues((current) => ({ ...current, rows: [...current.rows, { ...EMPTY_BULK_ROW }] }));
  };

  const removeRow = (index: number): void => {
    setValues((current) => ({
      ...current,
      rows: current.rows.length === 1 ? current.rows : current.rows.filter((_, i) => i !== index),
    }));
  };

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setError(null);

    const fueledAt = parseMaskedDate(values.fueledAt) ?? values.fueledAt;

    if (!fueledAt) {
      setError('Unesite datum sipanja.');
      return;
    }

    const parsed = fuelLogBulkWriteSchema.safeParse({
      fueledAt,
      supplier: values.supplier,
      location: values.location,
      fuelType: values.fuelType,
      rows: values.rows.filter(isFilledRow).map((row) => ({
        vehicleId: row.vehicleId,
        driverId: row.driverId || null,
        fuelType: row.fuelType || undefined,
        litersFilled: Number(row.litersFilled),
        odometerKm: Number(row.odometerKm),
        note: row.note || null,
      })),
    });

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      setError(firstIssue?.message ?? 'Proverite uneta sipanja.');
      return;
    }

    try {
      await mutation.mutateAsync(parsed.data);
      onDone();
    } catch {
      // Toast already shown.
    }
  };

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Brzi unos sa grupnog računa</CardTitle>
        <CardDescription>
          Isti datum i dobavljač važe za sve redove. Svako sipanje se razvrstava po registraciji.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={(event) => void onSubmit(event)} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-fueledAt">Datum sipanja</Label>
              <DateField
                id="bulk-fueledAt"
                value={values.fueledAt}
                onChange={(fueledAt) => setValues((current) => ({ ...current, fueledAt }))}
                disabled={mutation.isPending}
              />
            </div>
            <FuelSupplierField
              id="bulk-supplier"
              listId="bulk-fuel-supplier-options"
              value={values.supplier}
              onChange={(supplier) => setValues((current) => ({ ...current, supplier }))}
              disabled={mutation.isPending}
            />
            <div className="space-y-1.5">
              <Label htmlFor="bulk-fuelType">Tip goriva (podrazumevano)</Label>
              <Select
                value={values.fuelType}
                onValueChange={(fuelType) =>
                  setValues((current) => ({ ...current, fuelType: fuelType as FuelLogFuelType }))
                }
                disabled={mutation.isPending}
              >
                <SelectTrigger id="bulk-fuelType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FUEL_LOG_FUEL_TYPES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {FUEL_LOG_FUEL_TYPE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-xs tracking-wide uppercase">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Vozilo</th>
                  <th className="px-3 py-2 text-left font-medium">Litara</th>
                  <th className="px-3 py-2 text-left font-medium">Stanje km</th>
                  <th className="px-3 py-2 text-left font-medium">Vozač</th>
                  <th className="px-3 py-2 text-left font-medium">Tip</th>
                  <th className="w-10 px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {values.rows.map((row, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-2 py-2">
                      <Select
                        value={row.vehicleId || UNSET_VEHICLE}
                        onValueChange={(vehicleId) =>
                          updateRow(index, { vehicleId: vehicleId === UNSET_VEHICLE ? '' : vehicleId })
                        }
                        disabled={mutation.isPending || vehiclesQuery.isPending}
                      >
                        <SelectTrigger className="w-full min-w-40" aria-label={`Vozilo red ${index + 1}`}>
                          <SelectValue placeholder="Registracija" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={UNSET_VEHICLE}>Izaberite vozilo</SelectItem>
                          {vehicles.map((vehicle) => (
                            <SelectItem key={vehicle.id} value={vehicle.id}>
                              {vehicle.licensePlate}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        className="min-w-24"
                        value={row.litersFilled}
                        onChange={(event) =>
                          updateRow(index, {
                            litersFilled: event.target.value === '' ? '' : Number(event.target.value),
                          })
                        }
                        disabled={mutation.isPending}
                        aria-label={`Litara red ${index + 1}`}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        inputMode="numeric"
                        className="min-w-28"
                        value={row.odometerKm}
                        onChange={(event) =>
                          updateRow(index, {
                            odometerKm: event.target.value === '' ? '' : Number(event.target.value),
                          })
                        }
                        disabled={mutation.isPending}
                        aria-label={`Stanje km red ${index + 1}`}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        value={row.driverId || NO_DRIVER}
                        onValueChange={(value) =>
                          updateRow(index, { driverId: value === NO_DRIVER ? '' : value })
                        }
                        disabled={mutation.isPending || driversQuery.isPending}
                      >
                        <SelectTrigger className="w-full min-w-36" aria-label={`Vozač red ${index + 1}`}>
                          <SelectValue placeholder="Vozač" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_DRIVER}>Bez vozača</SelectItem>
                          {drivers.map((driver) => (
                            <SelectItem key={driver.id} value={driver.id}>
                              {driver.firstName} {driver.lastName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-2">
                      <Select
                        value={row.fuelType || INHERIT_FUEL_TYPE}
                        onValueChange={(value) =>
                          updateRow(index, {
                            fuelType: value === INHERIT_FUEL_TYPE ? '' : (value as FuelLogFuelType),
                          })
                        }
                        disabled={mutation.isPending}
                      >
                        <SelectTrigger className="w-full min-w-28" aria-label={`Tip goriva red ${index + 1}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={INHERIT_FUEL_TYPE}>Podrazumevano</SelectItem>
                          {FUEL_LOG_FUEL_TYPES.map((value) => (
                            <SelectItem key={value} value={value}>
                              {FUEL_LOG_FUEL_TYPE_LABELS[value]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-2 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(index)}
                        disabled={mutation.isPending || values.rows.length === 1}
                        aria-label={`Ukloni red ${index + 1}`}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={mutation.isPending}>
            <Plus className="size-4" aria-hidden />
            Dodaj red
          </Button>

          {error ? <p className="text-destructive text-sm">{error}</p> : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onDone} disabled={mutation.isPending}>
              Otkaži
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Čuvanje…' : 'Sačuvaj sipanja'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
