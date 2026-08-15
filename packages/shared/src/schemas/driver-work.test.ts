import { describe, expect, it } from 'vitest';

import { listDriverWorkRecordsQuerySchema } from './driver-work';

describe('listDriverWorkRecordsQuerySchema', () => {
  it('accepts an empty query and a valid range', () => {
    expect(listDriverWorkRecordsQuerySchema.safeParse({}).success).toBe(true);
    expect(
      listDriverWorkRecordsQuerySchema.safeParse({ from: '2026-08-01', to: '2026-08-31' }).success,
    ).toBe(true);
  });

  it('rejects a range that does not move forward', () => {
    const result = listDriverWorkRecordsQuerySchema.safeParse({
      from: '2026-08-31',
      to: '2026-08-01',
    });

    expect(result.success).toBe(false);
  });
});
