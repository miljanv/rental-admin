'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchFiles } from '@/features/files/api/files-api';
import { queryKeys, type FileListQueryParams } from '@/lib/query-keys';

export const useFiles = (params: FileListQueryParams) =>
  useQuery({
    queryKey: queryKeys.files.list(params),
    queryFn: ({ signal }) => fetchFiles(params, signal),
    // Keeps the previous page visible while the next one loads.
    placeholderData: (previous) => previous,
  });
