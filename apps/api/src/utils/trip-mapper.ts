import type {
  PartnerType,
  PaymentMethod,
  TripDriverDto,
  TripDto,
  TripPartnerDto,
  TripSeriesDto,
  TripSeriesFrequency,
  TripStatus,
  TripVehicleDto,
} from '@rental-admin/shared';

export interface TripVehicleAssignmentRecord {
  vehicle: { id: string; make: string; model: string; licensePlate: string };
}

export interface TripDriverAssignmentRecord {
  perDiemAmount: number | null;
  advanceAmount: number | null;
  driver: { id: string; firstName: string; lastName: string };
}

export interface TripPartnerRecord {
  id: string;
  type: PartnerType;
  companyName: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface TripContractRecord {
  id: string;
  route: string;
}

export interface TripRecord {
  id: string;
  referenceNumber: string | null;
  departureDate: Date;
  returnDate: Date | null;
  country: string | null;
  origin: string;
  destination: string;
  passengerCount: number | null;
  partnerId: string | null;
  clientName: string | null;
  notes: string | null;
  price: number | null;
  paymentMethod: PaymentMethod | null;
  status: TripStatus;
  contractId: string | null;
  distanceKm: number | null;
  seriesId: string | null;
  paidAt: Date | null;
  carrierId: string | null;
  createdAt: Date;
  updatedAt: Date;
  partner: TripPartnerRecord | null;
  carrier: TripPartnerRecord | null;
  contract: TripContractRecord | null;
  vehicles: TripVehicleAssignmentRecord[];
  drivers: TripDriverAssignmentRecord[];
}

export interface TripSeriesRecord {
  id: string;
  name: string | null;
  frequency: TripSeriesFrequency;
  daysOfWeek: number[];
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  terminatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const toIsoDate = (value: Date): string => value.toISOString().slice(0, 10);

export const toTripPartnerDto = (partner: TripPartnerRecord): TripPartnerDto => ({
  id: partner.id,
  type: partner.type,
  companyName: partner.companyName,
  firstName: partner.firstName,
  lastName: partner.lastName,
});

export const toTripDto = (record: TripRecord): TripDto => ({
  id: record.id,
  referenceNumber: record.referenceNumber,
  departureDate: toIsoDate(record.departureDate),
  returnDate: record.returnDate ? toIsoDate(record.returnDate) : null,
  country: record.country,
  origin: record.origin,
  destination: record.destination,
  passengerCount: record.passengerCount,
  partnerId: record.partnerId,
  partner: record.partner ? toTripPartnerDto(record.partner) : null,
  carrierId: record.carrierId,
  carrier: record.carrier ? toTripPartnerDto(record.carrier) : null,
  paidAt: record.paidAt ? toIsoDate(record.paidAt) : null,
  clientName: record.clientName,
  notes: record.notes,
  price: record.price,
  paymentMethod: record.paymentMethod,
  status: record.status,
  contractId: record.contractId,
  contract: record.contract ? { id: record.contract.id, route: record.contract.route } : null,
  distanceKm: record.distanceKm,
  seriesId: record.seriesId,
  vehicles: record.vehicles.map(
    (assignment): TripVehicleDto => ({
      id: assignment.vehicle.id,
      make: assignment.vehicle.make,
      model: assignment.vehicle.model,
      licensePlate: assignment.vehicle.licensePlate,
    }),
  ),
  drivers: record.drivers.map(
    (assignment): TripDriverDto => ({
      id: assignment.driver.id,
      firstName: assignment.driver.firstName,
      lastName: assignment.driver.lastName,
      perDiemAmount: assignment.perDiemAmount,
      advanceAmount: assignment.advanceAmount,
    }),
  ),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

export const toTripSeriesDto = (record: TripSeriesRecord): TripSeriesDto => ({
  id: record.id,
  name: record.name,
  frequency: record.frequency,
  daysOfWeek: record.daysOfWeek,
  startDate: toIsoDate(record.startDate),
  endDate: toIsoDate(record.endDate),
  isActive: record.isActive,
  terminatedAt: record.terminatedAt ? toIsoDate(record.terminatedAt) : null,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
