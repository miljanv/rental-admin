import type { Metadata } from 'next';

import { AuditLogManager } from '@/features/admin/components/audit-log-manager';

export const metadata: Metadata = {
  title: 'Dnevnik aktivnosti',
};

export default function AuditLogPage() {
  return <AuditLogManager />;
}
