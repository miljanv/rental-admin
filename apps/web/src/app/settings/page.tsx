import type { Metadata } from 'next';

import { AlarmThresholdsForm } from '@/features/alarms/components/alarm-thresholds-form';

export const metadata: Metadata = {
  title: 'Podešavanja',
};

export default function SettingsPage() {
  return <AlarmThresholdsForm />;
}
