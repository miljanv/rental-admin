'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  computeInspectionExpiry,
  VEHICLE_INSPECTION_TYPE_LABELS,
  VEHICLE_INSPECTION_TYPES,
  type VehicleInspectionDto,
  type VehicleInspectionWriteRequest,
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
import { useCreateVehicleInspection } from '@/features/vehicle-inspections/hooks/use-create-vehicle-inspection';
import { useUpdateVehicleInspection } from '@/features/vehicle-inspections/hooks/use-update-vehicle-inspection';
import { formatEarliestScheduleHint } from '@/features/vehicle-inspections/lib/inspection';
import {
  EMPTY_INSPECTION_FORM,
  vehicleInspectionFormSchema,
  type VehicleInspectionFormValues,
} from '@/features/vehicle-inspections/schemas/vehicle-inspection-form-schema';
import { ScanUploadField } from '@/features/vehicles/components/scan-upload-field';
import { useScanSelection } from '@/features/vehicles/hooks/use-scan-selection';
import { useUploadVehicleScan } from '@/features/vehicles/hooks/use-upload-vehicle-scan';
import { formatDate } from '@/lib/format';

interface VehicleInspectionFormProps {
  vehicleId: string;
  inspection?: VehicleInspectionDto;
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

export function VehicleInspectionForm({
  vehicleId,
  inspection,
  onDone,
}: VehicleInspectionFormProps) {
  const isEdit = Boolean(inspection);
  const createMutation = useCreateVehicleInspection(vehicleId);
  const updateMutation = useUpdateVehicleInspection(vehicleId);
  const scanUpload = useUploadVehicleScan();
  const { selectedFile, fileError, selectFile, clearFile } = useScanSelection();
  const isPending = createMutation.isPending || updateMutation.isPending || scanUpload.isUploading;

  const form = useForm<VehicleInspectionFormValues, unknown, VehicleInspectionWriteRequest>({
    resolver: zodResolver(vehicleInspectionFormSchema),
    defaultValues: inspection
      ? { type: inspection.type, inspectedAt: inspection.inspectedAt, fileId: inspection.file?.id ?? '' }
      : EMPTY_INSPECTION_FORM,
  });

  const type = useWatch({ control: form.control, name: 'type' });
  const inspectedAt = useWatch({ control: form.control, name: 'inspectedAt' });
  const errors = form.formState.errors;

  const previewExpiry =
    inspectedAt?.length === ISO_DATE_LENGTH ? computeInspectionExpiry(type, inspectedAt) : null;
  const earliestScheduleHint = previewExpiry ? formatEarliestScheduleHint(type, previewExpiry) : null;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      let fileId = inspection?.file?.id ?? values.fileId ?? null;

      if (selectedFile) {
        const uploaded = await scanUpload.upload(selectedFile);
        fileId = uploaded.id;
      }

      const payload: VehicleInspectionWriteRequest = { ...values, fileId };

      if (inspection) {
        await updateMutation.mutateAsync({ inspectionId: inspection.id, body: payload });
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
        <CardTitle>{isEdit ? 'Izmena pregleda' : 'Novi tehnički pregled'}</CardTitle>
        <CardDescription>
          Rok isteka se automatski računa na osnovu tipa pregleda i datuma.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Field id="inspection-type" label="Tip pregleda" error={errors.type?.message}>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <SelectTrigger id="inspection-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_INSPECTION_TYPES.map((value) => (
                        <SelectItem key={value} value={value}>
                          {VEHICLE_INSPECTION_TYPE_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <Field id="inspectedAt" label="Datum pregleda" error={errors.inspectedAt?.message}>
              <Input
                id="inspectedAt"
                type="date"
                disabled={isPending}
                aria-invalid={Boolean(errors.inspectedAt)}
                {...form.register('inspectedAt')}
              />
            </Field>
          </div>

          {previewExpiry ? (
            <div className="bg-muted/50 rounded-lg border px-3 py-2 text-sm">
              <span className="text-muted-foreground">Izračunat rok isteka: </span>
              <span className="font-medium">{formatDate(previewExpiry)}</span>
              {earliestScheduleHint ? (
                <p className="text-muted-foreground mt-0.5 text-xs">{earliestScheduleHint}</p>
              ) : null}
            </div>
          ) : null}

          <ScanUploadField
            id="inspection-scan"
            currentFileName={inspection?.file && !selectedFile ? inspection.file.originalName : null}
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
                    : 'Dodaj pregled'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
