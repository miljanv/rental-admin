import {
  vehicleSafetyEquipmentWriteSchema,
  type VehicleSafetyEquipmentWriteInput,
} from '@rental-admin/shared';

export const vehicleSafetyEquipmentFormSchema = vehicleSafetyEquipmentWriteSchema;

export type VehicleSafetyEquipmentFormValues = VehicleSafetyEquipmentWriteInput;

export const EMPTY_SAFETY_EQUIPMENT_FORM: VehicleSafetyEquipmentFormValues = {
  type: 'FIRE_EXTINGUISHER',
  checkedAt: '',
  expiresAt: '',
  fileId: '',
  cost: null,
  paymentMethod: '',
};
