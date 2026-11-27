'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  VEHICLE_FAULT_STATUS_LABELS,
  vehicleFaultCreateSchema,
  type VehicleFaultCreateInput,
  type VehicleFaultCreateRequest,
  type VehicleFaultStatus,
} from '@rental-admin/shared';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { DateField } from '@/components/common/date-field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { PortalMessage } from '@/features/driver-portal/components/portal-shell';
import {
  PortalCard,
  PortalChip,
  PortalFieldLabel,
  PortalRow,
  PortalSectionLabel,
  portalInputClass,
  type PortalTone,
} from '@/features/driver-portal/components/portal-ui';
import {
  PortalVehicleSelect,
  useSuggestedVehicleId,
} from '@/features/driver-portal/components/portal-vehicle-select';
import { ReceiptField } from '@/features/driver-portal/components/receipt-field';
import {
  usePortalFaults,
  useReportPortalFault,
} from '@/features/driver-portal/hooks/use-portal-workplace';
import { formatKm } from '@/features/driver-portal/lib/portal';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatDate, localTodayIso } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_TONES: Record<VehicleFaultStatus, PortalTone> = {
  REPORTED: 'blue',
  IN_REPAIR: 'amber',
  RESOLVED: 'green',
};

const emptyFault = (vehicleId: string): VehicleFaultCreateInput => ({
  vehicleId,
  reportedAt: localTodayIso(),
  odometerKm: Number.NaN,
  description: '',
  fileId: '',
});

/** Kvarovi: report a fault on a vehicle, and follow what the office did with earlier ones. */
export function PortalFaults({ token }: { token: string }) {
  const faults = usePortalFaults(token);
  const mutation = useReportPortalFault(token);
  const suggested = useSuggestedVehicleId(token);
  const [photoName, setPhotoName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const form = useForm<VehicleFaultCreateInput, unknown, VehicleFaultCreateRequest>({
    resolver: zodResolver(vehicleFaultCreateSchema),
    defaultValues: emptyFault(''),
  });
  const errors = form.formState.errors;
  const isPending = mutation.isPending;

  // Today's trip vehicle arrives after the form; preselect it while the field is still empty.
  useEffect(() => {
    if (suggested && !form.getValues('vehicleId')) {
      form.setValue('vehicleId', suggested);
    }
  }, [form, suggested]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values);
      form.reset(emptyFault(values.vehicleId));
      setPhotoName(null);
    } catch {
      // Shown as a toast by the mutation.
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={onSubmit} noValidate>
        <PortalCard className="flex flex-col gap-4 p-[18px]">
          <div>
            <h2 className="text-[17px] font-bold">Prijavi kvar</h2>
            <p className="text-muted-foreground mt-1 text-[13px]">
              Kancelarija vidi prijavu odmah po slanju.
            </p>
          </div>

          <Controller
            control={form.control}
            name="vehicleId"
            render={({ field }) => (
              <div>
                <PortalFieldLabel htmlFor="fault-vehicle">
                  Registarska oznaka vozila
                </PortalFieldLabel>
                <PortalVehicleSelect
                  token={token}
                  id="fault-vehicle"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isPending}
                  invalid={Boolean(errors.vehicleId)}
                />
                {errors.vehicleId?.message ? (
                  <p className="text-destructive mt-1 text-xs">{errors.vehicleId.message}</p>
                ) : null}
              </div>
            )}
          />

          <div className="grid grid-cols-2 gap-2.5">
            <Controller
              control={form.control}
              name="reportedAt"
              render={({ field }) => (
                <div>
                  <PortalFieldLabel htmlFor="fault-date">Datum prijave</PortalFieldLabel>
                  <DateField
                    id="fault-date"
                    value={field.value}
                    onChange={field.onChange}
                    max={localTodayIso()}
                    disabled={isPending}
                    aria-invalid={Boolean(errors.reportedAt)}
                    className="w-full"
                    inputClassName={portalInputClass}
                  />
                </div>
              )}
            />
            <div>
              <PortalFieldLabel htmlFor="fault-km">Stanje na km satu</PortalFieldLabel>
              <Input
                id="fault-km"
                type="number"
                inputMode="numeric"
                placeholder="npr. 958120"
                disabled={isPending}
                aria-invalid={Boolean(errors.odometerKm)}
                className={cn(portalInputClass, 'text-lg font-semibold md:text-lg')}
                {...form.register('odometerKm', { valueAsNumber: true })}
              />
            </div>
          </div>
          {errors.reportedAt?.message || errors.odometerKm?.message ? (
            <p className="text-destructive -mt-2 text-xs">
              {errors.reportedAt?.message ?? errors.odometerKm?.message}
            </p>
          ) : null}

          <div>
            <PortalFieldLabel htmlFor="fault-description">Opis kvara</PortalFieldLabel>
            <Textarea
              id="fault-description"
              rows={5}
              placeholder="Šta ste primetili, kada se javlja, da li vozilo može bezbedno da nastavi"
              disabled={isPending}
              aria-invalid={Boolean(errors.description)}
              className="bg-card min-h-[120px] rounded-xl border-[1.5px] text-[15px] leading-relaxed"
              {...form.register('description')}
            />
            {errors.description?.message ? (
              <p className="text-destructive mt-1 text-xs">{errors.description.message}</p>
            ) : null}
          </div>

          <ReceiptField
            token={token}
            id="fault-photo"
            label="Dodaj sliku (opciono)"
            fileName={photoName}
            disabled={isPending}
            onUploaded={(file) => {
              setPhotoName(file.originalName);
              form.setValue('fileId', file.id);
            }}
            onRemove={() => {
              setPhotoName(null);
              form.setValue('fileId', '');
            }}
            onBusyChange={setUploading}
          />

          <button
            type="submit"
            disabled={isPending || uploading}
            className="bg-primary text-primary-foreground h-[52px] rounded-xl text-[15px] font-semibold disabled:opacity-60"
          >
            {isPending ? 'Slanje…' : uploading ? 'Čeka se slika…' : 'Pošalji prijavu kvara'}
          </button>
        </PortalCard>
      </form>

      <section className="flex flex-col gap-2.5">
        <PortalSectionLabel>Moje prijave</PortalSectionLabel>
        {faults.isPending ? (
          <Skeleton className="h-24 w-full rounded-2xl" />
        ) : faults.isError ? (
          <PortalMessage
            title="Prijave nisu učitane"
            description={getApiErrorMessage(faults.error)}
          />
        ) : faults.data.length === 0 ? (
          <p className="text-muted-foreground px-1 text-sm">Još niste prijavili nijedan kvar.</p>
        ) : (
          <PortalCard className="overflow-hidden">
            {faults.data.map((fault) => (
              <PortalRow
                key={fault.id}
                className="items-start"
                title={<span className="line-clamp-2">{fault.description}</span>}
                subtitle={
                  <>
                    {fault.vehicle.licensePlate} · {formatDate(fault.reportedAt)} ·{' '}
                    {formatKm(fault.odometerKm)}
                    {fault.officeNote ? (
                      <span className="text-foreground mt-1 block">
                        Kancelarija: {fault.officeNote}
                      </span>
                    ) : null}
                  </>
                }
                aside={
                  <PortalChip tone={STATUS_TONES[fault.status]}>
                    {VEHICLE_FAULT_STATUS_LABELS[fault.status]}
                  </PortalChip>
                }
              />
            ))}
          </PortalCard>
        )}
      </section>
    </div>
  );
}
