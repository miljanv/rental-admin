import { z } from 'zod';

import { ALARM_KINDS } from '../types/alarm';

export const alarmKindSchema = z.enum(ALARM_KINDS);

export const alarmThresholdRowSchema = z
  .object({
    kind: alarmKindSchema,
    criticalDays: z
      .number()
      .int('Broj dana mora biti ceo broj.')
      .min(0, 'Prag ne može biti negativan.')
      .max(365, 'Prag sme biti najviše 365 dana.'),
    warningDays: z
      .number()
      .int('Broj dana mora biti ceo broj.')
      .min(0, 'Prag ne može biti negativan.')
      .max(365, 'Prag sme biti najviše 365 dana.'),
  })
  .superRefine((value, ctx) => {
    if (value.criticalDays > value.warningDays) {
      ctx.addIssue({
        code: 'custom',
        path: ['criticalDays'],
        message: 'Crveni prag mora biti isti ili kraći od žutog.',
      });
    }
  });

export const alarmThresholdsWriteSchema = z.object({
  thresholds: z.array(alarmThresholdRowSchema).min(1).max(ALARM_KINDS.length),
});

export type AlarmThresholdsWriteInput = z.input<typeof alarmThresholdsWriteSchema>;
export type AlarmThresholdsWriteRequest = z.output<typeof alarmThresholdsWriteSchema>;
