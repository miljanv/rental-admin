import type { Metadata } from 'next';

import { FilesManager } from '@/features/files/components/files-manager';

export const metadata: Metadata = {
  title: 'Files',
};

export default function FilesPage() {
  return <FilesManager />;
}
