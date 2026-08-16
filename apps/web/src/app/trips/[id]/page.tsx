import type { Metadata } from 'next';

import { TripProfile } from '@/features/trips/components/trip-profile';

export const metadata: Metadata = {
  title: 'Detalji vožnje',
};

export default async function TripProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <TripProfile tripId={id} />;
}
