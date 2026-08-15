import type { Metadata } from 'next';

import { ContractWizard } from '@/features/contracts/components/contract-wizard';

export const metadata: Metadata = {
  title: 'Novi ugovor',
};

export default function NewContractPage() {
  return <ContractWizard />;
}
