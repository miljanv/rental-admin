import type { Metadata } from 'next';

import { BusinessAnalytics } from '@/features/analytics/components/business-analytics';

export const metadata: Metadata = {
  title: 'Analitika',
};

export default function AnalyticsPage() {
  return <BusinessAnalytics />;
}
