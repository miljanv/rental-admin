export const PASSENGER_LIST_TYPES = ['DOMESTIC', 'INTERNATIONAL'] as const;

export type PassengerListType = (typeof PASSENGER_LIST_TYPES)[number];

/** Serbian passenger-transport terminology: "bela lista" (domestic) / "zelena lista" (international). */
export const PASSENGER_LIST_TYPE_LABELS: Record<PassengerListType, string> = {
  DOMESTIC: 'Bela lista (domaći saobraćaj)',
  INTERNATIONAL: 'Zelena lista (međunarodni saobraćaj)',
};

export interface PassengerDto {
  id: string;
  passengerListId: string;
  firstName: string;
  lastName: string;
  documentNumber: string;
  createdAt: string;
  updatedAt: string;
}

export interface PassengerListDto {
  id: string;
  contractId: string;
  type: PassengerListType;
  passengers: PassengerDto[];
  createdAt: string;
  updatedAt: string;
}

export interface DeletePassengerListResult {
  id: string;
  deleted: true;
}

export interface DeletePassengerResult {
  id: string;
  deleted: true;
}

export const passengerFullName = (passenger: Pick<PassengerDto, 'firstName' | 'lastName'>): string =>
  `${passenger.firstName} ${passenger.lastName}`.trim();
