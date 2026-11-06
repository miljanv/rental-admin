'use client';

import { partnerSelectLabel, type PartnerDto } from '@rental-admin/shared';
import { Info } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface ExistingPartnerHintProps {
  partner: PartnerDto;
  onLink: () => void;
  disabled?: boolean;
}

/** Shown under a free-text client name that already belongs to a registered partner. */
export function ExistingPartnerHint({ partner, onLink, disabled }: ExistingPartnerHintProps) {
  return (
    <div className="bg-muted/50 flex flex-col gap-2 rounded-md border p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2">
        <Info className="text-muted-foreground mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          <strong>{partnerSelectLabel(partner)}</strong> već postoji u evidenciji partnera. Vožnja
          će biti povezana sa njim, da se ne bi vodio kao poseban kupac.
        </span>
      </p>
      <Button type="button" size="sm" variant="outline" onClick={onLink} disabled={disabled}>
        Izaberi partnera
      </Button>
    </div>
  );
}
