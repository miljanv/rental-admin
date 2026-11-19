import type { Metadata } from 'next';

import { PortalShell } from '@/features/driver-portal/components/portal-shell';

export const metadata: Metadata = {
  title: 'Unos vozača',
  // The link token is in the address: never send it on as a Referer, never index it.
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export default async function DriverPortalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return <PortalShell token={token}>{children}</PortalShell>;
}
