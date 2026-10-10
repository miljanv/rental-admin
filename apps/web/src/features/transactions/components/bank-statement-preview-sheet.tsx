'use client';

import {
  SETTLEMENT_TARGET_TYPE_LABELS,
  TRANSACTION_CATEGORY_LABELS,
  TRANSACTION_TYPE_LABELS,
  type BankStatementPreviewResult,
  type BankStatementPreviewStatus,
} from '@rental-admin/shared';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDate, formatMoney } from '@/lib/format';

const statusLabels: Record<BankStatementPreviewStatus, string> = {
  READY: 'Spremno',
  REVIEW: 'Proveriti naziv',
  PARTIAL: 'Delimično',
  UNALLOCATED: 'Neraspoređeno',
  DUPLICATE: 'Duplikat',
  INVALID: 'Neispravno',
};

const statusVariant = (
  status: BankStatementPreviewStatus,
): 'default' | 'secondary' | 'destructive' | 'outline' => {
  if (status === 'INVALID' || status === 'UNALLOCATED') return 'destructive';
  if (status === 'DUPLICATE') return 'secondary';
  return 'outline';
};

interface BankStatementPreviewSheetProps {
  fileName: string | null;
  preview: BankStatementPreviewResult | null;
  isImporting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function BankStatementPreviewSheet({
  fileName,
  preview,
  isImporting,
  onOpenChange,
  onConfirm,
}: BankStatementPreviewSheetProps) {
  const importable = preview
    ? preview.summary.total - preview.summary.duplicates - preview.summary.invalid
    : 0;

  return (
    <Sheet open={preview !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92vh] gap-0 sm:max-w-none"
        showCloseButton={!isImporting}
      >
        <SheetHeader className="border-b px-6 py-4">
          <SheetTitle>Pregled izvoda pre uvoza</SheetTitle>
          <SheetDescription>
            {fileName ?? 'XML izvod'}
            {preview?.statementNumber ? ` · izvod ${preview.statementNumber}` : ''}. Još ništa nije
            upisano u bazu.
          </SheetDescription>
        </SheetHeader>

        {preview ? (
          <div className="flex-1 space-y-5 overflow-auto p-6">
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                ['Ukupno', preview.summary.total],
                ['Spremno', preview.summary.ready],
                ['Za proveru', preview.summary.review],
                ['Delimično', preview.summary.partial],
                ['Neraspoređeno', preview.summary.unallocated],
                ['Preskače se', preview.summary.duplicates + preview.summary.invalid],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border bg-card p-3">
                  <p className="text-muted-foreground text-xs">{label}</p>
                  <p className="mt-1 text-xl font-semibold">{value}</p>
                </div>
              ))}
            </div>

            <div className="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Datum</TableHead>
                    <TableHead>Smer / kategorija</TableHead>
                    <TableHead className="text-right">Iznos</TableHead>
                    <TableHead>Podaci iz izvoda</TableHead>
                    <TableHead>Prepoznato</TableHead>
                    <TableHead>Rasknjižavanje</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="align-top">
                        <Badge variant={statusVariant(row.status)}>
                          {statusLabels[row.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        {row.occurredAt ? formatDate(row.occurredAt) : '—'}
                      </TableCell>
                      <TableCell className="align-top">
                        <span className="block font-medium">
                          {TRANSACTION_TYPE_LABELS[row.type]}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {TRANSACTION_CATEGORY_LABELS[row.category]}
                        </span>
                      </TableCell>
                      <TableCell className="text-right align-top font-medium">
                        {formatMoney(row.amount)}
                      </TableCell>
                      <TableCell className="max-w-72 whitespace-normal align-top">
                        <span className="block font-medium">{row.payeeName ?? 'Bez naziva'}</span>
                        <span className="text-muted-foreground block text-xs">
                          Račun: {row.accountNumber ?? 'nije naveden'}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          Poziv: {row.reference ?? 'nije naveden'}
                        </span>
                        {row.purpose ? (
                          <span className="text-muted-foreground block text-xs">{row.purpose}</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="max-w-64 whitespace-normal align-top">
                        <span className="block font-medium">
                          {row.counterpartyName ?? 'Nije prepoznato'}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          {row.matchReason}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-72 whitespace-normal align-top">
                        {row.allocations.length > 0 ? (
                          <div className="space-y-1">
                            {row.allocations.map((allocation) => (
                              <div
                                key={`${allocation.targetType}:${allocation.targetId}`}
                                className="text-xs"
                              >
                                <span className="font-medium">
                                  {SETTLEMENT_TARGET_TYPE_LABELS[allocation.targetType]} ·{' '}
                                  {allocation.label}
                                </span>
                                <span className="text-muted-foreground block">
                                  {allocation.counterparty} · {formatMoney(allocation.amount)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Nema pronađenog otvorenog računa.
                          </span>
                        )}
                        {row.unallocatedAmount > 0.005 ? (
                          <span className="mt-1 block text-xs font-medium text-amber-700 dark:text-amber-400">
                            Ostaje neraspoređeno: {formatMoney(row.unallocatedAmount)}
                          </span>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : null}

        <SheetFooter className="flex-row justify-end border-t px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Otkaži
          </Button>
          <Button onClick={onConfirm} disabled={isImporting || importable === 0}>
            {isImporting ? 'Uvoz i knjiženje…' : `Nastavi i uvezi (${importable})`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
