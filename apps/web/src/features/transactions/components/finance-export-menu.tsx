'use client';

import type { FinanceExportFormat } from '@rental-admin/shared';
import { FileDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useExportFinanceReport,
  type FinanceExportParams,
} from '@/features/transactions/hooks/use-export-finance-report';

interface FinanceExportMenuProps {
  params: FinanceExportParams;
}

export function FinanceExportMenu({ params }: FinanceExportMenuProps) {
  const exportMutation = useExportFinanceReport();

  const exportAs = (format: FinanceExportFormat) => {
    exportMutation.mutate({ ...params, format });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={exportMutation.isPending} aria-label="Izvezi izveštaj">
          <FileDown className="size-4" aria-hidden />
          {exportMutation.isPending ? 'Izvoz…' : 'Izvezi'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onSelect={() => exportAs('pdf')}>PDF</DropdownMenuItem>
        <DropdownMenuItem onSelect={() => exportAs('xlsx')}>Excel</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
