'use client';

import { usePathname } from 'next/navigation';

import { AppShell } from '@/components/layout/app-shell';
import { OrganizationGuard } from '@/components/layout/organization-guard';
import { ChangePasswordScreen } from '@/features/auth/components/change-password-screen';
import { LoginScreen } from '@/features/auth/components/login-screen';
import { useAuth } from '@/providers/auth-provider';

/** Pages a driver opens from a personal link; they never show the office app or its login. */
export const isDriverPortalPath = (pathname: string | null): boolean =>
  pathname === '/v' || Boolean(pathname?.startsWith('/v/'));

export function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isDriverPortalPath(pathname)) {
    return children;
  }

  return <OfficeGate>{children}</OfficeGate>;
}

function OfficeGate({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return (
      <div className="bg-background flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground text-sm">Učitavanje…</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (user.mustChangePassword) {
    return <ChangePasswordScreen />;
  }

  return (
    <AppShell>
      <OrganizationGuard>{children}</OrganizationGuard>
    </AppShell>
  );
}
