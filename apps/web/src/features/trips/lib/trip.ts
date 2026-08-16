import {
  tripClientDisplayName,
  tripRouteLabel,
  type TripDto,
  type TripWriteRequest,
} from '@rental-admin/shared';

export { tripClientDisplayName, tripRouteLabel };

export const tripLabel = (trip: TripDto): string =>
  `${trip.referenceNumber ?? 'Bez RN broja'} — ${tripRouteLabel(trip)}`;

export const toTripFormValues = (trip: TripDto): TripWriteRequest => ({
  referenceNumber: trip.referenceNumber,
  departureDate: trip.departureDate,
  returnDate: trip.returnDate,
  country: trip.country,
  origin: trip.origin,
  destination: trip.destination,
  passengerCount: trip.passengerCount,
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
