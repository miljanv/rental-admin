'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useVatReport } from '@/features/transactions/hooks/use-vat-report';
import { formatMoney, formatMonthYear } from '@/lib/format';
import { cn } from '@/lib/utils';

interface VatReportCardProps {
  from: string;
  to: string;
}

export function VatReportCard({ from, to }: VatReportCardProps) {
  const query = useVatReport(from, to);
  const report = query.data;

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle>PDV obračun</CardTitle>
        <CardDescription>
          Ulazni i izlazni PDV po datumu prometa. Datum izdavanja računa služi samo kao datum
          dokumenta.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {query.isPending ? (
          <p className="text-muted-foreground px-6 text-sm">Učitavanje…</p>
        ) : (
          <>
            {(report?.legacyInputCount ?? 0) + (report?.legacyOutputCount ?? 0) > 0 ? (
              <p className="mx-6 mb-4 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                {report?.legacyInputCount ?? 0} ulaznih i {report?.legacyOutputCount ?? 0} izlaznih
                starijih dokumenata nema datum prometa. Privremeno su svrstani po datumu izdavanja
                računa.
              </p>
            ) : null}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mesec</TableHead>
                  <TableHead className="text-right">Ulazni PDV</TableHead>
                  <TableHead className="text-right">Izlazni PDV</TableHead>
                  <TableHead className="text-right">Razlika</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(report?.monthly ?? []).map((row) => (
                  <TableRow key={`${row.year}-${row.month}`}>
                    <TableCell>{formatMonthYear(row.year, row.month)}</TableCell>
                    <TableCell className="text-right">{formatMoney(row.inputVat)}</TableCell>
                    <TableCell className="text-right">{formatMoney(row.outputVat)}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-medium',
                        row.balance > 0 && 'text-rose-700 dark:text-rose-300',
                        row.balance < 0 && 'text-emerald-700 dark:text-emerald-300',
                      )}
                    >
                      {formatMoney(row.balance)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-medium">Ukupno</TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(report?.totals.inputVat)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(report?.totals.outputVat)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(report?.totals.balance)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
