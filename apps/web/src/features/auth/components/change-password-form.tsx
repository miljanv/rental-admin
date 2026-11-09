'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  changePasswordFormSchema,
  type ChangePasswordFormValues,
} from '@/features/auth/schemas/change-password-schema';
import { getApiErrorMessage } from '@/lib/api-error';
import { useAuth } from '@/providers/auth-provider';

const FIELDS = [
  { name: 'currentPassword', label: 'Trenutna lozinka', autoComplete: 'current-password' },
  { name: 'newPassword', label: 'Nova lozinka', autoComplete: 'new-password' },
  { name: 'confirmPassword', label: 'Ponovite novu lozinku', autoComplete: 'new-password' },
] as const;

export function ChangePasswordForm({ submitLabel }: { submitLabel: string }) {
  const { changePassword } = useAuth();
  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = form.handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await changePassword({ currentPassword, newPassword });
      form.reset();
      toast.success('Lozinka je promenjena.', {
        description: 'Ostali uređaji su odjavljeni.',
      });
    } catch (error) {
      form.setError('root', { message: getApiErrorMessage(error) });
    }
  });

  const { errors, isSubmitting } = form.formState;

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      {FIELDS.map((field) => (
        <div key={field.name} className="space-y-1.5">
          <Label htmlFor={field.name}>{field.label}</Label>
          <Input
            id={field.name}
            type="password"
            autoComplete={field.autoComplete}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors[field.name])}
            {...form.register(field.name)}
          />
          {errors[field.name] ? (
            <p className="text-destructive text-xs">{errors[field.name]?.message}</p>
          ) : null}
        </div>
      ))}

      {errors.root?.message ? (
        <p className="text-destructive text-sm" role="alert">
          {errors.root.message}
        </p>
      ) : null}

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Čuvanje…' : submitLabel}
      </Button>
    </form>
  );
}
