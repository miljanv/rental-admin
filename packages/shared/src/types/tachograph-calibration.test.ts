import { describe, expect, it } from 'vitest';

import { computeCalibrationExpiry } from './tachograph-calibration';

describe('computeCalibrationExpiry', () => {
  it('analog tachographs expire 365 days after calibration', () => {
    expect(computeCalibrationExpiry('ANALOG', '2026-08-14')).toBe('2027-08-14');
  });

  it('digital tachographs expire 730 days after calibration', () => {
    expect(computeCalibrationExpiry('DIGITAL', '2026-08-14')).toBe('2028-08-13');
  });
});
