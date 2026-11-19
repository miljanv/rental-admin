import type { TripDto, TripWriteRequest } from '@rental-admin/shared';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../config/prisma', () => ({ prisma: {}, prismaUnscoped: {} }));

import { assignmentDetailsChanged } from './trip.service';

const current = {
  departureDate: '2026-11-20',
  returnDate: null,
  departureTime: '07:30',
  pickupLocation: 'Autobuska stanica Novi Sad',
  origin: 'Novi Sad',
  destination: 'Beč',
  itinerary: 'Dan 1: Novi Sad – Beč',
  vehicles: [{ id: 'veh_1' }, { id: 'veh_2' }],
} as unknown as TripDto;

const input = (overrides: Partial<TripWriteRequest> = {}): TripWriteRequest =>
  ({
    departureDate: '2026-11-20',
    returnDate: null,
    departureTime: '07:30',
    pickupLocation: 'Autobuska stanica Novi Sad',
    origin: 'Novi Sad',
    destination: 'Beč',
    itinerary: 'Dan 1: Novi Sad – Beč',
    vehicleIds: ['veh_2', 'veh_1'],
    ...overrides,
  }) as TripWriteRequest;

describe('assignmentDetailsChanged', () => {
  it('ignores changes the driver does not confirm, and vehicle order', () => {
    expect(assignmentDetailsChanged(current, input({ notes: 'Interno' }))).toBe(false);
  });

  it('asks the driver again when time, pickup, program or vehicles change', () => {
    expect(assignmentDetailsChanged(current, input({ departureTime: '08:00' }))).toBe(true);
    expect(assignmentDetailsChanged(current, input({ pickupLocation: 'Hotel Park' }))).toBe(true);
    expect(assignmentDetailsChanged(current, input({ itinerary: 'Novi program' }))).toBe(true);
    expect(assignmentDetailsChanged(current, input({ vehicleIds: ['veh_1'] }))).toBe(true);
  });
});
