import { Router } from 'express';

import * as authController from '../controllers/auth.controller';
import { loginRateLimiter } from '../middleware/rate-limit';
import { requireAuth, requireAuthAllowingPasswordChange } from '../middleware/require-auth';
import { validateRequest } from '../middleware/validate-request';
import { changePasswordBodySchema, loginBodySchema } from '../schemas/auth.schema';
import { asyncHandler } from '../utils/async-handler';

export const authRouter = Router();

authRouter.post(
  '/login',
  loginRateLimiter,
  validateRequest({ body: loginBodySchema }),
  asyncHandler(authController.login),
);

authRouter.post(
  '/change-password',
  loginRateLimiter,
  requireAuthAllowingPasswordChange,
  validateRequest({ body: changePasswordBodySchema }),
  asyncHandler(authController.changePassword),
);

authRouter.get('/me', requireAuthAllowingPasswordChange, asyncHandler(authController.me));
authRouter.get('/usage', requireAuth, asyncHandler(authController.usage));
