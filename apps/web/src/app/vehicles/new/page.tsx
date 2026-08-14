import type { Metadata } from 'next';

import { VehicleForm } from '@/features/vehicles/components/vehicle-form';

export const metadata: Metadata = {
  title: 'Novo vozilo',
};

export default function NewVehiclePage() {
  return <VehicleForm />;
}
