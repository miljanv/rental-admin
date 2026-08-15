'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  travelPermitWriteSchema,
  type TravelPermitDto,
  type TravelPermitWriteRequest,
} from '@rental-admin/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateTravelPermit } from '@/features/travel-permits/hooks/use-create-travel-permit';
import { useUpdateTravelPermit } from '@/features/travel-permits/hooks/use-update-travel-permit';
import { ScanUploadField } from '@/features/vehicles/components/scan-upload-field';
import { useScanSelection } from '@/features/vehicles/hooks/use-scan-selection';
import { useUploadVehicleScan } from '@/features/vehicles/hooks/use-upload-vehicle-scan';

/**
 * The server schema requires `fileId`, but on this form the real fileId only
 * exists *after* the selected file finishes uploading — which happens inside
 * the submit handler, after RHF's own validation already ran. Validating
 * `fileId` through the resolver would always see it empty and block the
 * handler from ever running, so it's dropped here and checked manually
 * against `selectedFile` / the existing permit's file instead.
 */
const travelPermitFormSchema = travelPermitWriteSchema.omit({ fileId: true });
type TravelPermitFormValues = z.infer<typeof travelPermitFormSchema>;

interface TravelPermitFormProps {
  contractId: string;
  permit?: TravelPermitDto;
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

export function TravelPermitForm({ contractId, permit, onDone }: TravelPermitFormProps) {
  const isEdit = Boolean(permit);
  const createMutation = useCreateTravelPermit(contractId);
  const updateMutation = useUpdateTravelPermit(contractId);
  const scanUpload = useUploadVehicleScan();
  const { selectedFile, fileError, selectFile, clearFile } = useScanSelection();
  const isPending = createMutation.isPending || updateMutation.isPending || scanUpload.isUploading;

  const [missingFileError, setMissingFileError] = useState<string | null>(null);

  const form = useForm<TravelPermitFormValues>({
    resolver: zodResolver(travelPermitFormSchema),
    defaultValues: permit
      ? { country: permit.country, permitNumber: permit.permitNumber, issuedAt: permit.issuedAt }
      : { country: '', permitNumber: '', issuedAt: '' },
  });

  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(
    async (values) => {
      if (!selectedFile && !permit?.fileId) {
        setMissingFileError('Fajl dozvole je obavezan.');
        return;
      }

      setMissingFileError(null);

      try {
        let fileId = permit?.fileId ?? '';

        if (selectedFile) {
          const uploaded = await scanUpload.upload(selectedFile);
          fileId = uploaded.id;
        }

        const payload: TravelPermitWriteRequest = { ...values, fileId };

        if (permit) {
          await updateMutation.mutateAsync({ permitId: permit.id, body: payload });
        } else {
          await createMutation.mutateAsync(payload);
        }

        onDone();
      } catch {
        // Upload and save errors are already toasted.
      }
    },
    () => {
      toast.error('Ispravite greške u formi.', {
        description: 'Neka obavezna polja nisu popunjena ili nisu ispravnog formata.',
      });
    },
  );

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>{isEdit ? 'Izmena putne dozvole' : 'Nova putna dozvola'}</CardTitle>
        <CardDescription>Zemlja, broj dozvole i sken dokumenta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field id="country" label="Zemlja" error={errors.country?.message}>
              <Input
                id="country"
                disabled={isPending}
                aria-invalid={Boolean(errors.country)}
                {...form.register('country')}
              />
            </Field>
            <Field id="permitNumber" label="Broj dozvole" error={errors.permitNumber?.message}>
              <Input
                id="permitNumber"
                disabled={isPending}
                aria-invalid={Boolean(errors.permitNumber)}
                {...form.register('permitNumber')}
              />
            </Field>
            <Field id="issuedAt" label="Datum izdavanja" error={errors.issuedAt?.message}>
              <Input
                id="issuedAt"
                type="date"
                disabled={isPending}
                aria-invalid={Boolean(errors.issuedAt)}
                {...form.register('issuedAt')}
              />
            </Field>
          </div>

          <ScanUploadField
            id="permit-scan"
            label="Fajl dozvole"
            currentFileName={permit && !selectedFile ? permit.originalName : null}
            selectedFile={selectedFile}
            onSelectFile={(file) => {
              setMissingFileError(null);
              selectFile(file);
            }}
            onRemoveFile={clearFile}
            error={fileError ?? missingFileError}
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
                ? `Otpremanje… ${scanUpload.progress}%`
                : isPending
                  ? 'Čuvanje…'
                  : isEdit
                    ? 'Sačuvaj izmene'
                    : 'Dodaj dozvolu'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
