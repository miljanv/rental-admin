import type { Metadata } from 'next';

import { VehicleProfile } from '@/features/vehicles/components/vehicle-profile';

export const metadata: Metadata = {
  title: 'Profil vozila',
};

export default async function VehicleProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <VehicleProfile vehicleId={id} />;
}
