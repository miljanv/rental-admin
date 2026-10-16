import { Router } from 'express';

import * as userController from '../controllers/user.controller';
import { validateRequest } from '../middleware/validate-request';
import {
  listUsersQuerySchema,
  userCreateSchema,
  userIdParamsSchema,
  userUpdateSchema,
} from '../schemas/user-admin.schema';
import { asyncHandler } from '../utils/async-handler';

export const userRouter = Router();

userRouter.get(
  '/',
  validateRequest({ query: listUsersQuerySchema }),
  asyncHandler(userController.listUsers),
);

userRouter.post(
  '/',
  validateRequest({ body: userCreateSchema }),
  asyncHandler(userController.createUser),
);

userRouter.get(
  '/:id',
  validateRequest({ params: userIdParamsSchema }),
  asyncHandler(userController.getUser),
);

userRouter.patch(
  '/:id',
  validateRequest({ params: userIdParamsSchema, body: userUpdateSchema }),
  asyncHandler(userController.updateUser),
);

userRouter.delete(
  '/:id',
  validateRequest({ params: userIdParamsSchema }),
  asyncHandler(userController.deleteUser),
);
