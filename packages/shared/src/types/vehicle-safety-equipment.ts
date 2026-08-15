import type { AttachedFileDto } from './file';
import type { PaymentMethod } from './transaction';
import { addUtcDays } from './vehicle-inspection';

export const SAFETY_EQUIPMENT_TYPES = ['FIRST_AID_KIT', 'FIRE_EXTINGUISHER'] as const;

export type SafetyEquipmentType = (typeof SAFETY_EQUIPMENT_TYPES)[number];

export const SAFETY_EQUIPMENT_TYPE_LABELS: Record<SafetyEquipmentType, string> = {
  FIRST_AID_KIT: 'Prva pomoć',
  FIRE_EXTINGUISHER: 'PP aparat',
};

export interface VehicleSafetyEquipmentDto {
  id: string;
  vehicleId: string;
  type: SafetyEquipmentType;
  checkedAt: string;
  expiresAt: string;
  cost: number | null;
  paymentMethod: PaymentMethod | null;
  file: AttachedFileDto | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExpiringVehicleSafetyEquipmentDto extends VehicleSafetyEquipmentDto {
  vehicle: {
    id: string;
    make: string;
    model: string;
    licensePlate: string;
  };
}

export interface DeleteVehicleSafetyEquipmentResult {
  id: string;
  deleted: true;
}

const FIRE_EXTINGUISHER_INTERVAL_DAYS = 180;

/**
 * PP aparat (fire extinguisher) expiry is always computed from the check
 * date. Prva pomoć (first aid kit) has no fixed interval — its expiry is
 * printed on the box and always entered manually, validated as required by
 * the write schema.
 */
export const computeSafetyEquipmentExpiry = (
  type: SafetyEquipmentType,
  checkedAt: string,
  manualExpiresAt: string | null,
): string => {
  if (type === 'FIRE_EXTINGUISHER') {
    return addUtcDays(checkedAt, FIRE_EXTINGUISHER_INTERVAL_DAYS);
  }

  return manualExpiresAt ?? checkedAt;
};
