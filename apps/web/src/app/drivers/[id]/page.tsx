import type { Metadata } from 'next';

import { DriverProfile } from '@/features/drivers/components/driver-profile';

export const metadata: Metadata = {
  title: 'Profil zaposlenog',
};

export default async function DriverProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <DriverProfile driverId={id} />;
}
