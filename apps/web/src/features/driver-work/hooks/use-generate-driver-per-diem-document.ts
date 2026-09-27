'use client';

import type { GenerateDriverPerDiemDocumentRequest } from '@rental-admin/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import {
  downloadMonthlyPayout,
  downloadTravelDecision,
  downloadTravelOrder,
  downloadTravelSettlement,
  saveDriverDocumentDownload,
} from '@/features/driver-work/api/driver-per-diem-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';

type DocumentKind = 'decision' | 'order' | 'settlement';

const downloaders: Record<
  DocumentKind,
  (
    driverId: string,
    body: GenerateDriverPerDiemDocumentRequest,
  ) => Promise<{ blob: Blob; fileName: string }>
> = {
  decision: downloadTravelDecision,
  order: downloadTravelOrder,
  settlement: downloadTravelSettlement,
};

const successCopy: Record<DocumentKind, string> = {
  decision: 'Odluka o upućivanju je preuzeta.',
  order: 'Nalog za službeni put je preuzet.',
  settlement: 'Obračun dnevnice je preuzet.',
};

export const useGenerateDriverPerDiemDocument = (driverId: string, kind: DocumentKind) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: GenerateDriverPerDiemDocumentRequest) => downloaders[kind](driverId, body),
    onSuccess: async ({ blob, fileName }) => {
      saveDriverDocumentDownload(blob, fileName);
      toast.success(successCopy[kind]);
      await queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
    },
    onError: (error) => {
      toast.error('Dokument nije generisan.', { description: getApiErrorMessage(error) });
    },
  });
};

export const useGenerateMonthlyPayout = (driverId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (year: number) => downloadMonthlyPayout(driverId, { year }),
    onSuccess: async ({ blob, fileName }) => {
      saveDriverDocumentDownload(blob, fileName);
      toast.success('Isplata dnevnica po mesecima je preuzeta.');
      await queryClient.invalidateQueries({ queryKey: queryKeys.drivers.all });
    },
    onError: (error) => {
      toast.error('Isplata nije generisana.', { description: getApiErrorMessage(error) });
    },
  });
};
