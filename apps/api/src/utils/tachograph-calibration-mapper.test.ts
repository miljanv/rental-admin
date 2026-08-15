import { describe, expect, it } from 'vitest';

import {
  toTachographCalibrationDto,
  type TachographCalibrationRecord,
} from './tachograph-calibration-mapper';

const record: TachographCalibrationRecord = {
  id: 'cal_1',
  vehicleId: 'veh_1',
  calibratedAt: new Date('2026-08-14T00:00:00.000Z'),
  expiresAt: new Date('2027-08-14T00:00:00.000Z'),
  cost: null,
  paymentMethod: null,
  fileId: null,
  createdAt: new Date('2026-08-14T10:00:00.000Z'),
  updatedAt: new Date('2026-08-14T10:00:00.000Z'),
  file: null,
};

describe('toTachographCalibrationDto', () => {
  it('exposes calibratedAt/expiresAt as YYYY-MM-DD', () => {
    expect(toTachographCalibrationDto(record)).toMatchObject({
      id: 'cal_1',
      vehicleId: 'veh_1',
      calibratedAt: '2026-08-14',
      expiresAt: '2027-08-14',
    });
  });
});
