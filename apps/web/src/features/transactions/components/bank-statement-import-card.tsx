'use client';

import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import type {
  BankStatementPreviewResult,
  BankStatementXmlImportRequest,
} from '@rental-admin/shared';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useImportBankStatementXml } from '@/features/transactions/hooks/use-import-bank-statement-xml';
import { usePreviewBankStatementXml } from '@/features/transactions/hooks/use-preview-bank-statement-xml';
import { BankStatementPreviewSheet } from '@/features/transactions/components/bank-statement-preview-sheet';

interface PendingImport {
  fileName: string;
  body: BankStatementXmlImportRequest;
  preview: BankStatementPreviewResult;
}

export function BankStatementImportCard() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [rememberMatchedAccounts, setRememberMatchedAccounts] = useState(true);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const previewMutation = usePreviewBankStatementXml();
  const importMutation = useImportBankStatementXml();
  const isPending = previewMutation.isPending || importMutation.isPending;

  const onFileChange = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.xml')) {
      toast.error('Izaberite XML fajl izvoda.');
      return;
    }

    try {
      const xml = await file.text();
      const body = { xml, rememberMatchedAccounts };
      const preview = await previewMutation.mutateAsync(body);
      setPendingImport({ fileName: file.name, body, preview });
    } catch {
      // The preview mutation reports failures.
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const confirmImport = async () => {
    if (!pendingImport) return;

    try {
      await importMutation.mutateAsync(pendingImport.body);
      setPendingImport(null);
    } catch {
      // The import mutation reports failures and keeps the preview open.
    }
  };

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Import XML izvoda</CardTitle>
        <CardDescription>
          Izaberite XML, proverite pronađene partnere i račune, pa potvrdite uvoz i knjiženje.
          Neraspoređeni iznosi ostaju u evidenciji za ručno povezivanje.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="remember-matched-accounts"
            checked={rememberMatchedAccounts}
            onCheckedChange={(value) => setRememberMatchedAccounts(value === true)}
            disabled={isPending}
          />
          <Label htmlFor="remember-matched-accounts" className="text-sm">
            Zapamti račun ako je kupac ili dobavljač pronađen po nazivu
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept=".xml,text/xml,application/xml"
            className="hidden"
            onChange={(event) => void onFileChange(event.target.files?.[0])}
          />
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-4" aria-hidden />
            {previewMutation.isPending ? 'Analiza…' : 'Izaberi XML'}
          </Button>
        </div>
      </CardContent>
      <BankStatementPreviewSheet
        fileName={pendingImport?.fileName ?? null}
        preview={pendingImport?.preview ?? null}
        isImporting={importMutation.isPending}
        onOpenChange={(open) => {
          if (!open && !importMutation.isPending) setPendingImport(null);
        }}
        onConfirm={() => void confirmImport()}
      />
    </Card>
  );
}
