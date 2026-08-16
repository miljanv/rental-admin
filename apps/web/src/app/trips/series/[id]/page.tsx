import type { Metadata } from 'next';

import { TripSeriesManager } from '@/features/trips/components/trip-series-manager';

export const metadata: Metadata = {
  title: 'Serija vožnji',
};

export default async function TripSeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return <TripSeriesManager seriesId={id} />;
}
