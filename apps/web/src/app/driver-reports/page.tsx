import type { Metadata } from 'next';

import { DriverReportsManager } from '@/features/driver-reports/components/driver-reports-manager';

export const metadata: Metadata = {
  title: 'Unosi vozača',
};

export default function DriverReportsPage() {
  return <DriverReportsManager />;
}
