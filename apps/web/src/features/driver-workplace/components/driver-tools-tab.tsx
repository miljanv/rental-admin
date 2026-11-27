'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  driverToolStatusLabel,
  driverToolWriteSchema,
  type DriverToolDto,
  type DriverToolWriteInput,
  type DriverToolWriteRequest,
} from '@rental-admin/shared';
import { Hammer, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { DateField } from '@/components/common/date-field';
import { EmptyState } from '@/components/common/empty-state';
import { ErrorState } from '@/components/common/error-state';
import { TableSkeleton } from '@/components/common/table-skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useDriverToolMutation,
  useDriverTools,
} from '@/features/driver-workplace/hooks/use-driver-workplace';
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles';
import { formatDate, localTodayIso } from '@/lib/format';

const NO_VEHICLE = '__none__';

const statusVariant = (tool: DriverToolDto) => {
  switch (tool.status) {
    case 'CONFIRMED':
      return 'secondary' as const;
    case 'LOST':
    case 'DECLINED':
      return 'destructive' as const;
    case 'PENDING':
      return tool.source === 'DRIVER' ? ('default' as const) : ('outline' as const);
    default:
      return 'outline' as const;
  }
};

const toolValues = (tool: DriverToolDto | null): DriverToolWriteInput => ({
  name: tool?.name ?? '',
  quantity: tool?.quantity ?? 1,
  vehicleId: tool?.vehicle?.id ?? '',
  assignedAt: tool?.assignedAt ?? localTodayIso(),
  note: tool?.note ?? '',
});

function ToolDialog({
  driverId,
  tool,
  open,
  onOpenChange,
}: {
  driverId: string;
  tool: DriverToolDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const mutation = useDriverToolMutation(driverId);
  const vehiclesQuery = useVehicles({
    page: 1,
    limit: 100,
    sortBy: 'make',
    sortOrder: 'asc',
    enabled: true,
  });
  const form = useForm<DriverToolWriteInput, unknown, DriverToolWriteRequest>({
    resolver: zodResolver(driverToolWriteSchema),
    values: toolValues(tool),
  });
  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (input) => {
    try {
      await mutation.mutateAsync(
        tool ? { kind: 'update', toolId: tool.id, input } : { kind: 'create', input },
      );
      onOpenChange(false);
    } catch {
      // Toast from the mutation.
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{tool ? 'Izmena alata' : 'Zaduži alat'}</DialogTitle>
          <DialogDescription>
            Vozač potvrđuje alat u portalu. Ako promenite naziv ili količinu, potvrđuje ponovo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="space-y-4 overflow-y-auto px-6 pb-6">
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tool-name">Naziv</Label>
              <Input
                id="tool-name"
                placeholder="npr. Dizalica"
                aria-invalid={Boolean(errors.name)}
                {...form.register('name')}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tool-quantity">Količina</Label>
              <Input
                id="tool-quantity"
                type="number"
                inputMode="numeric"
                aria-invalid={Boolean(errors.quantity)}
                {...form.register('quantity', { valueAsNumber: true })}
              />
            </div>
          </div>
          {errors.name?.message || errors.quantity?.message ? (
            <p className="text-destructive text-xs">
              {errors.name?.message ?? errors.quantity?.message}
            </p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="vehicleId"
              render={({ field }) => (
                <div className="space-y-1.5">
                  <Label htmlFor="tool-vehicle">Vozilo (opciono)</Label>
                  <Select
                    value={
                      typeof field.value === 'string' && field.value ? field.value : NO_VEHICLE
                    }
                    onValueChange={(value) => field.onChange(value === NO_VEHICLE ? '' : value)}
                  >
                    <SelectTrigger id="tool-vehicle" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_VEHICLE}>Bez vozila</SelectItem>
                      {(vehiclesQuery.data?.vehicles ?? []).map((vehicle) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          {vehicle.licensePlate} · {vehicle.make} {vehicle.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            />
            <Controller
              control={form.control}
              name="assignedAt"
              render={({ field }) => (
                <div className="space-y-1.5">
                  <Label htmlFor="tool-assigned">Datum zaduženja</Label>
                  <DateField
                    id="tool-assigned"
                    value={field.value}
                    onChange={field.onChange}
                    aria-invalid={Boolean(errors.assignedAt)}
                  />
                </div>
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tool-note">Napomena (opciono)</Label>
            <Input id="tool-note" {...form.register('note')} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Odustani
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              Sačuvaj
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Tools listed on a driver: the driver confirms them in the portal and answers for them. */
export function DriverToolsTab({ driverId }: { driverId: string }) {
  const query = useDriverTools(driverId);
  const mutation = useDriverToolMutation(driverId);
  const [editing, setEditing] = useState<DriverToolDto | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const openDialog = (tool: DriverToolDto | null) => {
    setEditing(tool);
    setDialogOpen(true);
  };

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Zaduženje alata</CardTitle>
          <CardDescription>
            Vozač vidi spisak u portalu, potvrđuje šta je primio i prijavljuje gubitak.
          </CardDescription>
        </div>
        <Button type="button" size="sm" onClick={() => openDialog(null)}>
          <Plus className="size-4" aria-hidden />
          Zaduži alat
        </Button>
      </CardHeader>
      <CardContent className="px-0">
        {query.isError ? (
          <ErrorState
            error={query.error}
            title="Alat nije učitan"
            retryLabel="Pokušaj ponovo"
            retryingLabel="Učitavanje…"
            onRetry={() => void query.refetch()}
            isRetrying={query.isFetching}
          />
        ) : !query.data ? (
          <TableSkeleton columns={5} rows={3} />
        ) : query.data.length === 0 ? (
          <EmptyState
            icon={Hammer}
            title="Vozač nema zaduženog alata"
            description="Dodajte alat koji vozač nosi; on ga potvrđuje u portalu."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alat</TableHead>
                <TableHead>Vozilo</TableHead>
                <TableHead>Zadužen</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.data.map((tool) => (
                <TableRow key={tool.id}>
                  <TableCell>
                    <p className="font-medium">
                      {tool.name}{' '}
                      <span className="text-muted-foreground font-normal">× {tool.quantity}</span>
                    </p>
                    {tool.source === 'DRIVER' ? (
                      <p className="text-muted-foreground text-xs">Upisao vozač</p>
                    ) : null}
                    {tool.note ? (
                      <p className="text-muted-foreground text-xs">{tool.note}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>{tool.vehicle?.licensePlate ?? '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(tool.assignedAt)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(tool)}>{driverToolStatusLabel(tool)}</Badge>
                    {tool.status === 'LOST' ? (
                      <p className="text-destructive mt-1 text-xs">
                        {tool.lostAt ? formatDate(tool.lostAt) : ''} · {tool.lostNote}
                      </p>
                    ) : null}
                    {tool.status === 'RETURNED' && tool.returnedAt ? (
                      <p className="text-muted-foreground mt-1 text-xs">
                        {formatDate(tool.returnedAt)}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {tool.source === 'DRIVER' && tool.status === 'PENDING' ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={mutation.isPending}
                          onClick={() =>
                            mutation.mutate({
                              kind: 'action',
                              toolId: tool.id,
                              input: { action: 'CONFIRM' },
                            })
                          }
                        >
                          Potvrdi
                        </Button>
                      ) : null}
                      {tool.status !== 'RETURNED' ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={mutation.isPending}
                          onClick={() =>
                            mutation.mutate({
                              kind: 'action',
                              toolId: tool.id,
                              input: { action: 'RETURN' },
                            })
                          }
                        >
                          {tool.status === 'LOST' || tool.status === 'DECLINED'
                            ? 'Zatvori'
                            : 'Razduži'}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Izmeni ${tool.name}`}
                        onClick={() => openDialog(tool)}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Obriši ${tool.name}`}
                        disabled={mutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Obrisati „${tool.name}“ iz zaduženja?`)) {
                            mutation.mutate({ kind: 'delete', toolId: tool.id });
                          }
                        }}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <ToolDialog
        driverId={driverId}
        tool={editing}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </Card>
  );
}
