import type {
  ApiPaginatedResponse,
  ApiResponse,
  DeleteFileResult,
  DownloadUrlResult,
  FileObjectDto,
  PaginationMeta,
  PresignUploadRequest,
  PresignUploadResult,
} from '@rental-admin/shared';

import { apiClient, storageClient, unwrap } from '@/lib/api-client';
import type { FileListQueryParams } from '@/lib/query-keys';

export interface FileListPage {
  files: FileObjectDto[];
  pagination: PaginationMeta;
}

export const fetchFiles = async (
  params: FileListQueryParams,
  signal?: AbortSignal,
): Promise<FileListPage> => {
  const response = await apiClient.get<ApiPaginatedResponse<FileObjectDto>>('/files', {
    params,
    signal,
  });

  return { files: response.data.data, pagination: response.data.pagination };
};

/** Step 2-6: ask the API for a presigned PUT URL and a pending file record. */
export const requestUploadUrl = async (
  body: PresignUploadRequest,
): Promise<PresignUploadResult> => {
  const response = await apiClient.post<ApiResponse<PresignUploadResult>>(
    '/files/presign-upload',
    body,
  );

  return unwrap(response.data);
};

interface UploadToStorageParams {
  uploadUrl: string;
  file: File;
  onProgress: (percent: number) => void;
  signal: AbortSignal;
}

/**
 * Step 7-8: the file goes straight from the browser to S3. Axios is used here
 * (instead of fetch) because it reports upload progress.
 */
export const uploadToStorage = async ({
  uploadUrl,
  file,
  onProgress,
  signal,
}: UploadToStorageParams): Promise<void> => {
  await storageClient.put(uploadUrl, file, {
    // Must match the Content-Type the presigned URL was signed with.
    headers: { 'Content-Type': file.type },
    signal,
    onUploadProgress: (event) => {
      const total = event.total ?? file.size;

      if (total > 0) {
        onProgress(Math.min(100, Math.round((event.loaded * 100) / total)));
      }
    },
  });
};

/** Step 9-11: the API verifies the object exists and marks the upload complete. */
export const confirmUpload = async (fileId: string): Promise<FileObjectDto> => {
  const response = await apiClient.post<ApiResponse<FileObjectDto>>(`/files/${fileId}/confirm`);

  return unwrap(response.data);
};

export const fetchDownloadUrl = async (fileId: string): Promise<DownloadUrlResult> => {
  const response = await apiClient.get<ApiResponse<DownloadUrlResult>>(`/files/${fileId}/download`);

  return unwrap(response.data);
};

export const deleteFile = async (fileId: string): Promise<DeleteFileResult> => {
  const response = await apiClient.delete<ApiResponse<DeleteFileResult>>(`/files/${fileId}`);

  return unwrap(response.data);
};
