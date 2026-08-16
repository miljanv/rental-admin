export const VEHICLE_TYPES = ['BUS', 'VAN', 'MIDIBUS', 'CAR'] as const;

export type VehicleType = (typeof VEHICLE_TYPES)[number];

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  BUS: 'Autobus',
  VAN: 'Kombi',
  MIDIBUS: 'Midibus',
  CAR: 'Automobil',
};

export const VEHICLE_FUEL_TYPES = ['DIESEL', 'PETROL', 'LPG', 'CNG', 'ELECTRIC', 'HYBRID'] as const;

export type VehicleFuelType = (typeof VEHICLE_FUEL_TYPES)[number];

export const VEHICLE_FUEL_TYPE_LABELS: Record<VehicleFuelType, string> = {
  DIESEL: 'Dizel',
  PETROL: 'Benzin',
  LPG: 'TNG (LPG)',
  CNG: 'CNG',
  ELECTRIC: 'Električni',
  HYBRID: 'Hibridni',
};

export const TACHOGRAPH_TYPES = ['ANALOG', 'DIGITAL'] as const;

export type TachographType = (typeof TACHOGRAPH_TYPES)[number];

export const TACHOGRAPH_TYPE_LABELS: Record<TachographType, string> = {
  ANALOG: 'Analogni',
  DIGITAL: 'Digitalni',
};

export const VEHICLE_STATUSES = ['ACTIVE', 'IN_SERVICE', 'OUT_OF_SERVICE'] as const;

export type VehicleStatus = (typeof VEHICLE_STATUSES)[number];

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  ACTIVE: 'Aktivno',
  IN_SERVICE: 'Na servisu',
  OUT_OF_SERVICE: 'Van pogona',
};

export interface VehicleDto {
  id: string;
  make: string;
  model: string;
  year: number;
  licensePlate: string;
  vin: string;
  engineNumber: string | null;
  enginePower: number | null;
  engineDisplacement: number | null;
  mass: number | null;
  seatCount: number;
  standingCapacity: number | null;
  type: VehicleType;
  fuelType: VehicleFuelType;
  tachographType: TachographType;
  status: VehicleStatus;
  /** Odometer reading at the moment this vehicle entered the fleet. Set once, immutable after. */
  initialMileageKm: number;
  currentMileage: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteVehicleResult {
  id: string;
  deleted: true;
}
