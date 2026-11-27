import type { Metadata } from 'next';

import { DriverInputsScreen } from '@/features/driver-workplace/components/driver-inputs-screen';

export const metadata: Metadata = {
  title: 'Unosi vozača',
};

export default function DriverReportsPage() {
  return <DriverInputsScreen />;
}
