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
        <CardDescription>Ulazni PDV iz troškova i izlazni PDV iz faktura.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {query.isPending ? (
          <p className="text-muted-foreground px-6 text-sm">Učitavanje…</p>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}
