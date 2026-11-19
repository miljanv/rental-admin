import { PortalTripList } from '@/features/driver-portal/components/portal-trip-list';

export default async function DriverPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return <PortalTripList token={token} />;
}
