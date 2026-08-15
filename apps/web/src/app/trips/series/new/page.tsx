import type { Metadata } from 'next';

import { TripSeriesForm } from '@/features/trips/components/trip-series-form';

export const metadata: Metadata = {
  title: 'Ponavljajuća vožnja',
};

export default function NewTripSeriesPage() {
  return <TripSeriesForm />;
}
