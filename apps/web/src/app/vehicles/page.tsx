import type { Metadata } from 'next';

import { VehiclesList } from '@/features/vehicles/components/vehicles-list';

export const metadata: Metadata = {
  title: 'Vozila',
};

export default function VehiclesPage() {
  return <VehiclesList />;
}
