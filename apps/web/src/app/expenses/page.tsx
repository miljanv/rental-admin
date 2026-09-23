import type { Metadata } from 'next';

import { CompanyExpenseManager } from '@/features/company-expenses/components/company-expense-manager';

export const metadata: Metadata = {
  title: 'Troškovi',
};

export default function ExpensesPage() {
  return <CompanyExpenseManager />;
}
