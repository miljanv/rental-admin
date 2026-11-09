import type { Metadata } from 'next';

import { AnnouncementsManager } from '@/features/announcements/components/announcements-manager';

export const metadata: Metadata = {
  title: 'Obaveštenja',
};

export default function AnnouncementsPage() {
  return <AnnouncementsManager />;
}
