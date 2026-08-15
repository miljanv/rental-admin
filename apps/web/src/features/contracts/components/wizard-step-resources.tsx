'use client';

import type { ContractWriteRequest } from '@rental-admin/shared';
import { AlertTriangle } from 'lucide-react';
import { Controller, useFormContext, useWatch, type UseFormReturn } from 'react-hook-form';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useContractAvailability } from '@/features/contracts/hooks/use-contract-availability';
import type { ContractFormValues } from '@/features/contracts/schemas/contract-form-schema';
import { driverFullName } from '@/features/drivers/lib/driver';
import { useDrivers } from '@/features/drivers/hooks/use-drivers';
import { vehicleLabel } from '@/features/vehicles/lib/vehicle';
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles';

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ id, label, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-destructive text-xs">{error}</p> : null}
    </div>
  );
}

const NONE = 'none';

type ContractForm = UseFormReturn<ContractFormValues, unknown, ContractWriteRequest>;

interface WizardStepResourcesProps {
  /** Excluded from the availability check — this contract's own current booking is not a conflict. */
  excludeContractId?: string;
}

export function WizardStepResources({ excludeContractId }: WizardStepResourcesProps) {
  const form = useFormContext<ContractFormValues>() as ContractForm;

  const vehicleId = useWatch({ control: form.control, name: 'vehicleId' });
  const driverId = useWatch({ control: form.control, name: 'driverId' });
  const serviceStartDate = useWatch({ control: form.control, name: 'serviceStartDate' });
  const serviceEndDate = useWatch({ control: form.control, name: 'serviceEndDate' });

  const vehiclesQuery = useVehicles({ page: 1, limit: 100, sortBy: 'make', sortOrder: 'asc' });
  const driversQuery = useDrivers({ page: 1, limit: 100, sortBy: 'lastName', sortOrder: 'asc' });
  const vehicles = vehiclesQuery.data?.vehicles ?? [];
  const drivers = driversQuery.data?.drivers ?? [];

  const availabilityQuery = useContractAvailability({
    vehicleId: vehicleId || undefined,
    driverId: driverId || undefined,
    serviceStartDate: serviceStartDate || '',
    serviceEndDate: serviceEndDate || '',
    excludeContractId,
  });

  const vehicleConflicts = availabilityQuery.data?.vehicleConflicts ?? [];
  const driverConflicts = availabilityQuery.data?.driverConflicts ?? [];
  const hasConflicts = vehicleConflicts.length > 0 || driverConflicts.length > 0;

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Vozilo i vozač</CardTitle>
        <CardDescription>Opciono — može se odrediti i naknadno.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            control={form.control}
            name="vehicleId"
            render={({ field }) => (
              <Field id="vehicleId" label="Vozilo">
                <Select
                  value={field.value || NONE}
                  onValueChange={(value) => field.onChange(value === NONE ? '' : value)}
                  disabled={vehiclesQuery.isPending}
                >
                  <SelectTrigger id="vehicleId" className="w-full">
                    <SelectValue placeholder="Nije određeno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nije određeno</SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicleLabel(vehicle)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />

          <Controller
            control={form.control}
            name="driverId"
            render={({ field }) => (
              <Field id="driverId" label="Vozač">
                <Select
                  value={field.value || NONE}
                  onValueChange={(value) => field.onChange(value === NONE ? '' : value)}
                  disabled={driversQuery.isPending}
                >
                  <SelectTrigger id="driverId" className="w-full">
                    <SelectValue placeholder="Nije određeno" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nije određeno</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driverFullName(driver)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          />
        </div>

        {hasConflicts ? (
          <div
            role="alert"
            className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200 flex gap-3 rounded-lg border px-4 py-3 text-sm"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="space-y-1">
              <p className="font-medium">Vozilo ili vozač su već zauzeti u ovom periodu.</p>
              {vehicleConflicts.length > 0 ? (
                <p>
                  Vozilo je već rezervisano za: {vehicleConflicts.map((c) => c.route).join(', ')}.
                </p>
              ) : null}
              {driverConflicts.length > 0 ? (
                <p>Vozač je već rezervisan za: {driverConflicts.map((c) => c.route).join(', ')}.</p>
              ) : null}
              <p className="text-amber-800/80 dark:text-amber-300/80">
                Ovo je samo upozorenje — ugovor i dalje možete sačuvati.
              </p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
