'use client';

import { partnerSelectLabel, type PartnerDto } from '@rental-admin/shared';
import { useMemo } from 'react';

import { Input } from '@/components/ui/input';
import { usePartners } from '@/features/partners/hooks/use-partners';

interface PartnerNameInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  ariaInvalid?: boolean;
  placeholder?: string;
  listId?: string;
  onPartnerIdChange?: (partnerId: string) => void;
}

interface PartnerNameOption {
  label: string;
  partnerId: string;
}

const partnerNameOptions = (partners: PartnerDto[]): PartnerNameOption[] => {
  const byLabel = new Map<string, PartnerNameOption>();

  for (const partner of partners) {
    const labels = [
      partnerSelectLabel(partner),
      partner.nickname,
      partner.companyName,
      `${partner.firstName ?? ''} ${partner.lastName ?? ''}`.trim(),
    ].filter((label): label is string => Boolean(label?.trim()));

    for (const label of labels) {
      if (!byLabel.has(label)) {
        byLabel.set(label, { label, partnerId: partner.id });
      }
    }
  }

  return [...byLabel.values()].sort((left, right) => left.label.localeCompare(right.label, 'sr'));
};

export function PartnerNameInput({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  ariaInvalid,
  placeholder,
  listId = `${id}-partner-options`,
  onPartnerIdChange,
}: PartnerNameInputProps) {
  const partnersQuery = usePartners({ page: 1, limit: 100, sortBy: 'type', sortOrder: 'asc' });
  const options = useMemo(() => partnerNameOptions(partnersQuery.data?.partners ?? []), [
    partnersQuery.data?.partners,
  ]);
  const syncPartnerId = (nextValue: string) => {
    const exact = options.find((option) => option.label === nextValue.trim());
    onPartnerIdChange?.(exact?.partnerId ?? '');
  };

  return (
    <>
      <Input
        id={id}
        list={listId}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          syncPartnerId(event.target.value);
        }}
        onBlur={() => {
          syncPartnerId(value);
          onBlur?.();
        }}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        placeholder={placeholder}
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option.label} value={option.label} />
        ))}
      </datalist>
    </>
  );
}
