import type { Metadata } from 'next';

import { DriverForm } from '@/features/drivers/components/driver-form';

export const metadata: Metadata = {
  title: 'Novi vozač',
};

export default function NewDriverPage() {
  return <DriverForm />;
}
