import { tripWriteSchema, type TripWriteInput } from '@rental-admin/shared';

export const tripFormSchema = tripWriteSchema;

export type TripFormValues = TripWriteInput;

export const EMPTY_TRIP_FORM: TripFormValues = {
  referenceNumber: '',
  departureDate: '',
  returnDate: '',
  country: '',
  origin: '',
  destination: '',
  passengerCount: '',
  partnerId: '',
  clientName: '',
  notes: '',
  price: '',
  paymentMethod: '',
  status: 'PLANNED',
  contractId: '',
  distanceKm: '',
  vehicleIds: [],
  driverIds: [],
  vehicleCount: 1,
};
