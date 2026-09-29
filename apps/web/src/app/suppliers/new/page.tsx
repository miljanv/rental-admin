import type { Metadata } from 'next';

import { SupplierForm } from '@/features/suppliers/components/supplier-form';

export const metadata: Metadata = {
  title: 'Novi dobavljač',
};

export default function NewSupplierPage() {
  return <SupplierForm />;
}
