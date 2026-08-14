'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { fetchDownloadUrl } from '@/features/files/api/files-api';
import { getApiErrorMessage } from '@/lib/api-error';

export const useDownloadVehicleScan = () =>
  useMutation({
    mutationFn: (variables: { fileId: string }) => fetchDownloadUrl(variables.fileId),
    onSuccess: (result) => {
      window.location.assign(result.downloadUrl);
    },
    onError: (error) => {
      toast.error('Sken nije preuzet.', { description: getApiErrorMessage(error) });
    },
  });
