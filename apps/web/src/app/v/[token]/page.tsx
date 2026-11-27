import { Suspense } from 'react';

import { PortalHome } from '@/features/driver-portal/components/portal-home';

export default async function DriverPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return (
    <Suspense>
      <PortalHome token={token} />
    </Suspense>
  );
}
