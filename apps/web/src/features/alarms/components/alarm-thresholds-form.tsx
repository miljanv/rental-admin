'use client';

import {
  ALARM_CATEGORY_LABELS,
  ALARM_KIND_GROUPS,
  ALARM_KIND_LABELS,
  ALARM_KINDS,
  alarmThresholdsWriteSchema,
  mergeAlarmThresholds,
  type AlarmKind,
  type AlarmThresholdsWriteRequest,
} from '@rental-admin/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { ErrorState } from '@/components/common/error-state';
import { PageHeader } from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAlarmThresholds } from '@/features/alarms/hooks/use-alarm-thresholds';
import { useUpdateAlarmThresholds } from '@/features/alarms/hooks/use-update-alarm-thresholds';

export function AlarmThresholdsForm() {
  const query = useAlarmThresholds();
  const mutation = useUpdateAlarmThresholds();
  const form = useForm<AlarmThresholdsWriteRequest>({
    resolver: zodResolver(alarmThresholdsWriteSchema),
    defaultValues: { thresholds: mergeAlarmThresholds([]) },
  });

  useEffect(() => {
    if (query.data) {
      form.reset({ thresholds: mergeAlarmThresholds(query.data.thresholds) });
    }
  }, [form, query.data]);

  const errors = form.formState.errors;
  const kindIndex = (kind: AlarmKind): number => ALARM_KINDS.indexOf(kind);

  if (query.isError) {
    return (
      <ErrorState
        error={query.error}
        title="Pragovi nisu učitani"
        onRetry={() => void query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Podešavanja"
        description="Pragovi upozorenja za Alarm centar. Crveno je hitan rok, žuto širi prozor."
      />

      <form
        onSubmit={form.handleSubmit((values) => {
          mutation.mutate(values);
        })}
        className="space-y-6"
        noValidate
      >
        {ALARM_KIND_GROUPS.map((group) => (
          <Card key={group.category} className="shadow-none">
            <CardHeader>
              <CardTitle>{ALARM_CATEGORY_LABELS[group.category]}</CardTitle>
              <CardDescription>
                Broj dana do isteka: crveno mora biti isto ili kraće od žutog.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-muted-foreground hidden grid-cols-[minmax(0,1fr)_7rem_7rem] gap-3 text-xs font-medium tracking-wide uppercase sm:grid">
                <span>Tip</span>
                <span>Crveno</span>
                <span>Žuto</span>
              </div>
              {group.kinds.map((kind) => {
                const index = kindIndex(kind);

                return (
                  <div
                    key={kind}
                    className="grid gap-3 border-t pt-4 sm:grid-cols-[minmax(0,1fr)_7rem_7rem] sm:items-start"
                  >
                    <input type="hidden" {...form.register(`thresholds.${index}.kind`)} />
                    <div>
                      <p className="text-sm font-medium">{ALARM_KIND_LABELS[kind]}</p>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`critical-${kind}`} className="sm:sr-only">
                        Crveno (dani)
                      </Label>
                      <Input
                        id={`critical-${kind}`}
                        type="number"
                        min={0}
                        max={365}
                        inputMode="numeric"
                        disabled={query.isPending || mutation.isPending}
                        aria-invalid={Boolean(errors.thresholds?.[index]?.criticalDays)}
                        {...form.register(`thresholds.${index}.criticalDays`, {
                          valueAsNumber: true,
                        })}
                      />
                      {errors.thresholds?.[index]?.criticalDays ? (
                        <p className="text-destructive text-xs">
                          {errors.thresholds[index]?.criticalDays?.message}
                        </p>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`warning-${kind}`} className="sm:sr-only">
                        Žuto (dani)
                      </Label>
                      <Input
                        id={`warning-${kind}`}
                        type="number"
                        min={0}
                        max={365}
                        inputMode="numeric"
                        disabled={query.isPending || mutation.isPending}
                        aria-invalid={Boolean(errors.thresholds?.[index]?.warningDays)}
                        {...form.register(`thresholds.${index}.warningDays`, {
                          valueAsNumber: true,
                        })}
                      />
                      {errors.thresholds?.[index]?.warningDays ? (
                        <p className="text-destructive text-xs">
                          {errors.thresholds[index]?.warningDays?.message}
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        <div className="flex justify-end">
          <Button type="submit" disabled={query.isPending || mutation.isPending}>
            {mutation.isPending ? 'Čuvanje…' : 'Sačuvaj pragove'}
          </Button>
        </div>
      </form>
    </>
  );
}
