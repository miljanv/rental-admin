'use client';

import { partnerSelectLabel } from '@rental-admin/shared';
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
}

export function PartnerNameInput({
  id,
  value,
  onChange,
  onBlur,
  disabled,
  ariaInvalid,
  placeholder,
  listId = `${id}-partner-options`,
}: PartnerNameInputProps) {
  const partnersQuery = usePartners({ page: 1, limit: 100, sortBy: 'type', sortOrder: 'asc' });
  const options = useMemo(
    () =>
      [
        ...new Set(
          (partnersQuery.data?.partners ?? [])
            .flatMap((partner) => [
              partnerSelectLabel(partner),
              partner.nickname,
              partner.companyName,
              `${partner.firstName ?? ''} ${partner.lastName ?? ''}`.trim(),
            ])
            .filter((label): label is string => Boolean(label?.trim())),
        ),
      ].sort((left, right) => left.localeCompare(right, 'sr')),
    [partnersQuery.data?.partners],
  );

  return (
    <>
      <Input
        id={id}
        list={listId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        placeholder={placeholder}
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  );
}
