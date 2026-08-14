import { describe, expect, it } from 'vitest';

import { driverFormSchema, EMPTY_DRIVER_FORM } from './driver-form-schema';

describe('driverFormSchema', () => {
  it('rejects an empty form', () => {
    expect(driverFormSchema.safeParse(EMPTY_DRIVER_FORM).success).toBe(false);
  });
});
