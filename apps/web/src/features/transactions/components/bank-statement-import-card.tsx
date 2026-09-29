'use client';

import { Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useImportBankStatementXml } from '@/features/transactions/hooks/use-import-bank-statement-xml';

export function BankStatementImportCard() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [rememberMatchedAccounts, setRememberMatchedAccounts] = useState(true);
  const mutation = useImportBankStatementXml();

  const onFileChange = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.xml')) {
      toast.error('Izaberite XML fajl izvoda.');
      return;
    }

    const xml = await file.text();
    await mutation.mutateAsync({ xml, rememberMatchedAccounts });

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>Import XML izvoda</CardTitle>
        <CardDescription>
          Svaka stavka iz XML fajla biće dodata kao posebna stavka izvoda.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            id="remember-matched-accounts"
            checked={rememberMatchedAccounts}
            onCheckedChange={(value) => setRememberMatchedAccounts(value === true)}
            disabled={mutation.isPending}
          />
          <Label htmlFor="remember-matched-accounts" className="text-sm">
            Zapamti račun ako je partner pronađen po nazivu
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
            disabled={mutation.isPending}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-4" aria-hidden />
            {mutation.isPending ? 'Uvoz…' : 'Uvezi XML'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
