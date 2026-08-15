'use client';

import { CONTRACT_STATUS_LABELS, CONTRACT_STATUSES, type ContractStatus } from '@rental-admin/shared';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useChangeContractStatus } from '@/features/contracts/hooks/use-change-contract-status';

interface ContractStatusControlProps {
  contractId: string;
  status: ContractStatus;
}

/** Free-standing status changer on the contract detail page — separate from the full edit form. */
export function ContractStatusControl({ contractId, status }: ContractStatusControlProps) {
  const mutation = useChangeContractStatus(contractId);

  return (
    <Select
      value={status}
      onValueChange={(value) => mutation.mutate(value as ContractStatus)}
      disabled={mutation.isPending}
    >
      <SelectTrigger aria-label="Promeni status ugovora" className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CONTRACT_STATUSES.map((value) => (
          <SelectItem key={value} value={value}>
            {CONTRACT_STATUS_LABELS[value]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
