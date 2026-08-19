import type { Metadata } from 'next';

import { DriversList } from '@/features/drivers/components/drivers-list';

export const metadata: Metadata = {
  title: 'Zaposleni',
};

export default function DriversPage() {
  return <DriversList />;
}
