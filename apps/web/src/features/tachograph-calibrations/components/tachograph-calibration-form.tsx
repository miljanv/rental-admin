'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  computeCalibrationExpiry,
  TACHOGRAPH_TYPE_LABELS,
  type TachographCalibrationDto,
  type TachographType,
} from '@rental-admin/shared';
import { useForm, useWatch } from 'react-hook-form';

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
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<TachographCalibrationFormValues>({
    resolver: zodResolver(tachographCalibrationFormSchema),
    defaultValues: calibration
      ? { calibratedAt: calibration.calibratedAt }
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
      if (calibration) {
        await updateMutation.mutateAsync({ calibrationId: calibration.id, body: values });
      } else {
        await createMutation.mutateAsync(values);
      }

      onDone();
    } catch {
      // The mutation reports the failure as a toast.
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
            <Input
              id="calibratedAt"
              type="date"
              disabled={isPending}
              aria-invalid={Boolean(errors.calibratedAt)}
              {...form.register('calibratedAt')}
            />
          </Field>

          {previewExpiry ? (
            <div className="bg-muted/50 rounded-lg border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Izračunat rok isteka: </span>
              <span className="font-medium">{formatDate(previewExpiry)}</span>
            </div>
          ) : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
              Otkaži
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Čuvanje…' : isEdit ? 'Sačuvaj izmene' : 'Dodaj kalibraciju'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
