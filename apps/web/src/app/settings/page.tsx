import type { Metadata } from 'next';

import { AlarmThresholdsForm } from '@/features/alarms/components/alarm-thresholds-form';
import { ChangePasswordCard } from '@/features/auth/components/change-password-card';

export const metadata: Metadata = {
  title: 'Podešavanja',
};

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <AlarmThresholdsForm />
      <ChangePasswordCard />
    </div>
  );
}
