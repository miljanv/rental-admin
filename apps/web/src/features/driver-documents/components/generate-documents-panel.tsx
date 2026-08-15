'use client';

import type { DriverDto } from '@rental-admin/shared';
import { FileDown } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { GenerateEmploymentContractForm } from '@/features/driver-documents/components/generate-employment-contract-form';
import { GenerateMaForm } from '@/features/driver-documents/components/generate-ma-form';

interface GenerateDocumentsPanelProps {
  driver: DriverDto;
}

type GenerateKind = 'contract' | 'ma';

export function GenerateDocumentsPanel({ driver }: GenerateDocumentsPanelProps) {
  const [open, setOpen] = useState<GenerateKind | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={open === 'contract' ? 'default' : 'outline'}
          onClick={() => setOpen(open === 'contract' ? null : 'contract')}
        >
          <FileDown className="size-4" aria-hidden />
          Generiši ugovor o radu
        </Button>
        <Button
          type="button"
          variant={open === 'ma' ? 'default' : 'outline'}
          onClick={() => setOpen(open === 'ma' ? null : 'ma')}
        >
          <FileDown className="size-4" aria-hidden />
          Generiši obrazac MA
        </Button>
      </div>
      {open === 'contract' ? <GenerateEmploymentContractForm driver={driver} /> : null}
      {open === 'ma' ? <GenerateMaForm driver={driver} /> : null}
    </div>
  );
}
