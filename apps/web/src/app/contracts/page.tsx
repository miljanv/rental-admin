import type { Metadata } from 'next';

import { ContractsList } from '@/features/contracts/components/contracts-list';

export const metadata: Metadata = {
  title: 'Ugovori',
};

export default function ContractsPage() {
  return <ContractsList />;
}
