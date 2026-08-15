'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  computeSafetyEquipmentExpiry,
  SAFETY_EQUIPMENT_TYPE_LABELS,
  SAFETY_EQUIPMENT_TYPES,
  type VehicleSafetyEquipmentDto,
  type VehicleSafetyEquipmentWriteRequest,
} from '@rental-admin/shared';
import { Controller, useForm, useWatch } from 'react-hook-form';

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
import { useCreateVehicleSafetyEquipment } from '@/features/vehicle-safety-equipment/hooks/use-create-vehicle-safety-equipment';
import { useUpdateVehicleSafetyEquipment } from '@/features/vehicle-safety-equipment/hooks/use-update-vehicle-safety-equipment';
import {
  EMPTY_SAFETY_EQUIPMENT_FORM,
  vehicleSafetyEquipmentFormSchema,
  type VehicleSafetyEquipmentFormValues,
} from '@/features/vehicle-safety-equipment/schemas/vehicle-safety-equipment-form-schema';
import { ScanUploadField } from '@/features/vehicles/components/scan-upload-field';
import { useScanSelection } from '@/features/vehicles/hooks/use-scan-selection';
import { useUploadVehicleScan } from '@/features/vehicles/hooks/use-upload-vehicle-scan';
import { PaymentMethodSelect } from '@/features/transactions/components/payment-method-select';
import { formatDate } from '@/lib/format';

interface VehicleSafetyEquipmentFormProps {
  vehicleId: string;
  equipment?: VehicleSafetyEquipmentDto;
  onDone: () => void;
}

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

const ISO_DATE_LENGTH = 10;

export function VehicleSafetyEquipmentForm({
  vehicleId,
  equipment,
  onDone,
}: VehicleSafetyEquipmentFormProps) {
  const isEdit = Boolean(equipment);
  const createMutation = useCreateVehicleSafetyEquipment(vehicleId);
  const updateMutation = useUpdateVehicleSafetyEquipment(vehicleId);
  const scanUpload = useUploadVehicleScan();
  const { selectedFile, fileError, selectFile, clearFile } = useScanSelection();
  const isPending = createMutation.isPending || updateMutation.isPending || scanUpload.isUploading;

  const form = useForm<VehicleSafetyEquipmentFormValues, unknown, VehicleSafetyEquipmentWriteRequest>({
    resolver: zodResolver(vehicleSafetyEquipmentFormSchema),
    defaultValues: equipment
      ? {
          type: equipment.type,
          checkedAt: equipment.checkedAt,
          expiresAt: equipment.type === 'FIRST_AID_KIT' ? equipment.expiresAt : '',
          fileId: equipment.file?.id ?? '',
          cost: equipment.cost,
          paymentMethod: equipment.paymentMethod ?? '',
        }
      : EMPTY_SAFETY_EQUIPMENT_FORM,
  });

  const type = useWatch({ control: form.control, name: 'type' });
  const checkedAt = useWatch({ control: form.control, name: 'checkedAt' });
  const isFirstAidKit = type === 'FIRST_AID_KIT';
  const errors = form.formState.errors;

  const previewExpiry =
    !isFirstAidKit && checkedAt?.length === ISO_DATE_LENGTH
      ? computeSafetyEquipmentExpiry('FIRE_EXTINGUISHER', checkedAt, null)
      : null;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      let fileId = equipment?.file?.id ?? values.fileId ?? null;

      if (selectedFile) {
        const uploaded = await scanUpload.upload(selectedFile);
        fileId = uploaded.id;
      }

      const payload: VehicleSafetyEquipmentWriteRequest = { ...values, fileId };

      if (equipment) {
        await updateMutation.mutateAsync({ equipmentId: equipment.id, body: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      onDone();
    } catch {
      // Upload and save errors are already toasted.
    }
  });

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>{isEdit ? 'Izmena opreme' : 'Nova provera opreme'}</CardTitle>
        <CardDescription>
          PP aparat: rok se računa automatski (+180 dana). Prva pomoć: rok se unosi ručno (piše na
          kutiji).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Field id="equipment-type" label="Tip opreme" error={errors.type?.message}>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value === 'FIRE_EXTINGUISHER') {
                        form.setValue('expiresAt', '');
                      }
                    }}
                    disabled={isPending}
                  >
                    <SelectTrigger id="equipment-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SAFETY_EQUIPMENT_TYPES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {SAFETY_EQUIPMENT_TYPE_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <Field id="checkedAt" label="Datum provere" error={errors.checkedAt?.message}>
              <Input
                id="checkedAt"
                type="date"
                disabled={isPending}
                aria-invalid={Boolean(errors.checkedAt)}
                {...form.register('checkedAt')}
              />
            </Field>

            {isFirstAidKit ? (
              <Field
                id="expiresAt"
                label="Datum isteka (piše na kutiji)"
                error={errors.expiresAt?.message}
              >
                <Input
                  id="expiresAt"
                  type="date"
                  disabled={isPending}
                  aria-invalid={Boolean(errors.expiresAt)}
                  {...form.register('expiresAt', {
                    setValueAs: (value: string) => (value ? value : null),
                  })}
                />
              </Field>
            ) : (
              <>
                <Field id="cost" label="Iznos (RSD)" error={errors.cost?.message}>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    disabled={isPending}
                    aria-invalid={Boolean(errors.cost)}
                    {...form.register('cost', { valueAsNumber: true })}
                  />
                </Field>
                <Controller
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <Field id="paymentMethod" label="Način plaćanja" error={errors.paymentMethod?.message}>
                      <PaymentMethodSelect
                        id="paymentMethod"
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isPending}
                        allowEmpty
                      />
                    </Field>
                  )}
                />
              </>
            )}
          </div>

          {previewExpiry ? (
            <div className="bg-muted/50 rounded-lg border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Izračunat rok isteka: </span>
              <span className="font-medium">{formatDate(previewExpiry)}</span>
            </div>
          ) : null}

          <ScanUploadField
            id="equipment-scan"
            currentFileName={equipment?.file && !selectedFile ? equipment.file.originalName : null}
            selectedFile={selectedFile}
            onSelectFile={selectFile}
            onRemoveFile={clearFile}
            error={fileError}
            disabled={isPending}
            isUploading={scanUpload.isUploading}
            uploadProgress={scanUpload.progress}
          />

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
              Otkaži
            </Button>
            <Button type="submit" disabled={isPending}>
              {scanUpload.isUploading
                ? `Otpremanje skena… ${scanUpload.progress}%`
                : isPending
                  ? 'Čuvanje…'
                  : isEdit
                    ? 'Sačuvaj izmene'
                    : 'Dodaj zapis'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
