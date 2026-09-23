'use client';

import type { CompanyExpenseDto } from '@rental-admin/shared';
import { Plus } from 'lucide-react';
import { useState } from 'react';

import { DateField } from '@/components/common/date-field';
import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CompanyExpenseForm } from '@/features/company-expenses/components/company-expense-form';
import { CompanyExpensesTable } from '@/features/company-expenses/components/company-expenses-table';
import { DeleteCompanyExpenseDialog } from '@/features/company-expenses/components/delete-company-expense-dialog';
import { useCompanyExpenseSummary } from '@/features/company-expenses/hooks/use-company-expense-summary';
import { useCompanyExpenses } from '@/features/company-expenses/hooks/use-company-expenses';
import { useVehicles } from '@/features/vehicles/hooks/use-vehicles';
import { vehicleLabel } from '@/features/vehicles/lib/vehicle';
import { formatMoney } from '@/lib/format';

const ALL = 'all';
const COMMON = 'common';

export function CompanyExpenseManager() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState(ALL);
  const [supplierFilter, setSupplierFilter] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyExpenseDto | undefined>(undefined);
  const [expenseToDelete, setExpenseToDelete] = useState<CompanyExpenseDto | null>(null);

  const vehiclesQuery = useVehicles({
    page: 1,
    limit: 100,
    sortBy: 'make',
    sortOrder: 'asc',
  });
  const vehicles = vehiclesQuery.data?.vehicles ?? [];

  const params = {
    ...(vehicleFilter === ALL || vehicleFilter === COMMON ? {} : { vehicleId: vehicleFilter }),
    ...(vehicleFilter === COMMON ? { commonOnly: true } : {}),
    ...(supplierFilter.trim() ? { supplier: supplierFilter.trim() } : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    sortBy: 'issuedAt' as const,
    sortOrder: 'desc' as const,
  };
  const query = useCompanyExpenses(params);
  const summaryQuery = useCompanyExpenseSummary(params);
  const expenses = query.data ?? [];

  const closeForm = () => {
    setIsFormOpen(false);
    setEditing(undefined);
  };

  const openCreate = () => {
    setEditing(undefined);
    setIsFormOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Troškovi"
        description="Računi i keš troškovi firme, sa opcijom vezivanja za vozilo i kilometražu."
        actions={
          isFormOpen ? null : (
            <Button onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              Dodaj trošak
            </Button>
          )
        }
      />

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Bez PDV-a</CardDescription>
            <CardTitle className="text-2xl">
              {formatMoney(summaryQuery.data?.totalWithoutVat ?? 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            {summaryQuery.data?.count ?? 0} zapisa
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>PDV</CardDescription>
            <CardTitle className="text-2xl">{formatMoney(summaryQuery.data?.totalVat ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Ulazni PDV
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <CardDescription>Ukupno sa PDV-om</CardDescription>
            <CardTitle className="text-2xl">{formatMoney(summaryQuery.data?.total ?? 0)}</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground text-sm">
            Plaćeno {formatMoney(summaryQuery.data?.paidTotal ?? 0)} · otvoreno{' '}
            {formatMoney(summaryQuery.data?.unpaidTotal ?? 0)}
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="expense-from" className="text-xs">
            Od
          </Label>
          <DateField
            id="expense-from"
            value={from}
            onChange={setFrom}
            className="w-full sm:w-40"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expense-to" className="text-xs">
            Do
          </Label>
          <DateField id="expense-to" value={to} onChange={setTo} className="w-full sm:w-40" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expense-vehicle-filter" className="text-xs">
            Mesto utroška
          </Label>
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger id="expense-vehicle-filter" className="w-full sm:w-60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Sva mesta</SelectItem>
              <SelectItem value={COMMON}>Zajednički troškovi</SelectItem>
              {vehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicleLabel(vehicle)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="expense-supplier-filter" className="text-xs">
            Dobavljač
          </Label>
          <Input
            id="expense-supplier-filter"
            value={supplierFilter}
            onChange={(event) => setSupplierFilter(event.target.value)}
            className="w-full sm:w-48"
          />
        </div>
      </div>

      {isFormOpen ? (
        <div className="mb-6">
          <CompanyExpenseForm
            key={editing?.id ?? 'new'}
            expense={editing}
            defaultVehicleId={
              vehicleFilter === ALL || vehicleFilter === COMMON ? undefined : vehicleFilter
            }
            onDone={closeForm}
          />
        </div>
      ) : null}

      {query.isError ? (
        <ErrorState
          error={query.error}
          title="Troškovi nisu učitani"
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : (
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Svi troškovi</CardTitle>
            <CardDescription>
              Filteri važe za troškove vozila i zajedničke troškove firme.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0">
            <CompanyExpensesTable
              expenses={expenses}
              isLoading={query.isPending}
              showVehicle
              onEdit={(expense) => {
                setEditing(expense);
                setIsFormOpen(true);
              }}
              onRequestDelete={setExpenseToDelete}
              emptyAction={
                <Button size="sm" onClick={openCreate}>
                  Dodaj trošak
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      <DeleteCompanyExpenseDialog
        expense={expenseToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setExpenseToDelete(null);
          }
        }}
      />
    </>
  );
}
