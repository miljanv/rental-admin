'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  computeCalibrationExpiry,
  TACHOGRAPH_TYPE_LABELS,
  type TachographCalibrationDto,
  type TachographCalibrationWriteRequest,
  type TachographType,
} from '@rental-admin/shared';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { DateField } from '@/components/common/date-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateTachographCalibration } from '@/features/tachograph-calibrations/hooks/use-create-tachograph-calibration';
import { useUpdateTachographCalibration } from '@/features/tachograph-calibrations/hooks/use-update-tachograph-calibration';
import {
  EMPTY_CALIBRATION_FORM,
  tachographCalibrationFormSchema,
  type TachographCalibrationFormValues,
} from '@/features/tachograph-calibrations/schemas/tachograph-calibration-form-schema';
import { ScanUploadField } from '@/features/vehicles/components/scan-upload-field';
import { useScanSelection } from '@/features/vehicles/hooks/use-scan-selection';
import { useUploadVehicleScan } from '@/features/vehicles/hooks/use-upload-vehicle-scan';
import { PaymentMethodSelect } from '@/features/transactions/components/payment-method-select';
import { formatDate } from '@/lib/format';

interface TachographCalibrationFormProps {
  vehicleId: string;
  tachographType: TachographType;
  calibration?: TachographCalibrationDto;
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

export function TachographCalibrationForm({
  vehicleId,
  tachographType,
  calibration,
  onDone,
}: TachographCalibrationFormProps) {
  const isEdit = Boolean(calibration);
  const createMutation = useCreateTachographCalibration(vehicleId);
  const updateMutation = useUpdateTachographCalibration(vehicleId);
  const scanUpload = useUploadVehicleScan();
  const { selectedFile, fileError, selectFile, clearFile } = useScanSelection();
  const isPending = createMutation.isPending || updateMutation.isPending || scanUpload.isUploading;

  const form = useForm<TachographCalibrationFormValues, unknown, TachographCalibrationWriteRequest>({
    resolver: zodResolver(tachographCalibrationFormSchema),
    defaultValues: calibration
      ? {
          calibratedAt: calibration.calibratedAt,
          fileId: calibration.file?.id ?? '',
          cost: calibration.cost,
          paymentMethod: calibration.paymentMethod ?? '',
        }
      : EMPTY_CALIBRATION_FORM,
  });

  const calibratedAt = useWatch({ control: form.control, name: 'calibratedAt' });
  const errors = form.formState.errors;

  const previewExpiry =
    calibratedAt?.length === ISO_DATE_LENGTH
      ? computeCalibrationExpiry(tachographType, calibratedAt)
      : null;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      let fileId = calibration?.file?.id ?? values.fileId ?? null;

      if (selectedFile) {
        const uploaded = await scanUpload.upload(selectedFile);
        fileId = uploaded.id;
      }

      const payload: TachographCalibrationWriteRequest = { ...values, fileId };

      if (calibration) {
        await updateMutation.mutateAsync({ calibrationId: calibration.id, body: payload });
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
        <CardTitle>{isEdit ? 'Izmena kalibracije' : 'Nova kalibracija tahografa'}</CardTitle>
        <CardDescription>
          Vozilo ima {TACHOGRAPH_TYPE_LABELS[tachographType].toLowerCase()} tahograf — rok isteka se
          automatski računa.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <Field id="calibratedAt" label="Datum kalibracije" error={errors.calibratedAt?.message}>
            <Controller
              control={form.control}
              name="calibratedAt"
              render={({ field }) => (
                <DateField
                  id="calibratedAt"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isPending}
                  aria-invalid={Boolean(errors.calibratedAt)}
                />
              )}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          {previewExpiry ? (
            <div className="bg-muted/50 rounded-lg border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Izračunat rok isteka: </span>
              <span className="font-medium">{formatDate(previewExpiry)}</span>
            </div>
          ) : null}

          <ScanUploadField
            id="calibration-scan"
            currentFileName={calibration?.file && !selectedFile ? calibration.file.originalName : null}
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
                    : 'Dodaj kalibraciju'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
