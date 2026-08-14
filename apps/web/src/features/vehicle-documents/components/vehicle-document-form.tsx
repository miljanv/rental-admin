'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  VEHICLE_DOCUMENT_TYPE_LABELS,
  VEHICLE_DOCUMENT_TYPES,
  type VehicleDocumentDto,
  type VehicleDocumentWriteRequest,
} from '@rental-admin/shared';
import { Controller, useForm } from 'react-hook-form';

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
import { useCreateVehicleDocument } from '@/features/vehicle-documents/hooks/use-create-vehicle-document';
import { useUpdateVehicleDocument } from '@/features/vehicle-documents/hooks/use-update-vehicle-document';
import {
  EMPTY_VEHICLE_DOCUMENT_FORM,
  vehicleDocumentFormSchema,
  type VehicleDocumentFormValues,
} from '@/features/vehicle-documents/schemas/vehicle-document-form-schema';
import { ScanUploadField } from '@/features/vehicles/components/scan-upload-field';
import { useScanSelection } from '@/features/vehicles/hooks/use-scan-selection';
import { useUploadVehicleScan } from '@/features/vehicles/hooks/use-upload-vehicle-scan';

interface VehicleDocumentFormProps {
  vehicleId: string;
  document?: VehicleDocumentDto;
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

export function VehicleDocumentForm({ vehicleId, document, onDone }: VehicleDocumentFormProps) {
  const isEdit = Boolean(document);
  const createMutation = useCreateVehicleDocument(vehicleId);
  const updateMutation = useUpdateVehicleDocument(vehicleId);
  const scanUpload = useUploadVehicleScan();
  const { selectedFile, fileError, selectFile, clearFile } = useScanSelection();
  const isPending = createMutation.isPending || updateMutation.isPending || scanUpload.isUploading;

  const form = useForm<VehicleDocumentFormValues, unknown, VehicleDocumentWriteRequest>({
    resolver: zodResolver(vehicleDocumentFormSchema),
    defaultValues: document
      ? { type: document.type, issuedAt: document.issuedAt ?? '', fileId: document.file?.id ?? '' }
      : EMPTY_VEHICLE_DOCUMENT_FORM,
  });

  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      let fileId = document?.file?.id ?? values.fileId ?? null;

      if (selectedFile) {
        const uploaded = await scanUpload.upload(selectedFile);
        fileId = uploaded.id;
      }

      const payload: VehicleDocumentWriteRequest = { ...values, fileId };

      if (document) {
        await updateMutation.mutateAsync({ documentId: document.id, body: payload });
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
        <CardTitle>{isEdit ? 'Izmena dokumenta' : 'Novi dokument'}</CardTitle>
        <CardDescription>Unesite podatke i po želji priložite sken (PDF ili slika).</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Field id="document-type" label="Tip dokumenta" error={errors.type?.message}>
                  <Select value={field.value} onValueChange={field.onChange} disabled={isPending}>
                    <SelectTrigger id="document-type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VEHICLE_DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {VEHICLE_DOCUMENT_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <Field id="issuedAt" label="Datum izdavanja" error={errors.issuedAt?.message}>
              <Input
                id="issuedAt"
                type="date"
                disabled={isPending}
                aria-invalid={Boolean(errors.issuedAt)}
                {...form.register('issuedAt', {
                  setValueAs: (value: string) => (value ? value : null),
                })}
              />
            </Field>
          </div>

          <ScanUploadField
            id="document-scan"
            currentFileName={document?.file && !selectedFile ? document.file.originalName : null}
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
                    : 'Dodaj dokument'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
