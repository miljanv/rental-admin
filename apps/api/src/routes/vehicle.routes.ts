import { Router } from 'express';

import * as tachographCalibrationController from '../controllers/tachograph-calibration.controller';
import * as vehicleInspectionController from '../controllers/vehicle-inspection.controller';
import * as vehicleSafetyEquipmentController from '../controllers/vehicle-safety-equipment.controller';
import * as vehicleController from '../controllers/vehicle.controller';
import { validateRequest } from '../middleware/validate-request';
import {
  expiringCalibrationsQuerySchema,
  tachographCalibrationParamsSchema,
  tachographCalibrationWriteSchema,
} from '../schemas/tachograph-calibration.schema';
import {
  expiringInspectionsQuerySchema,
  vehicleInspectionParamsSchema,
  vehicleInspectionWriteSchema,
} from '../schemas/vehicle-inspection.schema';
import {
  expiringSafetyEquipmentQuerySchema,
  vehicleSafetyEquipmentParamsSchema,
  vehicleSafetyEquipmentWriteSchema,
} from '../schemas/vehicle-safety-equipment.schema';
import {
  listVehiclesQuerySchema,
  vehicleIdParamsSchema,
  vehicleWriteSchema,
} from '../schemas/vehicle.schema';
import { asyncHandler } from '../utils/async-handler';

export const vehicleRouter = Router();

vehicleRouter.get(
  '/',
  validateRequest({ query: listVehiclesQuerySchema }),
  asyncHandler(vehicleController.listVehicles),
);

vehicleRouter.post(
  '/',
  validateRequest({ body: vehicleWriteSchema }),
  asyncHandler(vehicleController.createVehicle),
);

// Static/collection routes MUST be declared before the `/:id` routes to avoid
// "expiring-inspections" being captured as an :id param.
vehicleRouter.get(
  '/expiring-inspections',
  validateRequest({ query: expiringInspectionsQuerySchema }),
  asyncHandler(vehicleInspectionController.listExpiringInspections),
);

vehicleRouter.get(
  '/expiring-calibrations',
  validateRequest({ query: expiringCalibrationsQuerySchema }),
  asyncHandler(tachographCalibrationController.listExpiringCalibrations),
);

vehicleRouter.get(
  '/expiring-safety-equipment',
  validateRequest({ query: expiringSafetyEquipmentQuerySchema }),
  asyncHandler(vehicleSafetyEquipmentController.listExpiringSafetyEquipment),
);

vehicleRouter.get(
  '/:id/inspections',
  validateRequest({ params: vehicleIdParamsSchema }),
  asyncHandler(vehicleInspectionController.listVehicleInspections),
);

vehicleRouter.post(
  '/:id/inspections',
  validateRequest({ params: vehicleIdParamsSchema, body: vehicleInspectionWriteSchema }),
  asyncHandler(vehicleInspectionController.createVehicleInspection),
);

vehicleRouter.get(
  '/:id/inspections/:inspectionId',
  validateRequest({ params: vehicleInspectionParamsSchema }),
  asyncHandler(vehicleInspectionController.getVehicleInspection),
);

vehicleRouter.patch(
  '/:id/inspections/:inspectionId',
  validateRequest({ params: vehicleInspectionParamsSchema, body: vehicleInspectionWriteSchema }),
  asyncHandler(vehicleInspectionController.updateVehicleInspection),
);

vehicleRouter.delete(
  '/:id/inspections/:inspectionId',
  validateRequest({ params: vehicleInspectionParamsSchema }),
  asyncHandler(vehicleInspectionController.deleteVehicleInspection),
);

vehicleRouter.get(
  '/:id/calibrations',
  validateRequest({ params: vehicleIdParamsSchema }),
  asyncHandler(tachographCalibrationController.listTachographCalibrations),
);

vehicleRouter.post(
  '/:id/calibrations',
  validateRequest({ params: vehicleIdParamsSchema, body: tachographCalibrationWriteSchema }),
  asyncHandler(tachographCalibrationController.createTachographCalibration),
);

vehicleRouter.get(
  '/:id/calibrations/:calibrationId',
  validateRequest({ params: tachographCalibrationParamsSchema }),
  asyncHandler(tachographCalibrationController.getTachographCalibration),
);

vehicleRouter.patch(
  '/:id/calibrations/:calibrationId',
  validateRequest({
    params: tachographCalibrationParamsSchema,
    body: tachographCalibrationWriteSchema,
  }),
  asyncHandler(tachographCalibrationController.updateTachographCalibration),
);

vehicleRouter.delete(
  '/:id/calibrations/:calibrationId',
  validateRequest({ params: tachographCalibrationParamsSchema }),
  asyncHandler(tachographCalibrationController.deleteTachographCalibration),
);

vehicleRouter.get(
  '/:id/safety-equipment',
  validateRequest({ params: vehicleIdParamsSchema }),
  asyncHandler(vehicleSafetyEquipmentController.listVehicleSafetyEquipment),
);

vehicleRouter.post(
  '/:id/safety-equipment',
  validateRequest({ params: vehicleIdParamsSchema, body: vehicleSafetyEquipmentWriteSchema }),
  asyncHandler(vehicleSafetyEquipmentController.createVehicleSafetyEquipment),
);

vehicleRouter.get(
  '/:id/safety-equipment/:equipmentId',
  validateRequest({ params: vehicleSafetyEquipmentParamsSchema }),
  asyncHandler(vehicleSafetyEquipmentController.getVehicleSafetyEquipment),
);

vehicleRouter.patch(
  '/:id/safety-equipment/:equipmentId',
  validateRequest({
    params: vehicleSafetyEquipmentParamsSchema,
    body: vehicleSafetyEquipmentWriteSchema,
  }),
  asyncHandler(vehicleSafetyEquipmentController.updateVehicleSafetyEquipment),
);

vehicleRouter.delete(
  '/:id/safety-equipment/:equipmentId',
  validateRequest({ params: vehicleSafetyEquipmentParamsSchema }),
  asyncHandler(vehicleSafetyEquipmentController.deleteVehicleSafetyEquipment),
);

vehicleRouter.get(
  '/:id',
  validateRequest({ params: vehicleIdParamsSchema }),
  asyncHandler(vehicleController.getVehicle),
);

vehicleRouter.patch(
  '/:id',
  validateRequest({ params: vehicleIdParamsSchema, body: vehicleWriteSchema }),
  asyncHandler(vehicleController.updateVehicle),
);

vehicleRouter.delete(
  '/:id',
  validateRequest({ params: vehicleIdParamsSchema }),
  asyncHandler(vehicleController.deleteVehicle),
);
