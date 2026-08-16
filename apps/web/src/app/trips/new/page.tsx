import type { Metadata } from 'next';

import { TripForm } from '@/features/trips/components/trip-form';

export const metadata: Metadata = {
  title: 'Nova vožnja',
};

export default function NewTripPage() {
  return <TripForm />;
}
