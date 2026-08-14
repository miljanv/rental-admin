import { Router } from 'express';

import * as authController from '../controllers/auth.controller';
import { loginRateLimiter } from '../middleware/rate-limit';
import { requireAuth } from '../middleware/require-auth';
import { validateRequest } from '../middleware/validate-request';
import { loginBodySchema } from '../schemas/auth.schema';
import { asyncHandler } from '../utils/async-handler';

export const authRouter = Router();

authRouter.post(
  '/login',
  loginRateLimiter,
  validateRequest({ body: loginBodySchema }),
  asyncHandler(authController.login),
);

authRouter.get('/me', requireAuth, asyncHandler(authController.me));
