'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  passengerWriteSchema,
  type PassengerListDto,
  type PassengerWriteRequest,
} from '@rental-admin/shared';
import { Plus, Trash2, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';

import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAddPassenger } from '@/features/passenger-lists/hooks/use-add-passenger';
import { useDeletePassenger } from '@/features/passenger-lists/hooks/use-delete-passenger';
import { useDeletePassengerList } from '@/features/passenger-lists/hooks/use-delete-passenger-list';

const EMPTY_PASSENGER: PassengerWriteRequest = { firstName: '', lastName: '', documentNumber: '' };

interface PassengerListSectionProps {
  contractId: string;
  list: PassengerListDto;
  title: string;
}

export function PassengerListSection({ contractId, list, title }: PassengerListSectionProps) {
  const addMutation = useAddPassenger(contractId, list.id);
  const deletePassengerMutation = useDeletePassenger(contractId);
  const deleteListMutation = useDeletePassengerList(contractId);

  const form = useForm<PassengerWriteRequest>({
    resolver: zodResolver(passengerWriteSchema),
    defaultValues: EMPTY_PASSENGER,
  });

  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    await addMutation.mutateAsync(values);
    form.reset(EMPTY_PASSENGER);
  });

  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => deleteListMutation.mutate(list.id)}
          disabled={deleteListMutation.isPending}
          className="text-muted-foreground gap-1.5"
        >
          <Trash2 className="size-3.5" aria-hidden />
          Obriši spisak
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} noValidate className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <div className="space-y-1">
            <Label htmlFor={`${list.id}-firstName`} className="text-xs">
              Ime
            </Label>
            <Input
              id={`${list.id}-firstName`}
              aria-invalid={Boolean(errors.firstName)}
              {...form.register('firstName')}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${list.id}-lastName`} className="text-xs">
              Prezime
            </Label>
            <Input
              id={`${list.id}-lastName`}
              aria-invalid={Boolean(errors.lastName)}
              {...form.register('lastName')}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${list.id}-documentNumber`} className="text-xs">
              Broj dokumenta
            </Label>
            <Input
              id={`${list.id}-documentNumber`}
              aria-invalid={Boolean(errors.documentNumber)}
              {...form.register('documentNumber')}
            />
          </div>
          <Button type="submit" disabled={addMutation.isPending} className="self-end">
            <Plus className="size-4" aria-hidden />
            Dodaj
          </Button>
        </form>

        {list.passengers.length === 0 ? (
          <EmptyState icon={Users} title="Nema unetih putnika" description="Dodajte prvog putnika iznad." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ime i prezime</TableHead>
                <TableHead>Broj dokumenta</TableHead>
                <TableHead className="w-[50px] text-right">Akcije</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.passengers.map((passenger) => (
                <TableRow key={passenger.id}>
                  <TableCell>
                    {passenger.firstName} {passenger.lastName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{passenger.documentNumber}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Obriši putnika ${passenger.firstName} ${passenger.lastName}`}
                      onClick={() =>
                        deletePassengerMutation.mutate({ listId: list.id, passengerId: passenger.id })
                      }
                      disabled={deletePassengerMutation.isPending}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
