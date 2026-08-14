import {
  tachographCalibrationWriteSchema,
  type TachographCalibrationWriteRequest,
} from '@rental-admin/shared';

export const tachographCalibrationFormSchema = tachographCalibrationWriteSchema;

export type TachographCalibrationFormValues = TachographCalibrationWriteRequest;

export const EMPTY_CALIBRATION_FORM: TachographCalibrationFormValues = {
  calibratedAt: '',
};
