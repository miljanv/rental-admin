import type { Metadata } from 'next';

import { AlarmCenter } from '@/features/alarms/components/alarm-center';

export const metadata: Metadata = {
  title: 'Alarm centar',
};

export default function AlarmsPage() {
  return <AlarmCenter />;
}
