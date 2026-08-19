import type { Metadata } from 'next';

import { EditDriverScreen } from '@/features/drivers/components/edit-driver-screen';

export const metadata: Metadata = {
  title: 'Izmena zaposlenog',
};

export default async function EditDriverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <EditDriverScreen driverId={id} />;
}
