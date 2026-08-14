import type { Metadata } from 'next';

import { EditVehicleScreen } from '@/features/vehicles/components/edit-vehicle-screen';

export const metadata: Metadata = {
  title: 'Izmena vozila',
};

export default async function EditVehiclePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <EditVehicleScreen vehicleId={id} />;
}
