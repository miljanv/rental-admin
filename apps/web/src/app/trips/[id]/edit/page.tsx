import type { Metadata } from 'next';

import { EditTripScreen } from '@/features/trips/components/edit-trip-screen';

export const metadata: Metadata = {
  title: 'Izmena vožnje',
};

export default async function EditTripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <EditTripScreen tripId={id} />;
}
