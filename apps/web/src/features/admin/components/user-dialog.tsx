'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { USER_ROLE_LABELS, USER_ROLES, type ManagedUserDto } from '@rental-admin/shared';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateUser } from '@/features/admin/hooks/use-create-user';
import { useOrganizations } from '@/features/admin/hooks/use-organizations';
import { useUpdateUser } from '@/features/admin/hooks/use-update-user';
import {
  EMPTY_USER_FORM,
  createUserFormSchema,
  toUserCreateRequest,
  toUserUpdateRequest,
  userToFormValues,
  type UserFormValues,
} from '@/features/admin/schemas/user-form-schema';

interface UserFormProps {
  user: ManagedUserDto | null;
  /** Your own account: its role and status cannot be changed from here. */
  isSelf: boolean;
  onDone: () => void;
}

function UserForm({ user, isSelf, onDone }: UserFormProps) {
  const isEdit = user !== null;
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const organizations = useOrganizations();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<UserFormValues>({
    resolver: zodResolver(createUserFormSchema(isEdit ? 'edit' : 'create')),
    defaultValues: user ? userToFormValues(user) : EMPTY_USER_FORM,
  });
  const errors = form.formState.errors;
  const role = useWatch({ control: form.control, name: 'role' });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (user) {
        await updateMutation.mutateAsync({ id: user.id, body: toUserUpdateRequest(values) });
      } else {
        await createMutation.mutateAsync(toUserCreateRequest(values));
      }

      onDone();
    } catch {
      // The mutation reports the failure as a toast and the dialog stays open.
    }
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEdit ? 'Izmena korisnika' : 'Novi korisnik'}</DialogTitle>
        <DialogDescription>
          Korisnik vidi i menja samo podatke svoje firme. Superadmin upravlja firmama i nalozima.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} noValidate className="space-y-4 overflow-y-auto px-6 pb-6">
        <div className="space-y-1.5">
          <Label htmlFor="user-username">Korisničko ime</Label>
          <Input
            id="user-username"
            autoComplete="off"
            disabled={isPending}
            aria-invalid={Boolean(errors.username)}
            {...form.register('username')}
          />
          {errors.username ? (
            <p className="text-destructive text-xs">{errors.username.message}</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="user-password">{isEdit ? 'Nova lozinka' : 'Lozinka'}</Label>
          <Input
            id="user-password"
            type="password"
            autoComplete="new-password"
            placeholder={isEdit ? 'Ostavite prazno da ostane ista' : undefined}
            disabled={isPending}
            aria-invalid={Boolean(errors.password)}
            {...form.register('password')}
          />
          {errors.password ? (
            <p className="text-destructive text-xs">{errors.password.message}</p>
          ) : null}
        </div>

        <Controller
          control={form.control}
          name="role"
          render={({ field }) => (
            <div className="space-y-1.5">
              <Label htmlFor="user-role">Uloga</Label>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isPending || isSelf}
              >
                <SelectTrigger id="user-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {USER_ROLE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />

        <Controller
          control={form.control}
          name="organizationId"
          render={({ field }) => (
            <div className="space-y-1.5">
              <Label htmlFor="user-organization">Firma</Label>
              <Select
                value={role === 'SUPERADMIN' ? '' : field.value}
                onValueChange={field.onChange}
                disabled={isPending || role === 'SUPERADMIN'}
              >
                <SelectTrigger id="user-organization" className="w-full">
                  <SelectValue
                    placeholder={
                      role === 'SUPERADMIN' ? 'Superadmin nema firmu' : 'Izaberite firmu'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {(organizations.data ?? []).map((organization) => (
                    <SelectItem key={organization.id} value={organization.id}>
                      {organization.name}
                      {organization.isActive ? '' : ' (neaktivna)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.organizationId ? (
                <p className="text-destructive text-xs">{errors.organizationId.message}</p>
              ) : null}
            </div>
          )}
        />

        <Controller
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <div className="flex items-start gap-3">
              <Checkbox
                id="user-active"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                disabled={isPending || isSelf}
              />
              <div className="space-y-0.5">
                <Label htmlFor="user-active">Aktivan nalog</Label>
                <p className="text-muted-foreground text-xs">
                  {isSelf
                    ? 'Ne možete deaktivirati sopstveni nalog.'
                    : 'Deaktiviran korisnik se odmah odjavljuje i ne može da se prijavi.'}
                </p>
              </div>
            </div>
          )}
        />

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
            Otkaži
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Čuvanje…' : isEdit ? 'Sačuvaj izmene' : 'Dodaj korisnika'}
          </Button>
        </div>
      </form>
    </>
  );
}

interface UserDialogProps {
  open: boolean;
  /** Null creates a new user. */
  user: ManagedUserDto | null;
  currentUserId: string;
  onOpenChange: (isOpen: boolean) => void;
}

export function UserDialog({ open, user, currentUserId, onOpenChange }: UserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {/* Mounted only while open, so every opening starts from fresh values. */}
        {open ? (
          <UserForm
            key={user?.id ?? 'new'}
            user={user}
            isSelf={user?.id === currentUserId}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
