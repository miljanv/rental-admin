import { Router } from 'express';

import { requireAuth } from '../middleware/require-auth';
import { authRouter } from './auth.routes';
import { dashboardRouter } from './dashboard.routes';
import { fileRouter } from './file.routes';
import { healthRouter } from './health.routes';

/** Everything below is mounted under `/api/v1`. */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/dashboard', requireAuth, dashboardRouter);
apiRouter.use('/files', requireAuth, fileRouter);
