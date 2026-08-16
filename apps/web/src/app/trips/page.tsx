import type { Metadata } from 'next';

import { TripsManager } from '@/features/trips/components/trips-manager';

export const metadata: Metadata = {
  title: 'Vožnje',
};

export default function TripsPage() {
  return <TripsManager />;
}
