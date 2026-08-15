'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginFormSchema, type LoginFormValues } from '@/features/auth/schemas/login-schema';
import { getApiErrorMessage } from '@/lib/api-error';
import { APP_DESCRIPTION, APP_INITIALS, APP_NAME } from '@/lib/env';
import { useAuth } from '@/providers/auth-provider';

export function LoginScreen() {
  const { login } = useAuth();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await login(values);
    } catch (error) {
      form.setError('root', { message: getApiErrorMessage(error) });
    }
  });

  const isSubmitting = form.formState.isSubmitting;
  const rootError = form.formState.errors.root?.message;

  return (
    <div className="bg-background flex min-h-svh items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="bg-primary text-primary-foreground flex size-12 items-center justify-center rounded-xl text-lg font-semibold tracking-tight">
            {APP_INITIALS}
          </span>
          <div className="space-y-1">
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase">
              {APP_NAME}
            </p>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">Admin panel</h1>
            <p className="text-muted-foreground text-sm">{APP_DESCRIPTION}</p>
          </div>
        </div>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Prijava</CardTitle>
            <CardDescription>Koristite admin nalog da nastavite.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onSubmit} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="username">Korisničko ime</Label>
                <Input
                  id="username"
                  autoComplete="username"
                  autoFocus
                  disabled={isSubmitting}
                  aria-invalid={Boolean(form.formState.errors.username)}
                  {...form.register('username')}
                />
                {form.formState.errors.username ? (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.username.message}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Lozinka</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  aria-invalid={Boolean(form.formState.errors.password)}
                  {...form.register('password')}
                />
                {form.formState.errors.password ? (
                  <p className="text-destructive text-xs">
                    {form.formState.errors.password.message}
                  </p>
                ) : null}
              </div>

              {rootError ? (
                <p className="text-destructive text-sm" role="alert">
                  {rootError}
                </p>
              ) : null}

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? 'Prijava u toku…' : 'Prijavi se'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
