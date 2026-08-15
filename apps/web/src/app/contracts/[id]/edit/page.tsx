import type { Metadata } from 'next';

import { EditContractScreen } from '@/features/contracts/components/edit-contract-screen';

export const metadata: Metadata = {
  title: 'Izmena ugovora',
};

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <EditContractScreen contractId={id} />;
}
