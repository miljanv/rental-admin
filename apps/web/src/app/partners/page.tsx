import type { Metadata } from 'next';

import { PartnersList } from '@/features/partners/components/partners-list';

export const metadata: Metadata = {
  title: 'Partneri',
};

export default function PartnersPage() {
  return <PartnersList />;
}
