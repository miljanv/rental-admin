import type { Metadata } from 'next';

import { FuelManager } from '@/features/fuel-logs/components/fuel-manager';

export const metadata: Metadata = {
  title: 'Gorivo',
};

export default function FuelPage() {
  return <FuelManager />;
}
