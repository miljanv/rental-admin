'use client';

import { PageHeader } from '@/components/common/page-header';
import { AlarmWidget } from '@/features/alarms/components/alarm-widget';

export function DashboardOverview() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Najhitniji rokovi zaposlenih i vozila na jednom pregledu."
      />
      <AlarmWidget />
    </>
  );
}
