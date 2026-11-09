'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChangePasswordForm } from '@/features/auth/components/change-password-form';
import { APP_INITIALS, APP_NAME } from '@/lib/env';
import { useAuth } from '@/providers/auth-provider';

/** Shown instead of the app while the account still has a temporary password. */
export function ChangePasswordScreen() {
  const { user, logout } = useAuth();

  return (
    <div className="bg-background flex min-h-svh items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-xl text-lg font-semibold tracking-tight">
            {APP_INITIALS}
          </span>
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase">
            {APP_NAME}
          </p>
        </div>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Promenite lozinku</CardTitle>
            <CardDescription>
              {user ? `${user.username}, ` : ''}lozinku vam je dodelio administrator. Izaberite
              svoju da biste nastavili.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ChangePasswordForm submitLabel="Sačuvaj i nastavi" />
            <Button type="button" variant="ghost" className="w-full" onClick={logout}>
              Odjavi se
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
