'use client';

import { FUEL_LOG_FUEL_TYPE_LABELS } from '@rental-admin/shared';
import Link from 'next/link';
import { useState } from 'react';

import { DateField } from '@/components/common/date-field';
import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { FuelConsumptionChart } from '@/features/fuel-logs/components/fuel-consumption-chart';
import { FuelLogsTable } from '@/features/fuel-logs/components/fuel-logs-table';
import { useFuelConsumption } from '@/features/fuel-logs/hooks/use-fuel-consumption';

interface FuelLogsTabProps {
  vehicleId: string;
}

const formatSummary = (avg: number | null, liters: number, km: number | null): string => {
  if (avg === null) {
    return `${liters.toLocaleString('sr-RS')} L`;
  }

  const kmLabel = km !== null ? ` · ${km.toLocaleString('sr-RS')} km` : '';

  return `${avg.toLocaleString('sr-RS')} L/100km · ${liters.toLocaleString('sr-RS')} L${kmLabel}`;
};

export function FuelLogsTab({ vehicleId }: FuelLogsTabProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const query = useFuelConsumption({
    vehicleId,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  });

  const history = query.data;

  return (
    <div className="space-y-6">
      <Card className="shadow-none">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Analiza potrošnje</CardTitle>
            <CardDescription>
              Unos sipanja je na kartici Gorivo. Ovde je pregled samo za ovo vozilo.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/fuel">Otvori Gorivo</Link>
          </Button>
        </CardHeader>
      </Card>

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
      </div>

      {query.isError ? (
        <ErrorState
          error={query.error}
          title="Potrošnja nije učitana"
          retryLabel="Pokušaj ponovo"
          retryingLabel="Učitavanje…"
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">{FUEL_LOG_FUEL_TYPE_LABELS.DIESEL}</CardTitle>
                <CardDescription>
                  {history
                    ? formatSummary(
                        history.diesel.avgConsumptionPer100Km,
                        history.diesel.litersFilled,
                        history.diesel.kmDriven,
                      )
                    : '—'}
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="shadow-none">
              <CardHeader>
                <CardTitle className="text-base">{FUEL_LOG_FUEL_TYPE_LABELS.ADBLUE}</CardTitle>
                <CardDescription>
                  {history
                    ? formatSummary(
                        history.adblue.avgConsumptionPer100Km,
                        history.adblue.litersFilled,
                        history.adblue.kmDriven,
                      )
                    : '—'}
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Potrošnja kroz vreme</CardTitle>
              <CardDescription>L/100km po sipanju, odvojeno dizel i AdBlue.</CardDescription>
            </CardHeader>
            <CardContent>
              <FuelConsumptionChart fuelLogs={history?.items ?? []} />
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle>Istorija sipanja</CardTitle>
              <CardDescription>Samo prikaz. Izmena i unos su na kartici Gorivo.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <FuelLogsTable
                fuelLogs={history?.items ?? []}
                isLoading={query.isPending}
                readOnly
                emptyAction={
                  <Button asChild size="sm">
                    <Link href="/fuel">Unesi sipanje</Link>
                  </Button>
                }
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
