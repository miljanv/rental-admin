import type { Metadata } from 'next';

import { OrganizationDetail } from '@/features/admin/components/organization-detail';

export const metadata: Metadata = {
  title: 'Detalj firme',
};

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <OrganizationDetail organizationId={id} />;
}
