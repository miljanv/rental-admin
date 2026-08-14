'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { fetchPreviewUrl } from '@/features/files/api/files-api';
import { getApiErrorMessage } from '@/lib/api-error';

interface PreviewScanVariables {
  fileId: string;
  /** Opened synchronously in the click handler so the browser allows the popup. */
  tab: Window | null;
}

/**
 * Points an already-opened tab at a short-lived inline presigned URL so PDF
 * and image scans display in the browser instead of downloading.
 */
export const usePreviewVehicleScan = () =>
  useMutation({
    mutationFn: async (variables: PreviewScanVariables) => {
      try {
        const result = await fetchPreviewUrl(variables.fileId);

        if (variables.tab) {
          variables.tab.opener = null;
          variables.tab.location.replace(result.previewUrl);
        } else {
          window.open(result.previewUrl, '_blank', 'noopener,noreferrer');
        }

        return result;
      } catch (error) {
        variables.tab?.close();
        throw error;
      }
    },
    onError: (error) => {
      toast.error('Sken nije otvoren.', { description: getApiErrorMessage(error) });
    },
  });
