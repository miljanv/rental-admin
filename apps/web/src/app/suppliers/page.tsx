import type { Metadata } from 'next';

import { SuppliersList } from '@/features/suppliers/components/suppliers-list';

export const metadata: Metadata = {
  title: 'Dobavljači',
};

export default function SuppliersPage() {
  return <SuppliersList />;
}
