import type { Metadata } from 'next';

import { FinanceManager } from '@/features/transactions/components/finance-manager';

export const metadata: Metadata = {
  title: 'Finansije',
};

export default function FinancePage() {
  return <FinanceManager />;
}
