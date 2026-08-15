import type { Metadata } from 'next';

import { EditPartnerScreen } from '@/features/partners/components/edit-partner-screen';

export const metadata: Metadata = {
  title: 'Izmena partnera',
};

export default async function EditPartnerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <EditPartnerScreen partnerId={id} />;
}
