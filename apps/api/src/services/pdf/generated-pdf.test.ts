import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';

import { COMPANY, DEFAULT_DRIVER_DUTIES } from '@rental-admin/shared';

import type { DriverRecord } from '../../utils/driver-mapper';
import { buildAbsenceAttestationPdf } from './absence-attestation-pdf';
import { buildEmploymentContractPdf } from './employment-contract-pdf';
import { buildMaFormPdf } from './ma-form-pdf';

const driver: DriverRecord = {
  id: 'drv_1',
  firstName: 'Milan',
  lastName: 'Đurić',
  jmbg: '2209974800091',
  dateOfBirth: new Date('1974-09-22T00:00:00.000Z'),
  residencePlace: 'Novi Sad',
  educationLevel: 'III SSS',
  idCardNumber: '005026603',
  drivingLicenseNumber: 'NS-123456',
  drivingLicenseCategory: 'D',
  licenseNumber: 'LIC-1',
  phone: '061000000',
  email: 'milan@example.com',
  jobTitle: 'vozač autobusa u zemlji i inostranstvu',
  status: 'ACTIVE',
  createdAt: new Date('2026-08-14T10:00:00.000Z'),
  updatedAt: new Date('2026-08-14T10:00:00.000Z'),
};

const isPdf = async (buffer: Buffer, pages: number): Promise<void> => {
  expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  expect(buffer.length).toBeGreaterThan(20_000);
  const pdf = await PDFDocument.load(buffer);
  expect(pdf.getPageCount()).toBe(pages);
};

describe('generated PDFs', () => {
  it('builds an employment contract', async () => {
    const pdf = await buildEmploymentContractPdf({
      driver,
      input: {
        employmentContractType: 'INDEFINITE',
        startsAt: '2026-06-16',
        expiresAt: null,
        signedAt: '2026-06-15',
        netSalary: 69_000,
        transportAllowance: 2296.5,
        mealAllowance: 500,
        holidayAllowance: 500,
        workplace: `${COMPANY.city}, ${COMPANY.streetAddress}`,
        municipality: 'Novi Sad',
        residenceStreet: 'Devet Jugovića 50',
        trialPeriodDays: 5,
        weeklyHours: 40,
        jobDescription: DEFAULT_DRIVER_DUTIES,
      },
    });

    await isPdf(pdf, 2);
  });

  it('builds an MA form', async () => {
    const pdf = await buildMaFormPdf({
      driver,
      input: {
        gender: 'MALE',
        parentName: 'Petar',
        municipality: 'Novi Sad',
        residenceStreet: 'Devet Jugovića 50',
        apartment: null,
        citizenship: COMPANY.country,
        insuranceStartDate: '2026-06-16',
        occupation: driver.jobTitle,
        qualification: driver.educationLevel,
        weeklyHours: 40,
        insuranceBasis: '101',
        employmentKind: 'PERMANENT',
        workplace: COMPANY.city,
        companyRegistrationNumber: '12345678',
        activityCode: '4931',
        activity: COMPANY.activity,
      },
    });

    await isPdf(pdf, 1);
  });

  it('builds an AETR absence attestation', async () => {
    const pdf = await buildAbsenceAttestationPdf({
      driver,
      input: {
        periodFrom: '2026-06-17T19:30',
        periodTo: '2026-06-20T10:00',
        reason: 'LEAVE_OR_REST',
        otherReason: null,
        place: COMPANY.city,
        issuedAt: '2026-06-20',
        startedWorkAt: '2026-04-03',
        passportNumber: null,
      },
    });

    await isPdf(pdf, 1);
  });
});
