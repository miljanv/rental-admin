import type {
  ContractIdParams,
  PassengerListParams,
  PassengerListWriteRequest,
  PassengerParams,
  PassengerWriteRequest,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as passengerListService from '../services/passenger-list.service';
import { sendSuccess } from '../utils/api-response';

export const listPassengerLists = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<ContractIdParams>(req, 'params');
  const lists = await passengerListService.listPassengerLists(id);

  sendSuccess(res, lists);
};

export const createPassengerList = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<ContractIdParams>(req, 'params');
  const body = validated<PassengerListWriteRequest>(req, 'body');
  const list = await passengerListService.createPassengerList(id, body);

  sendSuccess(res, list, 201);
};

export const deletePassengerList = async (req: Request, res: Response): Promise<void> => {
  const { id, listId } = validated<PassengerListParams>(req, 'params');
  const result = await passengerListService.deletePassengerList(id, listId);

  sendSuccess(res, result);
};

export const addPassenger = async (req: Request, res: Response): Promise<void> => {
  const { id, listId } = validated<PassengerListParams>(req, 'params');
  const body = validated<PassengerWriteRequest>(req, 'body');
  const passenger = await passengerListService.addPassenger(id, listId, body);

  sendSuccess(res, passenger, 201);
};

export const updatePassenger = async (req: Request, res: Response): Promise<void> => {
  const { id, listId, passengerId } = validated<PassengerParams>(req, 'params');
  const body = validated<PassengerWriteRequest>(req, 'body');
  const passenger = await passengerListService.updatePassenger(id, listId, passengerId, body);

  sendSuccess(res, passenger);
};

export const deletePassenger = async (req: Request, res: Response): Promise<void> => {
  const { id, listId, passengerId } = validated<PassengerParams>(req, 'params');
  const result = await passengerListService.deletePassenger(id, listId, passengerId);

  sendSuccess(res, result);
};
