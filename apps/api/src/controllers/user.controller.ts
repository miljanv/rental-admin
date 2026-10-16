import type {
  ListUsersQuery,
  UserCreateRequest,
  UserIdParams,
  UserUpdateRequest,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { currentUser } from '../middleware/require-auth';
import { validated } from '../middleware/validate-request';
import * as userService from '../services/user.service';
import { sendSuccess } from '../utils/api-response';

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  const query = validated<ListUsersQuery>(req, 'query');

  sendSuccess(res, await userService.listUsers(query));
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<UserIdParams>(req, 'params');

  sendSuccess(res, await userService.getUser(id));
};

export const createUser = async (req: Request, res: Response): Promise<void> => {
  const body = validated<UserCreateRequest>(req, 'body');

  sendSuccess(res, await userService.createUser(body), 201);
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<UserIdParams>(req, 'params');
  const body = validated<UserUpdateRequest>(req, 'body');

  sendSuccess(res, await userService.updateUser(id, body, currentUser(req).id));
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<UserIdParams>(req, 'params');

  sendSuccess(res, await userService.deleteUser(id, currentUser(req).id));
};
