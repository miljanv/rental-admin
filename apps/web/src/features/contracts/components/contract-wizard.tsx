'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import type { ContractDto, ContractWriteRequest } from '@rental-admin/shared';
import { useState } from 'react';
import { FormProvider, useForm, type Path } from 'react-hook-form';
import { toast } from 'sonner';

import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { WizardStepPartner } from '@/features/contracts/components/wizard-step-partner';
import { WizardStepPrice } from '@/features/contracts/components/wizard-step-price';
import { WizardStepResources } from '@/features/contracts/components/wizard-step-resources';
import { WizardStepReview } from '@/features/contracts/components/wizard-step-review';
import { WizardStepTrip } from '@/features/contracts/components/wizard-step-trip';
import { useCreateContract } from '@/features/contracts/hooks/use-create-contract';
import { useUpdateContract } from '@/features/contracts/hooks/use-update-contract';
import { toContractFormValues } from '@/features/contracts/lib/contract';
import {
  contractFormSchema,
  EMPTY_CONTRACT_FORM,
  type ContractFormValues,
} from '@/features/contracts/schemas/contract-form-schema';
import { cn } from '@/lib/utils';

interface ContractWizardProps {
  contract?: ContractDto;
}

const STEPS: { id: string; label: string; fields: Path<ContractFormValues>[] }[] = [
  {
    id: 'partner',
    label: 'Partner',
    fields: [
      'partnerId',
      'clientType',
      'clientCompanyName',
      'clientFirstName',
      'clientLastName',
      'clientAddress',
      'clientPib',
      'clientRegistrationNumber',
      'clientPersonalId',
    ],
  },
  {
    id: 'trip',
    label: 'Period i relacija',
    fields: [
      'conclusionDate',
      'origin',
      'destination',
      'serviceStartDate',
      'serviceEndDate',
      'passengerCount',
      'isInternational',
    ],
  },
  { id: 'resources', label: 'Vozilo i vozač', fields: ['vehicleId', 'driverId'] },
  { id: 'price', label: 'Cena i plaćanje', fields: ['price', 'advancePercentage', 'status', 'notes'] },
  { id: 'review', label: 'Pregled', fields: [] },
];

export function ContractWizard({ contract }: ContractWizardProps) {
  const isEdit = Boolean(contract);
  const [stepIndex, setStepIndex] = useState(0);
  const createMutation = useCreateContract();
  const updateMutation = useUpdateContract(contract?.id ?? '');
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<ContractFormValues, unknown, ContractWriteRequest>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: contract ? toContractFormValues(contract) : EMPTY_CONTRACT_FORM,
  });

  const step = STEPS[stepIndex] ?? STEPS[0];
  const isLastStep = stepIndex === STEPS.length - 1;
  const isFirstStep = stepIndex === 0;

  const goNext = async () => {
    const isValid = await form.trigger(step?.fields);

    if (isValid) {
      setStepIndex((current) => Math.min(current + 1, STEPS.length - 1));
      return;
    }

    toast.error('Ispravite greške u koraku pre nego što nastavite.', {
      description: 'Neka obavezna polja nisu popunjena ili nisu ispravnog formata.',
    });
  };

  const onSubmit = form.handleSubmit(
    async (values) => {
      if (isEdit) {
        await updateMutation.mutateAsync(values);
        return;
      }

      await createMutation.mutateAsync(values);
    },
    () => {
      toast.error('Ugovor nije sačuvan — ima grešaka u formi.', {
        description: 'Vratite se kroz korake i proverite obeležena polja.',
      });
    },
  );

  return (
    <>
      <PageHeader
        title={isEdit ? 'Izmena ugovora' : 'Novi ugovor'}
        description={
          isEdit
            ? 'Ažurirajte podatke ugovora o prevozu putnika.'
            : 'Provedite se kroz korake da biste kreirali ugovor o prevozu putnika.'
        }
      />

      <div className="mb-6 flex gap-1 overflow-x-auto border-b">
        {STEPS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={stepIndex === index}
            onClick={() => setStepIndex(index)}
            className={cn(
              'shrink-0 border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors',
              stepIndex === index
                ? 'border-primary text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground border-transparent',
            )}
          >
            {index + 1}. {item.label}
          </button>
        ))}
      </div>

      <FormProvider {...form}>
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          {step?.id === 'partner' ? <WizardStepPartner /> : null}
          {step?.id === 'trip' ? <WizardStepTrip /> : null}
          {step?.id === 'resources' ? (
            <WizardStepResources excludeContractId={contract?.id} />
          ) : null}
          {step?.id === 'price' ? <WizardStepPrice /> : null}
          {step?.id === 'review' ? <WizardStepReview /> : null}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
              disabled={isFirstStep || isPending}
            >
              Nazad
            </Button>
            {isLastStep ? (
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Čuvanje…' : isEdit ? 'Sačuvaj izmene' : 'Kreiraj ugovor'}
              </Button>
            ) : (
              <Button type="button" onClick={() => void goNext()} disabled={isPending}>
                Dalje
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </>
  );
}
