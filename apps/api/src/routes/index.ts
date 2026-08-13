import { Router } from 'express';

import { dashboardRouter } from './dashboard.routes';
import { fileRouter } from './file.routes';
import { healthRouter } from './health.routes';

/** Everything below is mounted under `/api/v1`. */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/files', fileRouter);
