import type { Metadata } from 'next';

import { AdminManager } from '@/features/admin/components/admin-manager';

export const metadata: Metadata = {
  title: 'Firme i korisnici',
};

export default function AdminPage() {
  return <AdminManager />;
}
