'use client';

import { AppShell } from '@/components/layout/app-shell';
import { LoginScreen } from '@/features/auth/components/login-screen';
import { useAuth } from '@/providers/auth-provider';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isReady } = useAuth();

  if (!isReady) {
    return (
      <div className="bg-background flex min-h-svh items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <AppShell>{children}</AppShell>;
}
