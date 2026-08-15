'use client';

import {
  AETR_FINDING_LABELS,
  AETR_STATUS_LABELS,
  type AetrComplianceDto,
  type AetrStatus,
} from '@rental-admin/shared';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const STATUS_CLASS: Record<AetrStatus, string> = {
  ok: 'border-transparent bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
  warning: 'border-transparent bg-amber-500/10 text-amber-800 dark:text-amber-300',
  breach: 'border-transparent bg-destructive/10 text-destructive',
};

interface AetrStatusCardProps {
  aetr: AetrComplianceDto;
}

const findingDetail = (code: AetrComplianceDto['findings'][number]['code'], detail: string): string => {
  if (code === 'DRIVE_DURING_ABSENCE') {
    return formatDate(detail);
  }

  if (code === 'WEEKLY_REST_GAP') {
    return `${detail} uzastopnih dana`;
  }

  return detail;
};

export function AetrStatusCard({ aetr }: AetrStatusCardProps) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle>AETR usklađenost</CardTitle>
          <Badge variant="secondary" className={cn('font-normal', STATUS_CLASS[aetr.status])}>
            {AETR_STATUS_LABELS[aetr.status]}
          </Badge>
        </div>
        <CardDescription>
          Provera na osnovu točenja i potvrda o odsustvu. Dnevni limiti sati i odmora zahtevaju
          tahograf i još nisu dostupni.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {aetr.findings.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Nema sukoba između evidentiranih vožnji i potvrda o odsustvu u ovom periodu.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {aetr.findings.map((finding) => (
              <li key={`${finding.code}-${finding.detail}`}>
                {AETR_FINDING_LABELS[finding.code]}{' '}
                <span className="text-muted-foreground">
                  ({findingDetail(finding.code, finding.detail)})
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
