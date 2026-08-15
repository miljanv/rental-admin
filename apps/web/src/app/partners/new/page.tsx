import type { Metadata } from 'next';

import { PartnerForm } from '@/features/partners/components/partner-form';

export const metadata: Metadata = {
  title: 'Novi partner',
};

export default function NewPartnerPage() {
  return <PartnerForm />;
}
