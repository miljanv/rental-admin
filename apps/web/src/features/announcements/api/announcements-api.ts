import type {
  ActiveAnnouncementDto,
  AnnouncementDto,
  AnnouncementWriteRequest,
  ApiResponse,
} from '@rental-admin/shared';

import { apiClient, unwrap } from '@/lib/api-client';

export const fetchActiveAnnouncements = async (
  signal?: AbortSignal,
): Promise<ActiveAnnouncementDto[]> => {
  const response = await apiClient.get<ApiResponse<ActiveAnnouncementDto[]>>(
    '/announcements/active',
    { signal },
  );

  return unwrap(response.data);
};

export const dismissAnnouncement = async (id: string): Promise<void> => {
  await apiClient.post(`/announcements/${id}/dismiss`);
};

export const fetchAnnouncements = async (signal?: AbortSignal): Promise<AnnouncementDto[]> => {
  const response = await apiClient.get<ApiResponse<AnnouncementDto[]>>('/admin/announcements', {
    signal,
  });

  return unwrap(response.data);
};

export const createAnnouncement = async (
  body: AnnouncementWriteRequest,
): Promise<AnnouncementDto> => {
  const response = await apiClient.post<ApiResponse<AnnouncementDto>>('/admin/announcements', body);

  return unwrap(response.data);
};

export const updateAnnouncement = async (
  id: string,
  body: AnnouncementWriteRequest,
): Promise<AnnouncementDto> => {
  const response = await apiClient.patch<ApiResponse<AnnouncementDto>>(
    `/admin/announcements/${id}`,
    body,
  );

  return unwrap(response.data);
};

export const deleteAnnouncement = async (id: string): Promise<void> => {
  await apiClient.delete(`/admin/announcements/${id}`);
};
