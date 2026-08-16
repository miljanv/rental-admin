'use client';

import type { FuelLogDto } from '@rental-admin/shared';
import { ListPlus, Plus } from 'lucide-react';
import { useState } from 'react';

import { DateField } from '@/components/common/date-field';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DeleteFuelLogDialog } from '@/features/fuel-logs/components/delete-fuel-log-dialog';
import { FuelBulkForm } from '@/features/fuel-logs/components/fuel-bulk-form';
import { FuelLogForm } from '@/features/fuel-logs/components/fuel-log-form';
import { FuelLogsTable } from '@/features/fuel-logs/components/fuel-logs-table';
import { FuelSupplierField } from '@/features/fuel-logs/components/fuel-supplier-field';
import { useFuelLogs } from '@/features/fuel-logs/hooks/use-fuel-logs';
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles';
import { vehicleLabel } from '@/features/vehicles/lib/vehicle';

const ALL = 'all';

type FormMode = 'none' | 'single' | 'bulk';

export function FuelManager() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState(ALL);
  const [supplierFilter, setSupplierFilter] = useState('');
  const [formMode, setFormMode] = useState<FormMode>('none');
  const [editing, setEditing] = useState<FuelLogDto | undefined>(undefined);
  const [logToDelete, setLogToDelete] = useState<FuelLogDto | null>(null);

  const vehiclesQuery = useVehicles({
    page: 1,
    limit: 100,
    sortBy: 'make',
    sortOrder: 'asc',
  });
  const vehicles = vehiclesQuery.data?.vehicles ?? [];

  const query = useFuelLogs({
    ...(vehicleFilter === ALL ? {} : { vehicleId: vehicleFilter }),
    ...(supplierFilter.trim() ? { supplier: supplierFilter.trim() } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    sortOrder: 'desc',
  });

  const fuelLogs = query.data ?? [];
  const closeForm = () => {
    setFormMode('none');
    setEditing(undefined);
  };

  return (
    <>
      <PageHeader
        title="Gorivo"
        description="Unos sipanja sa grupnih računa. Sistem ih razvrstava po vozilu prema registraciji."
        actions={
          formMode === 'none' ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setFormMode('single')}>
                <Plus className="size-4" aria-hidden />
                Pojedinačan unos
              </Button>
              <Button onClick={() => setFormMode('bulk')}>
                <ListPlus className="size-4" aria-hidden />
                Brzi unos
              </Button>
            </div>
          ) : null
        }
      />

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="fuel-from" className="text-xs">
            Od
          </Label>
          <DateField id="fuel-from" value={from} onChange={setFrom} className="w-full sm:w-40" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fuel-to" className="text-xs">
            Do
          </Label>
          <DateField id="fuel-to" value={to} onChange={setTo} className="w-full sm:w-40" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fuel-vehicle-filter" className="text-xs">
            Vozilo
          </Label>
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger id="fuel-vehicle-filter" className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Sva vozila</SelectItem>
              {vehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicleLabel(vehicle)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-full sm:w-48">
          <FuelSupplierField
            id="fuel-supplier-filter"
            listId="fuel-filter-supplier-options"
            value={supplierFilter}
            onChange={setSupplierFilter}
          />
        </div>
      </div>

      {formMode === 'bulk' ? <div className="mb-6"><FuelBulkForm onDone={closeForm} /></div> : null}
      {formMode === 'single' || editing ? (
        <div className="mb-6">
          <FuelLogForm
            key={editing?.id ?? 'new'}
            fuelLog={editing}
            defaultVehicleId={vehicleFilter === ALL ? undefined : vehicleFilter}
            onDone={closeForm}
          />
        </div>
      ) : null}

      {query.isError ? (
        <ErrorState
          error={query.error}
          title="Sipanja nisu učitana"
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Sva sipanja</CardTitle>
            <CardDescription>
              Filteri važe za sva vozila. Potrošnja se računa po vozilu, u odnosu na prethodno stanje km.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <FuelLogsTable
              fuelLogs={fuelLogs}
              isLoading={query.isPending}
              showVehicle
              onEdit={(log) => {
                setEditing(log);
                setFormMode('single');
              }}
              onRequestDelete={setLogToDelete}
              emptyAction={
                <Button size="sm" onClick={() => setFormMode('bulk')}>
                  Brzi unos
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      <DeleteFuelLogDialog
        fuelLog={logToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setLogToDelete(null);
          }
        }}
      />
    </>
  );
}
