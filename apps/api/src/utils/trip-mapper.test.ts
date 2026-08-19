import { describe, expect, it } from 'vitest';

import { toTripDto, type TripRecord } from './trip-mapper';

const record: TripRecord = {
  id: 'trip_1',
  referenceNumber: 'RN-1',
  departureDate: new Date('2026-09-01T00:00:00.000Z'),
  returnDate: null,
  country: 'Srbija',
  origin: 'Novi Sad',
  destination: 'Beograd',
  passengerCount: 40,
  partnerId: null,
  clientName: 'Škola',
  notes: null,
  price: 80_000,
  paymentMethod: 'ACCOUNT',
  status: 'PLANNED',
  contractId: null,
  distanceKm: null,
  seriesId: null,
  paidAt: new Date('2026-09-05T00:00:00.000Z'),
  carrierId: 'partner_carrier',
  vehicleCount: 1,
  createdAt: new Date('2026-08-16T10:00:00.000Z'),
  updatedAt: new Date('2026-08-16T10:00:00.000Z'),
  partner: null,
  carrier: {
    id: 'partner_carrier',
    type: 'BUS_OPERATOR',
    companyName: 'Drugi prevoznik',
    firstName: null,
    lastName: null,
  },
  contract: null,
  vehicles: [],
  drivers: [
    {
      perDiemAmount: 8_000,
      advanceAmount: 2_000,
      driver: { id: 'drv_1', firstName: 'Marko', lastName: 'Marković' },
    },
  ],
};

describe('toTripDto', () => {
  it('exposes paidAt, carrier and per-driver allowances', () => {
    expect(toTripDto(record)).toMatchObject({
      paidAt: '2026-09-05',
      carrierId: 'partner_carrier',
      carrier: { id: 'partner_carrier', companyName: 'Drugi prevoznik' },
      drivers: [{ id: 'drv_1', perDiemAmount: 8_000, advanceAmount: 2_000 }],
    });
  });
});
