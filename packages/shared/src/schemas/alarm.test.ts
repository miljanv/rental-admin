import { describe, expect, it } from 'vitest';

import { alarmThresholdsWriteSchema } from './alarm';

describe('alarmThresholdsWriteSchema', () => {
  it('accepts a valid red/yellow pair', () => {
    const result = alarmThresholdsWriteSchema.safeParse({
      thresholds: [{ kind: 'DRIVER_LICENSE', criticalDays: 7, warningDays: 30 }],
    });

    expect(result.success).toBe(true);
  });

  it('rejects a red window longer than yellow', () => {
    const result = alarmThresholdsWriteSchema.safeParse({
      thresholds: [{ kind: 'DRIVER_LICENSE', criticalDays: 40, warningDays: 30 }],
    });

    expect(result.success).toBe(false);
  });
});
