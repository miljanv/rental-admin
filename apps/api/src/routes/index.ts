import { Router } from 'express';

import { requireAuth } from '../middleware/require-auth';
import { authRouter } from './auth.routes';
import { contractRouter } from './contract.routes';
import { dashboardRouter } from './dashboard.routes';
import { driverRouter } from './driver.routes';
import { fileRouter } from './file.routes';
import { healthRouter } from './health.routes';
import { partnerRouter } from './partner.routes';
import { vehicleRouter } from './vehicle.routes';

/** Everything below is mounted under `/api/v1`. */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/contracts', requireAuth, contractRouter);
apiRouter.use('/dashboard', requireAuth, dashboardRouter);
apiRouter.use('/drivers', requireAuth, driverRouter);
apiRouter.use('/files', requireAuth, fileRouter);
apiRouter.use('/partners', requireAuth, partnerRouter);
apiRouter.use('/vehicles', requireAuth, vehicleRouter);
