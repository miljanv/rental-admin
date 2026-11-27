'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  driverPortalToolCreateSchema,
  driverToolLostSchema,
  driverToolStatusLabel,
  type DriverPortalToolCreateInput,
  type DriverPortalToolCreateRequest,
  type DriverToolDto,
  type DriverToolLostInput,
  type DriverToolLostRequest,
} from '@rental-admin/shared';
import { Info } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { DateField } from '@/components/common/date-field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { PortalMessage } from '@/features/driver-portal/components/portal-shell';
import {
  PortalCard,
  PortalChip,
  PortalFieldLabel,
  PortalRow,
  PortalSectionLabel,
  portalInputClass,
  type PortalTone,
} from '@/features/driver-portal/components/portal-ui';
import { PortalVehicleSelect } from '@/features/driver-portal/components/portal-vehicle-select';
import {
  usePortalToolAction,
  usePortalTools,
} from '@/features/driver-portal/hooks/use-portal-workplace';
import { getApiErrorMessage } from '@/lib/api-error';
import { formatDate, localTodayIso } from '@/lib/format';
import { cn } from '@/lib/utils';

const toolTone = (tool: DriverToolDto): PortalTone => {
  switch (tool.status) {
    case 'CONFIRMED':
      return 'green';
    case 'PENDING':
      return tool.source === 'DRIVER' ? 'blue' : 'amber';
    case 'LOST':
    case 'DECLINED':
      return 'red';
    default:
      return 'neutral';
  }
};

const quantityLabel = (quantity: number): string => (quantity === 1 ? '1 kom' : `${quantity} kom`);

const toolSubtitle = (tool: DriverToolDto): string =>
  [
    quantityLabel(tool.quantity),
    tool.source === 'DRIVER'
      ? `upisali ste ${formatDate(tool.assignedAt)}`
      : `od ${formatDate(tool.assignedAt)}`,
    tool.vehicle?.licensePlate ?? null,
  ]
    .filter(Boolean)
    .join(' · ');

/** "Prijavi gubitak" under one confirmed tool: when it went missing and how. */
function LostForm({
  token,
  tool,
  onDone,
}: {
  token: string;
  tool: DriverToolDto;
  onDone: () => void;
}) {
  const mutation = usePortalToolAction(token);
  const form = useForm<DriverToolLostInput, unknown, DriverToolLostRequest>({
    resolver: zodResolver(driverToolLostSchema),
    defaultValues: { lostAt: localTodayIso(), lostNote: '' },
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (input) => {
    try {
      await mutation.mutateAsync({ kind: 'lost', toolId: tool.id, input });
      onDone();
    } catch {
      // Toast from the mutation.
    }
  });

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-3 border-b px-4 pb-4 last:border-b-0"
    >
      <Controller
        control={form.control}
        name="lostAt"
        render={({ field }) => (
          <div>
            <PortalFieldLabel htmlFor={`lost-at-${tool.id}`}>Kada je izgubljen</PortalFieldLabel>
            <DateField
              id={`lost-at-${tool.id}`}
              value={field.value}
              onChange={field.onChange}
              max={localTodayIso()}
              disabled={mutation.isPending}
              className="w-full"
              inputClassName={portalInputClass}
            />
          </div>
        )}
      />
      <div>
        <PortalFieldLabel htmlFor={`lost-note-${tool.id}`}>Kako je izgubljen</PortalFieldLabel>
        <Input
          id={`lost-note-${tool.id}`}
          placeholder="npr. ostao na pumpi u Šidu"
          disabled={mutation.isPending}
          aria-invalid={Boolean(errors.lostNote)}
          className={portalInputClass}
          {...form.register('lostNote')}
        />
        {errors.lostNote?.message ? (
          <p className="text-destructive mt-1 text-xs">{errors.lostNote.message}</p>
        ) : null}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onDone}
          className="bg-card h-11 rounded-xl border text-sm font-semibold"
        >
          Odustani
        </button>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-primary text-primary-foreground h-11 rounded-xl text-sm font-semibold disabled:opacity-60"
        >
          Prijavi gubitak
        </button>
      </div>
    </form>
  );
}

/** "+ Upiši alat koji ste preuzeli": a tool the office has not listed yet. */
function AddToolForm({ token, onDone }: { token: string; onDone: () => void }) {
  const mutation = usePortalToolAction(token);
  const form = useForm<DriverPortalToolCreateInput, unknown, DriverPortalToolCreateRequest>({
    resolver: zodResolver(driverPortalToolCreateSchema),
    defaultValues: { name: '', quantity: 1, vehicleId: '', note: '' },
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (input) => {
    try {
      await mutation.mutateAsync({ kind: 'add', input });
      onDone();
    } catch {
      // Toast from the mutation.
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate>
      <PortalCard className="border-foreground flex flex-col gap-4 border-[1.5px] p-[18px]">
        <h2 className="text-base font-bold">Alat koji ste preuzeli</h2>
        <div className="grid grid-cols-[1fr_96px] gap-2.5">
          <div>
            <PortalFieldLabel htmlFor="tool-name">Naziv</PortalFieldLabel>
            <Input
              id="tool-name"
              placeholder="npr. Lanci za sneg"
              disabled={mutation.isPending}
              aria-invalid={Boolean(errors.name)}
              className={portalInputClass}
              {...form.register('name')}
            />
          </div>
          <div>
            <PortalFieldLabel htmlFor="tool-quantity">Količina</PortalFieldLabel>
            <Input
              id="tool-quantity"
              type="number"
              inputMode="numeric"
              disabled={mutation.isPending}
              aria-invalid={Boolean(errors.quantity)}
              className={portalInputClass}
              {...form.register('quantity', { valueAsNumber: true })}
            />
          </div>
        </div>
        {errors.name?.message || errors.quantity?.message ? (
          <p className="text-destructive -mt-2 text-xs">
            {errors.name?.message ?? errors.quantity?.message}
          </p>
        ) : null}
        <Controller
          control={form.control}
          name="vehicleId"
          render={({ field }) => (
            <div>
              <PortalFieldLabel htmlFor="tool-vehicle" optional>
                Vozilo
              </PortalFieldLabel>
              <PortalVehicleSelect
                token={token}
                id="tool-vehicle"
                value={typeof field.value === 'string' ? field.value : ''}
                onChange={field.onChange}
                disabled={mutation.isPending}
                allowNone
              />
            </div>
          )}
        />
        <div>
          <PortalFieldLabel htmlFor="tool-note" optional>
            Napomena
          </PortalFieldLabel>
          <Input
            id="tool-note"
            disabled={mutation.isPending}
            className={portalInputClass}
            {...form.register('note')}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onDone}
            className="bg-card h-12 rounded-xl border text-sm font-semibold"
          >
            Odustani
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="bg-foreground text-background h-12 rounded-xl text-sm font-semibold disabled:opacity-60"
          >
            Upiši alat
          </button>
        </div>
      </PortalCard>
    </form>
  );
}

/** Zaduženje alata: confirm what the office listed, report a loss, write down a tool taken. */
export function PortalTools({ token }: { token: string }) {
  const tools = usePortalTools(token);
  const mutation = usePortalToolAction(token);
  const [lostFor, setLostFor] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  if (tools.isPending) {
    return <Skeleton className="h-48 w-full rounded-2xl" />;
  }

  if (tools.isError) {
    return <PortalMessage title="Alat nije učitan" description={getApiErrorMessage(tools.error)} />;
  }

  const waiting = tools.data.filter(
    (tool) => tool.source === 'OFFICE' && tool.status === 'PENDING',
  );
  const held = tools.data.filter(
    (tool) =>
      tool.status === 'CONFIRMED' || (tool.source === 'DRIVER' && tool.status === 'PENDING'),
  );
  const problems = tools.data.filter(
    (tool) => tool.status === 'LOST' || tool.status === 'DECLINED',
  );
  const confirmedCount = tools.data.filter((tool) => tool.status === 'CONFIRMED').length;

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-card flex items-start gap-2.5 rounded-[14px] border p-3.5 text-[13px] leading-relaxed">
        <Info className="mt-px size-[18px] shrink-0" aria-hidden />
        Za alat na ovom spisku odgovarate dok ga ne razdužite u kancelariji. Proverite stavke i
        potvrdite one koje ste primili. Ako nešto izgubite, prijavite to ovde.
      </div>

      <div className="grid grid-cols-2 gap-2">
        <PortalCard className="p-3.5">
          <p className="text-muted-foreground text-xs">Zaduženo</p>
          <p className="mt-0.5 text-[22px] font-bold">{confirmedCount}</p>
        </PortalCard>
        <PortalCard className="p-3.5">
          <p className="text-muted-foreground text-xs">Čeka vašu potvrdu</p>
          <p
            className={cn(
              'mt-0.5 text-[22px] font-bold',
              waiting.length > 0 && 'text-amber-700 dark:text-amber-400',
            )}
          >
            {waiting.length}
          </p>
        </PortalCard>
      </div>

      {waiting.length > 0 ? (
        <section className="mt-2 flex flex-col gap-2.5">
          <PortalSectionLabel>Čeka potvrdu</PortalSectionLabel>
          {waiting.map((tool) => (
            <PortalCard
              key={tool.id}
              className="flex flex-col gap-3 border-[1.5px] border-amber-500 p-4"
            >
              <div>
                <p className="text-[15px] font-semibold">{tool.name}</p>
                <p className="text-muted-foreground mt-0.5 text-[13px]">
                  {quantityLabel(tool.quantity)} · upisala kancelarija {formatDate(tool.assignedAt)}
                  {tool.vehicle ? ` · ${tool.vehicle.licensePlate}` : ''}
                </p>
                {tool.note ? <p className="mt-1 text-[13px]">{tool.note}</p> : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() =>
                    mutation.mutate({ kind: 'respond', toolId: tool.id, action: 'DECLINE' })
                  }
                  className="bg-card h-11 rounded-xl border text-sm font-semibold disabled:opacity-60"
                >
                  Nisam primio
                </button>
                <button
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() =>
                    mutation.mutate({ kind: 'respond', toolId: tool.id, action: 'CONFIRM' })
                  }
                  className="bg-foreground text-background h-11 rounded-xl text-sm font-semibold disabled:opacity-60"
                >
                  Potvrđujem
                </button>
              </div>
            </PortalCard>
          ))}
          {waiting.length > 1 ? (
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => mutation.mutate({ kind: 'confirm-all' })}
              className="bg-primary text-primary-foreground h-12 rounded-xl text-[15px] font-semibold disabled:opacity-60"
            >
              Potvrđujem sve ({waiting.length})
            </button>
          ) : null}
        </section>
      ) : null}

      <section className="mt-2 flex flex-col gap-2.5">
        <PortalSectionLabel>Zaduženi alat</PortalSectionLabel>
        {held.length === 0 ? (
          <p className="text-muted-foreground px-1 text-sm">Trenutno nemate zaduženog alata.</p>
        ) : (
          <PortalCard className="overflow-hidden">
            {held.map((tool) => (
              <div key={tool.id} className="border-b last:border-b-0">
                <PortalRow
                  className="border-b-0"
                  title={tool.name}
                  subtitle={toolSubtitle(tool)}
                  aside={
                    tool.status === 'CONFIRMED' && lostFor !== tool.id ? (
                      <div className="flex flex-col items-end gap-1.5">
                        <PortalChip tone="green">Potvrđeno</PortalChip>
                        <button
                          type="button"
                          onClick={() => setLostFor(tool.id)}
                          className="text-destructive text-xs font-semibold"
                        >
                          Prijavi gubitak
                        </button>
                      </div>
                    ) : (
                      <PortalChip tone={toolTone(tool)}>{driverToolStatusLabel(tool)}</PortalChip>
                    )
                  }
                />
                {lostFor === tool.id ? (
                  <LostForm token={token} tool={tool} onDone={() => setLostFor(null)} />
                ) : null}
              </div>
            ))}
          </PortalCard>
        )}
      </section>

      {problems.length > 0 ? (
        <section className="mt-2 flex flex-col gap-2.5">
          <PortalSectionLabel>Izgubljeno ili nije primljeno</PortalSectionLabel>
          <PortalCard className="overflow-hidden">
            {problems.map((tool) => (
              <PortalRow
                key={tool.id}
                title={tool.name}
                subtitle={
                  tool.status === 'LOST' && tool.lostAt
                    ? `${quantityLabel(tool.quantity)} · ${formatDate(tool.lostAt)} · ${tool.lostNote ?? ''}`
                    : quantityLabel(tool.quantity)
                }
                aside={<PortalChip tone="red">{driverToolStatusLabel(tool)}</PortalChip>}
              />
            ))}
          </PortalCard>
        </section>
      ) : null}

      {adding ? (
        <AddToolForm token={token} onDone={() => setAdding(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="bg-card border-foreground h-12 rounded-xl border text-sm font-semibold"
        >
          + Upiši alat koji ste preuzeli
        </button>
      )}
    </div>
  );
}
