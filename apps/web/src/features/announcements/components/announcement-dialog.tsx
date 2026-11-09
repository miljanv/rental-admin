'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  ANNOUNCEMENT_KINDS,
  ANNOUNCEMENT_KIND_LABELS,
  ANNOUNCEMENT_MESSAGE_MAX_LENGTH,
  type AnnouncementDto,
  type AnnouncementKind,
} from '@rental-admin/shared';
import { Controller, useForm, useWatch } from 'react-hook-form';

import { CharacterCounter } from '@/components/common/character-counter';
import { DateTimeField } from '@/components/common/date-time-field';
import { MultiSelectField } from '@/components/common/multi-select-field';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useOrganizations } from '@/features/admin/hooks/use-organizations';
import { useSaveAnnouncement } from '@/features/announcements/hooks/use-save-announcement';
import {
  announcementFormSchema,
  toAnnouncementFormValues,
  toAnnouncementRequest,
  type AnnouncementFormValues,
} from '@/features/announcements/schemas/announcement-form-schema';

function AnnouncementForm({
  announcement,
  onDone,
}: {
  announcement: AnnouncementDto | null;
  onDone: () => void;
}) {
  const mutation = useSaveAnnouncement();
  const organizationsQuery = useOrganizations();
  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: toAnnouncementFormValues(announcement, new Date()),
  });
  const errors = form.formState.errors;
  const message = useWatch({ control: form.control, name: 'message' });
  const allOrganizations = useWatch({ control: form.control, name: 'allOrganizations' });
  const isPending = mutation.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync({
        id: announcement?.id ?? null,
        body: toAnnouncementRequest(values),
      });
      onDone();
    } catch {
      // The mutation reports the failure as a toast and the dialog stays open.
    }
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>{announcement ? 'Izmena obaveštenja' : 'Novo obaveštenje'}</DialogTitle>
        <DialogDescription>
          Prikazuje se na vrhu aplikacije u zadatom periodu. Svaki korisnik ga može zatvoriti.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={onSubmit} noValidate className="space-y-4 overflow-y-auto px-6 pb-6">
        <div className="space-y-1.5">
          <Label htmlFor="announcement-message">Tekst</Label>
          <Textarea
            id="announcement-message"
            rows={3}
            placeholder="npr. Održavanje u nedelju od 22h"
            disabled={isPending}
            aria-invalid={Boolean(errors.message)}
            {...form.register('message')}
          />
          <div className="flex justify-between gap-2">
            <p className="text-destructive text-xs">{errors.message?.message}</p>
            <CharacterCounter current={message.length} max={ANNOUNCEMENT_MESSAGE_MAX_LENGTH} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="announcement-kind">Tip</Label>
          <Controller
            control={form.control}
            name="kind"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(value) => field.onChange(value as AnnouncementKind)}
                disabled={isPending}
              >
                <SelectTrigger id="announcement-kind" className="w-full sm:w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ANNOUNCEMENT_KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {ANNOUNCEMENT_KIND_LABELS[kind]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="announcement-starts-at">Od</Label>
            <Controller
              control={form.control}
              name="startsAt"
              render={({ field }) => (
                <DateTimeField
                  id="announcement-starts-at"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isPending}
                  aria-invalid={Boolean(errors.startsAt)}
                />
              )}
            />
            {errors.startsAt ? (
              <p className="text-destructive text-xs">{errors.startsAt.message}</p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="announcement-ends-at">Do (opciono)</Label>
            <Controller
              control={form.control}
              name="endsAt"
              render={({ field }) => (
                <DateTimeField
                  id="announcement-ends-at"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={isPending}
                  aria-invalid={Boolean(errors.endsAt)}
                />
              )}
            />
            {errors.endsAt ? (
              <p className="text-destructive text-xs">{errors.endsAt.message}</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Controller
            control={form.control}
            name="allOrganizations"
            render={({ field }) => (
              <Label className="flex items-center gap-2 font-normal">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  disabled={isPending}
                />
                Za sve firme
              </Label>
            )}
          />
          {allOrganizations ? null : (
            <Controller
              control={form.control}
              name="organizationIds"
              render={({ field }) => (
                <MultiSelectField
                  options={(organizationsQuery.data ?? []).map((organization) => ({
                    value: organization.id,
                    label: organization.name,
                  }))}
                  selected={field.value}
                  onChange={field.onChange}
                  disabled={isPending}
                  emptyLabel={
                    organizationsQuery.isPending ? 'Učitavanje firmi…' : 'Nema unetih firmi.'
                  }
                />
              )}
            />
          )}
          {errors.organizationIds ? (
            <p className="text-destructive text-xs">{errors.organizationIds.message}</p>
          ) : null}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onDone} disabled={isPending}>
            Otkaži
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Čuvanje…' : announcement ? 'Sačuvaj' : 'Objavi'}
          </Button>
        </div>
      </form>
    </>
  );
}

interface AnnouncementDialogProps {
  /** `undefined` keeps the dialog closed, `null` opens it for a new announcement. */
  announcement: AnnouncementDto | null | undefined;
  onOpenChange: (isOpen: boolean) => void;
}

export function AnnouncementDialog({ announcement, onOpenChange }: AnnouncementDialogProps) {
  return (
    <Dialog open={announcement !== undefined} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {/* Mounted only while open, so every opening starts from the stored values. */}
        {announcement !== undefined ? (
          <AnnouncementForm
            key={announcement?.id ?? 'new'}
            announcement={announcement}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
