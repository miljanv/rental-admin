import { Router } from 'express';

import { requireAuth, requireRole } from '../middleware/require-auth';
import { alarmRouter } from './alarm.routes';
import { analyticsRouter } from './analytics.routes';
import { authRouter } from './auth.routes';
import { companyExpenseRouter } from './company-expense.routes';
import { contractRouter } from './contract.routes';
import { dashboardRouter } from './dashboard.routes';
import { driverRouter } from './driver.routes';
import { fileRouter } from './file.routes';
import { fuelLogRouter } from './fuel-log.routes';
import { healthRouter } from './health.routes';
import { organizationRouter } from './organization.routes';
import { partnerRouter } from './partner.routes';
import { supplierRouter } from './supplier.routes';
import { transactionRouter } from './transaction.routes';
import { tripRouter } from './trip.routes';
import { userRouter } from './user.routes';
import { vehicleRouter } from './vehicle.routes';

/** Everything below is mounted under `/api/v1`. */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/alarms', requireAuth, alarmRouter);
apiRouter.use('/analytics', requireAuth, analyticsRouter);
apiRouter.use('/expenses', requireAuth, companyExpenseRouter);
apiRouter.use('/contracts', requireAuth, contractRouter);
apiRouter.use('/dashboard', requireAuth, dashboardRouter);
apiRouter.use('/drivers', requireAuth, driverRouter);
apiRouter.use('/files', requireAuth, fileRouter);
apiRouter.use('/fuel-logs', requireAuth, fuelLogRouter);
apiRouter.use('/organizations', requireAuth, requireRole('SUPERADMIN'), organizationRouter);
apiRouter.use('/partners', requireAuth, partnerRouter);
apiRouter.use('/suppliers', requireAuth, supplierRouter);
apiRouter.use('/transactions', requireAuth, transactionRouter);
apiRouter.use('/trips', requireAuth, tripRouter);
apiRouter.use('/users', requireAuth, requireRole('SUPERADMIN'), userRouter);
apiRouter.use('/vehicles', requireAuth, vehicleRouter);
