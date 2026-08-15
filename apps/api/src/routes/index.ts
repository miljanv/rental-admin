import { Router } from 'express';

import { requireAuth } from '../middleware/require-auth';
import { alarmRouter } from './alarm.routes';
import { authRouter } from './auth.routes';
import { dashboardRouter } from './dashboard.routes';
import { driverRouter } from './driver.routes';
import { fileRouter } from './file.routes';
import { healthRouter } from './health.routes';
import { transactionRouter } from './transaction.routes';
import { vehicleRouter } from './vehicle.routes';

/** Everything below is mounted under `/api/v1`. */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/alarms', requireAuth, alarmRouter);
apiRouter.use('/dashboard', requireAuth, dashboardRouter);
apiRouter.use('/drivers', requireAuth, driverRouter);
apiRouter.use('/files', requireAuth, fileRouter);
apiRouter.use('/transactions', requireAuth, transactionRouter);
apiRouter.use('/vehicles', requireAuth, vehicleRouter);
