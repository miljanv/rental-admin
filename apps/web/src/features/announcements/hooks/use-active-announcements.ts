'use client';

import { useQuery } from '@tanstack/react-query';

import { fetchActiveAnnouncements } from '@/features/announcements/api/announcements-api';
import { queryKeys } from '@/lib/query-keys';

/** New banners show up without a reload. */
const REFRESH_INTERVAL_MS = 5 * 60_000;

export const useActiveAnnouncements = () =>
  useQuery({
    queryKey: queryKeys.announcements.active(),
    queryFn: ({ signal }) => fetchActiveAnnouncements(signal),
    refetchInterval: REFRESH_INTERVAL_MS,
  });
