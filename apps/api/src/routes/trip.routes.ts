import { Router } from 'express';

import * as tripSeriesController from '../controllers/trip-series.controller';
import * as tripController from '../controllers/trip.controller';
import { validateRequest } from '../middleware/validate-request';
import {
  bulkUpdateTripSeriesSchema,
  generateTripSeriesSchema,
  terminateTripSeriesSchema,
  tripSeriesIdParamsSchema,
} from '../schemas/trip-series.schema';
import {
  listTripsQuerySchema,
  tripIdParamsSchema,
  tripStatsQuerySchema,
  tripWriteSchema,
} from '../schemas/trip.schema';
import { asyncHandler } from '../utils/async-handler';

export const tripRouter = Router();

tripRouter.get(
  '/',
  validateRequest({ query: listTripsQuerySchema }),
  asyncHandler(tripController.listTrips),
);

tripRouter.post('/', validateRequest({ body: tripWriteSchema }), asyncHandler(tripController.createTrip));

// Static/collection routes MUST be declared before the `/:id` routes to avoid
// "stats"/"series" being captured as an :id param.
tripRouter.get(
  '/stats',
  validateRequest({ query: tripStatsQuerySchema }),
  asyncHandler(tripController.getTripStats),
);

tripRouter.post(
  '/series/generate',
  validateRequest({ body: generateTripSeriesSchema }),
  asyncHandler(tripSeriesController.generateTripSeries),
);

tripRouter.get(
  '/series/:id',
  validateRequest({ params: tripSeriesIdParamsSchema }),
  asyncHandler(tripSeriesController.getTripSeries),
);

tripRouter.patch(
  '/series/:id/bulk-update',
  validateRequest({ params: tripSeriesIdParamsSchema, body: bulkUpdateTripSeriesSchema }),
  asyncHandler(tripSeriesController.bulkUpdateTripSeries),
);

tripRouter.post(
  '/series/:id/terminate',
  validateRequest({ params: tripSeriesIdParamsSchema, body: terminateTripSeriesSchema }),
  asyncHandler(tripSeriesController.terminateTripSeries),
);

tripRouter.get(
  '/:id',
  validateRequest({ params: tripIdParamsSchema }),
  asyncHandler(tripController.getTrip),
);

tripRouter.patch(
  '/:id',
  validateRequest({ params: tripIdParamsSchema, body: tripWriteSchema }),
  asyncHandler(tripController.updateTrip),
);

tripRouter.delete(
  '/:id',
  validateRequest({ params: tripIdParamsSchema }),
  asyncHandler(tripController.deleteTrip),
);
