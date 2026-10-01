'use client';

import type { PartnerDto } from '@rental-admin/shared';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { PartnerLedgerContent } from '@/features/partners/components/partner-ledger-screen';
import { partnerLabel } from '@/features/partners/lib/partner';

interface PartnerLedgerSheetProps {
  partner: PartnerDto | null;
  onOpenChange: (open: boolean) => void;
}

export function PartnerLedgerSheet({ partner, onOpenChange }: PartnerLedgerSheetProps) {
  return (
    <Sheet open={partner !== null} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto data-[side=right]:sm:max-w-6xl">
        <SheetHeader>
          <SheetTitle>Kartica kupca</SheetTitle>
          <SheetDescription>
            {partner ? partnerLabel(partner) : 'Zaduženja i razduženja kupca.'}
          </SheetDescription>
        </SheetHeader>
        {partner ? (
          <div className="px-4 pb-4">
            <PartnerLedgerContent partnerId={partner.id} embedded />
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
