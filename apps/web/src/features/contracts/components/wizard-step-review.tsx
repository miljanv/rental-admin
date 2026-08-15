'use client';

import {
  CONTRACT_STATUS_LABELS,
  computeAdvanceAmount,
  computeRemainderAmount,
  isLegalEntityPartnerType,
  PARTNER_TYPE_LABELS,
  type ContractWriteRequest,
} from '@rental-admin/shared';
import { useFormContext, useWatch, type UseFormReturn } from 'react-hook-form';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ContractFormValues } from '@/features/contracts/schemas/contract-form-schema';
import { useDrivers } from '@/features/drivers/hooks/use-drivers';
import { driverFullName } from '@/features/drivers/lib/driver';
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles';
import { vehicleLabel } from '@/features/vehicles/lib/vehicle';
import { formatDate } from '@/lib/format';

interface SummaryRowProps {
  label: string;
  value: string;
}

function SummaryRow({ label, value }: SummaryRowProps) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

type ContractForm = UseFormReturn<ContractFormValues, unknown, ContractWriteRequest>;

export function WizardStepReview() {
  const form = useFormContext<ContractFormValues>() as ContractForm;
  const values = useWatch({ control: form.control });

  const vehiclesQuery = useVehicles({ page: 1, limit: 100, sortBy: 'make', sortOrder: 'asc' });
  const driversQuery = useDrivers({ page: 1, limit: 100, sortBy: 'lastName', sortOrder: 'asc' });
  const vehicle = vehiclesQuery.data?.vehicles.find((item) => item.id === values.vehicleId);
  const driver = driversQuery.data?.drivers.find((item) => item.id === values.driverId);

  const price = values.price ?? 0;
  const advancePercentage = values.advancePercentage ?? 0;
  const clientName = isLegalEntityPartnerType(values.clientType ?? 'TRAVEL_AGENCY')
    ? (values.clientCompanyName ?? '')
    : `${values.clientFirstName ?? ''} ${values.clientLastName ?? ''}`.trim();

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Pregled i potvrda</CardTitle>
        <CardDescription>Proverite podatke pre nego što sačuvate ugovor.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2">
          <SummaryRow
            label="Naručilac"
            value={
              clientName
                ? `${clientName} (${PARTNER_TYPE_LABELS[values.clientType ?? 'TRAVEL_AGENCY']})`
                : '—'
            }
          />
          <SummaryRow label="Relacija" value={values.route || '—'} />
          <SummaryRow
            label="Period usluge"
            value={
              values.serviceStartDate && values.serviceEndDate
                ? `${formatDate(values.serviceStartDate)} – ${formatDate(values.serviceEndDate)}`
                : '—'
            }
          />
          <SummaryRow label="Broj putnika" value={String(values.passengerCount ?? '—')} />
          <SummaryRow label="Međunarodna ruta" value={values.isInternational ? 'Da' : 'Ne'} />
          <SummaryRow label="Vozilo" value={vehicle ? vehicleLabel(vehicle) : 'Nije određeno'} />
          <SummaryRow label="Vozač" value={driver ? driverFullName(driver) : 'Nije određeno'} />
          <SummaryRow label="Ukupna cena" value={`${price.toLocaleString('sr-RS')} RSD`} />
          <SummaryRow
            label={`Avans (${advancePercentage}%)`}
            value={`${computeAdvanceAmount(price, advancePercentage).toLocaleString('sr-RS')} RSD`}
          />
          <SummaryRow
            label="Preostali iznos"
            value={`${computeRemainderAmount(price, advancePercentage).toLocaleString('sr-RS')} RSD`}
          />
          <SummaryRow
            label="Status"
            value={CONTRACT_STATUS_LABELS[values.status ?? 'DRAFT']}
          />
        </dl>
        {vehiclesQuery.isError || driversQuery.isError ? (
          <p className="text-destructive mt-3 text-xs">
            Nazivi vozila/vozača nisu učitani — ako ste ih izabrali, izbor je ipak sačuvan.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
