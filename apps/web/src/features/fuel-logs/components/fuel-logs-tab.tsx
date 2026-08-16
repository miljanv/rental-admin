'use client';

import {
  FUEL_LOG_FUEL_TYPE_LABELS,
  FUEL_LOG_FUEL_TYPES,
  type FuelLogDto,
  type FuelLogFuelType,
} from '@rental-admin/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { DateField } from '@/components/common/date-field';
import { ErrorState } from '@/components/common/error-state';
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
import { FuelConsumptionChart } from '@/features/fuel-logs/components/fuel-consumption-chart';
import { FuelLogForm } from '@/features/fuel-logs/components/fuel-log-form';
import { FuelLogsTable } from '@/features/fuel-logs/components/fuel-logs-table';
import { useFuelLogs } from '@/features/fuel-logs/hooks/use-fuel-logs';
import { useDrivers } from '@/features/drivers/hooks/use-drivers';

interface FuelLogsTabProps {
  vehicleId: string;
}

const ALL_FUEL_TYPES = 'all';
const ALL_DRIVERS = 'all';

export function FuelLogsTab({ vehicleId }: FuelLogsTabProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [fuelTypeFilter, setFuelTypeFilter] = useState<typeof ALL_FUEL_TYPES | FuelLogFuelType>(
    ALL_FUEL_TYPES,
  );
  const [driverFilter, setDriverFilter] = useState<typeof ALL_DRIVERS | string>(ALL_DRIVERS);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<FuelLogDto | undefined>(undefined);
  const [logToDelete, setLogToDelete] = useState<FuelLogDto | null>(null);

  const driversQuery = useDrivers({ page: 1, limit: 100, sortBy: 'lastName', sortOrder: 'asc' });
  const drivers = driversQuery.data?.drivers ?? [];

  const fuelType = fuelTypeFilter === ALL_FUEL_TYPES ? undefined : fuelTypeFilter;
  const driverId = driverFilter === ALL_DRIVERS ? undefined : driverFilter;
  const query = useFuelLogs(vehicleId, {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(fuelType ? { fuelType } : {}),
    ...(driverId ? { driverId } : {}),
    sortOrder: 'desc',
  });

  const fuelLogs = query.data ?? [];
  const openCreate = () => {
    setEditing(undefined);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
          <Label htmlFor="fuel-type-filter" className="text-xs">
            Tip goriva
          </Label>
          <Select
            value={fuelTypeFilter}
            onValueChange={(value) => setFuelTypeFilter(value as typeof ALL_FUEL_TYPES | FuelLogFuelType)}
          >
            <SelectTrigger id="fuel-type-filter" className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FUEL_TYPES}>Sve</SelectItem>
              {FUEL_LOG_FUEL_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {FUEL_LOG_FUEL_TYPE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fuel-driver-filter" className="text-xs">
            Vozač
          </Label>
          <Select value={driverFilter} onValueChange={setDriverFilter}>
            <SelectTrigger id="fuel-driver-filter" className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_DRIVERS}>Svi vozači</SelectItem>
              {drivers.map((driver) => (
                <SelectItem key={driver.id} value={driver.id}>
                  {driver.firstName} {driver.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="shadow-none">
        <CardHeader>
          <CardTitle>Potrošnja kroz vreme</CardTitle>
          <CardDescription>L/100km po točenju, odvojeno dizel i AdBlue.</CardDescription>
        </CardHeader>
        <CardContent>
          {query.isError ? (
            <ErrorState
              error={query.error}
              title="Grafikon nije učitan"
              retryLabel="Pokušaj ponovo"
              retryingLabel="Učitavanje…"
              onRetry={() => void query.refetch()}
              isRetrying={query.isFetching}
            />
          ) : (
            <FuelConsumptionChart fuelLogs={fuelLogs} />
          )}
        </CardContent>
      </Card>

      {isFormOpen ? (
        <FuelLogForm
          key={editing?.id ?? 'new'}
          vehicleId={vehicleId}
          fuelLog={editing}
          onDone={() => {
            setIsFormOpen(false);
            setEditing(undefined);
          }}
        />
      ) : null}

      <Card className="shadow-none">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Istorija točenja</CardTitle>
            <CardDescription>Gorivo i AdBlue, sa automatski izračunatom potrošnjom.</CardDescription>
          </div>
          {isFormOpen ? null : (
            <Button onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              Dodaj točenje
            </Button>
          )}
        </CardHeader>
        <CardContent className="px-0">
          {query.isError ? null : (
            <FuelLogsTable
              fuelLogs={fuelLogs}
              isLoading={query.isPending}
              onEdit={(log) => {
                setEditing(log);
                setIsFormOpen(true);
              }}
              onRequestDelete={setLogToDelete}
              emptyAction={
                <Button size="sm" onClick={openCreate}>
                  Dodaj točenje
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      <DeleteFuelLogDialog
        vehicleId={vehicleId}
        fuelLog={logToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setLogToDelete(null);
          }
        }}
      />
    </div>
  );
}
