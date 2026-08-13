import type { Metadata } from 'next';

import { PageHeader } from '@/components/common/page-header';
import { DashboardOverview } from '@/features/dashboard/components/dashboard-overview';

export const metadata: Metadata = {
  title: 'Dashboard',
};

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="An overview of everything stored in your private S3 bucket."
      />
      <DashboardOverview />
    </>
  );
}
