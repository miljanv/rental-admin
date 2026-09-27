import type {
  ApiResponse,
  DriverPerDiemLedgerDto,
  DriverStatisticsDto,
  GenerateDriverMonthlyPayoutRequest,
  GenerateDriverPerDiemDocumentRequest,
} from '@rental-admin/shared';
import axios from 'axios';

import { apiClient, unwrap } from '@/lib/api-client';
import { parseApiError } from '@/lib/api-error';
import type { DriverPerDiemsQueryParams, DriverStatisticsQueryParams } from '@/lib/query-keys';

const fileNameFromDisposition = (header: string | undefined, fallback: string): string => {
  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(header ?? '');

  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const asciiMatch = /filename="([^"]+)"/i.exec(header ?? '');

  if (asciiMatch?.[1]) {
    return asciiMatch[1];
  }

  return fallback;
};

const downloadBinary = async (
  path: string,
  body: unknown,
  fallbackName: string,
): Promise<{ blob: Blob; fileName: string }> => {
  try {
    const response = await apiClient.post<Blob>(path, body, {
      responseType: 'blob',
      timeout: 60_000,
    });

    return {
      blob: response.data,
      fileName: fileNameFromDisposition(
        response.headers['content-disposition'] as string | undefined,
        fallbackName,
      ),
    };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      const text = await error.response.data.text();
      const response = error.response;

      try {
        response.data = JSON.parse(text) as typeof response.data;
      } catch {
        throw new Error(parseApiError(error).message);
      }
    }

    throw error;
  }
};

export const saveDriverDocumentDownload = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const fetchDriverPerDiems = async (
  driverId: string,
  params: DriverPerDiemsQueryParams,
  signal?: AbortSignal,
): Promise<DriverPerDiemLedgerDto> => {
  const response = await apiClient.get<ApiResponse<DriverPerDiemLedgerDto>>(
    `/drivers/${driverId}/per-diems`,
    { params, signal },
  );

  return unwrap(response.data);
};

export const fetchDriverStatistics = async (
  driverId: string,
  params: DriverStatisticsQueryParams,
  signal?: AbortSignal,
): Promise<DriverStatisticsDto> => {
  const response = await apiClient.get<ApiResponse<DriverStatisticsDto>>(
    `/drivers/${driverId}/statistics`,
    { params, signal },
  );

  return unwrap(response.data);
};

export const downloadTravelDecision = (
  driverId: string,
  body: GenerateDriverPerDiemDocumentRequest,
): Promise<{ blob: Blob; fileName: string }> =>
  downloadBinary(`/drivers/${driverId}/per-diem-documents/decision`, body, 'odluka.pdf');

export const downloadTravelOrder = (
  driverId: string,
  body: GenerateDriverPerDiemDocumentRequest,
): Promise<{ blob: Blob; fileName: string }> =>
  downloadBinary(`/drivers/${driverId}/per-diem-documents/order`, body, 'nalog.xlsx');

export const downloadTravelSettlement = (
  driverId: string,
  body: GenerateDriverPerDiemDocumentRequest,
): Promise<{ blob: Blob; fileName: string }> =>
  downloadBinary(`/drivers/${driverId}/per-diem-documents/settlement`, body, 'obracun.xlsx');

export const downloadMonthlyPayout = (
  driverId: string,
  body: GenerateDriverMonthlyPayoutRequest,
): Promise<{ blob: Blob; fileName: string }> =>
  downloadBinary(
    `/drivers/${driverId}/per-diem-documents/monthly-payout`,
    body,
    'isplata-dnevnica.xlsx',
  );
