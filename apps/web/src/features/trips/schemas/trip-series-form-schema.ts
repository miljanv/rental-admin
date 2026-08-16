import { generateTripSeriesSchema, type GenerateTripSeriesInput } from '@rental-admin/shared';

export const tripSeriesFormSchema = generateTripSeriesSchema;

export type TripSeriesFormValues = GenerateTripSeriesInput;

export const EMPTY_TRIP_SERIES_FORM: TripSeriesFormValues = {
  name: '',
  frequency: 'DAILY',
  daysOfWeek: [],
  startDate: '',
  endDate: '',
  referenceNumber: '',
  origin: '',
  destination: '',
  country: '',
  passengerCount: '',
  partnerId: '',
  clientName: '',
  notes: '',
  price: '',
  paymentMethod: '',
  status: 'PLANNED',
  contractId: '',
  vehicleIds: [],
  driverIds: [],
};
