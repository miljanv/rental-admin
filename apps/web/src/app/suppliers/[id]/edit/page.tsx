import type { Metadata } from 'next';

import { EditSupplierScreen } from '@/features/suppliers/components/edit-supplier-screen';

export const metadata: Metadata = {
  title: 'Izmena dobavljača',
};

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <EditSupplierScreen supplierId={id} />;
}
