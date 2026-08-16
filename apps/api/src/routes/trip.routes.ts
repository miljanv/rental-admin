import { Router } from 'express';

import * as tripSeriesController from '../controllers/trip-series.controller';
import * as tripExpenseController from '../controllers/trip-expense.controller';
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
  tripExpenseParamsSchema,
  tripExpenseWriteSchema,
  tripIdParamsSchema,
  tripSettlementWriteSchema,
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
  '/:id/settlement',
  validateRequest({ params: tripIdParamsSchema }),
  asyncHandler(tripExpenseController.getTripSettlement),
);

tripRouter.patch(
  '/:id/settlement',
  validateRequest({ params: tripIdParamsSchema, body: tripSettlementWriteSchema }),
  asyncHandler(tripExpenseController.updateTripSettlement),
);

tripRouter.get(
  '/:id/expenses',
  validateRequest({ params: tripIdParamsSchema }),
  asyncHandler(tripExpenseController.listTripExpenses),
);

tripRouter.post(
  '/:id/expenses',
  validateRequest({ params: tripIdParamsSchema, body: tripExpenseWriteSchema }),
  asyncHandler(tripExpenseController.createTripExpense),
);

tripRouter.patch(
  '/:id/expenses/:expenseId',
  validateRequest({ params: tripExpenseParamsSchema, body: tripExpenseWriteSchema }),
  asyncHandler(tripExpenseController.updateTripExpense),
);

tripRouter.delete(
  '/:id/expenses/:expenseId',
  validateRequest({ params: tripExpenseParamsSchema }),
  asyncHandler(tripExpenseController.deleteTripExpense),
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
