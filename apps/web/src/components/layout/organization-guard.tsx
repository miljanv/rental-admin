'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuth } from '@/providers/auth-provider';

const ADMIN_PATH = '/admin';

/**
 * A superadmin has no business data of their own, so every screen except the
 * admin one is empty until an organization is chosen. Send them where they can
 * choose one instead of showing a page that can only fail.
 */
export function OrganizationGuard({ children }: { children: React.ReactNode }) {
  const { user, activeOrganizationId } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const needsOrganization =
    user?.role === 'SUPERADMIN' &&
    activeOrganizationId === null &&
    !pathname.startsWith(ADMIN_PATH);

  useEffect(() => {
    if (needsOrganization) {
      router.replace(ADMIN_PATH);
    }
  }, [needsOrganization, router]);

  return needsOrganization ? null : <>{children}</>;
}
