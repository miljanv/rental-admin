'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { downloadOrganizationExport } from '@/features/admin/api/organizations-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { saveBlob } from '@/lib/download';

export const useExportOrganization = () =>
  useMutation({
    mutationFn: downloadOrganizationExport,
    onSuccess: ({ blob, fileName }) => {
      saveBlob(blob, fileName);
      toast.success('Podaci firme su preuzeti.');
    },
    onError: (error) => {
      toast.error('Podaci firme nisu izvezeni.', { description: getApiErrorMessage(error) });
    },
  });
