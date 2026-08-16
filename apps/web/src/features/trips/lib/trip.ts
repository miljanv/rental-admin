import { tripClientDisplayName, type TripDto, type TripWriteRequest } from '@rental-admin/shared';

export { tripClientDisplayName };

export const tripLabel = (trip: TripDto): string => `${trip.referenceNumber} — ${trip.route}`;

export const toTripFormValues = (trip: TripDto): TripWriteRequest => ({
  referenceNumber: trip.referenceNumber,
  departureDate: trip.departureDate,
  returnDate: trip.returnDate,
  country: trip.country,
  route: trip.route,
  partnerId: trip.partnerId,
  clientName: trip.clientName,
  notes: trip.notes,
  price: trip.price,
  paymentMethod: trip.paymentMethod,
  status: trip.status,
  contractId: trip.contractId,
  distanceKm: trip.distanceKm,
  vehicleIds: trip.vehicles.map((vehicle) => vehicle.id),
  driverIds: trip.drivers.map((driver) => driver.id),
});
