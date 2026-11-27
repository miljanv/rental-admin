import { Suspense } from 'react';

import { PortalTripScreen } from '@/features/driver-portal/components/portal-trip-screen';

export default async function DriverPortalTripPage({
  params,
}: {
  params: Promise<{ token: string; tripId: string }>;
}) {
  const { token, tripId } = await params;

  return (
    <Suspense>
      <PortalTripScreen token={token} tripId={tripId} />
    </Suspense>
  );
}
