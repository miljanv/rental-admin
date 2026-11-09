'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  userPasswordResetSchema,
  type ManagedUserDto,
  type UserPasswordResetRequest,
} from '@rental-admin/shared';
import { KeyRound } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useResetUserPassword } from '@/features/admin/hooks/use-reset-user-password';
import { generatePassword } from '@/features/admin/lib/generate-password';

function ResetPasswordForm({ user, onDone }: { user: ManagedUserDto; onDone: () => void }) {
  const mutation = useResetUserPassword();
  const form = useForm<UserPasswordResetRequest>({
    resolver: zodResolver(userPasswordResetSchema),
    defaultValues: { password: generatePassword() },
  });
  const error = form.formState.errors.password;

  const onSubmit = form.handleSubmit(async ({ password }) => {
    try {
      await mutation.mutateAsync({ id: user.id, password });
      onDone();
    } catch {
      // The mutation reports the failure as a toast and the dialog stays open.
    }
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Resetuj lozinku</DialogTitle>
        <DialogDescription>
          {user.username} se odmah odjavljuje sa svih uređaja. Pošaljite mu privremenu lozinku; pri
          prvoj prijavi biraće svoju.
        </DialogDescription>
      </DialogHeader>

      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="reset-password">Privremena lozinka</Label>
          <div className="flex gap-2">
            <Input
              id="reset-password"
              autoComplete="off"
              spellCheck={false}
              className="font-mono"
              disabled={mutation.isPending}
              aria-invalid={Boolean(error)}
              {...form.register('password')}
            />
            <Button
              type="button"
              variant="outline"
              className="gap-2"
              disabled={mutation.isPending}
              onClick={() =>
                form.setValue('password', generatePassword(), { shouldValidate: true })
              }
            >
              <KeyRound className="size-4" aria-hidden />
              Generiši
            </Button>
          </div>
          {error ? <p className="text-destructive text-xs">{error.message}</p> : null}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDone} disabled={mutation.isPending}>
            Otkaži
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Resetovanje…' : 'Resetuj lozinku'}
          </Button>
        </div>
      </form>
    </>
  );
}

interface ResetPasswordDialogProps {
  user: ManagedUserDto | null;
  onOpenChange: (isOpen: boolean) => void;
}

export function ResetPasswordDialog({ user, onOpenChange }: ResetPasswordDialogProps) {
  return (
    <Dialog open={user !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {/* Mounted only while open, so every opening proposes a fresh password. */}
        {user ? (
          <ResetPasswordForm key={user.id} user={user} onDone={() => onOpenChange(false)} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
