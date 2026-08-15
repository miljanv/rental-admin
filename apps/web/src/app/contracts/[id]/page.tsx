import type { Metadata } from 'next';

import { ContractProfile } from '@/features/contracts/components/contract-profile';

export const metadata: Metadata = {
  title: 'Profil ugovora',
};

export default async function ContractProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <ContractProfile contractId={id} />;
}
