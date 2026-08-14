import {
  tachographCalibrationWriteSchema,
  type TachographCalibrationWriteInput,
} from '@rental-admin/shared';

export const tachographCalibrationFormSchema = tachographCalibrationWriteSchema;

export type TachographCalibrationFormValues = TachographCalibrationWriteInput;

export const EMPTY_CALIBRATION_FORM: TachographCalibrationFormValues = {
  calibratedAt: '',
  fileId: '',
};
