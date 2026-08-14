import { describe, expect, it } from 'vitest';

import { toDriverDto, type DriverRecord } from './driver-mapper';

const record: DriverRecord = {
  id: 'drv_1',
  firstName: 'Marko',
  lastName: 'Marković',
  jmbg: '0101990710123',
  dateOfBirth: new Date('1990-01-01T00:00:00.000Z'),
  residencePlace: 'Novi Sad',
  educationLevel: 'SSS',
  idCardNumber: '123456789',
  drivingLicenseNumber: 'NS-123456',
  drivingLicenseCategory: 'D',
  licenseNumber: 'LIC-001',
  phone: '0692084860',
  email: 'marko@example.com',
  jobTitle: 'Vozač',
  status: 'ACTIVE',
  createdAt: new Date('2026-08-14T10:00:00.000Z'),
  updatedAt: new Date('2026-08-14T10:00:00.000Z'),
};

describe('toDriverDto', () => {
  it('exposes date of birth as YYYY-MM-DD and ISO timestamps', () => {
    expect(toDriverDto(record)).toMatchObject({
      id: 'drv_1',
      firstName: 'Marko',
      dateOfBirth: '1990-01-01',
      status: 'ACTIVE',
      createdAt: '2026-08-14T10:00:00.000Z',
    });
  });
});
