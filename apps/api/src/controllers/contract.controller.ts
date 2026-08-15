import type {
  ContractAvailabilityQuery,
  ContractIdParams,
  ContractStatusChangeRequest,
  ContractWriteRequest,
  ListContractsQuery,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as contractService from '../services/contract.service';
import { sendPaginated, sendSuccess } from '../utils/api-response';

export const listContracts = async (req: Request, res: Response): Promise<void> => {
  const query = validated<ListContractsQuery>(req, 'query');
  const { contracts, pagination } = await contractService.listContracts(query);

  sendPaginated(res, contracts, pagination);
};

export const getContract = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<ContractIdParams>(req, 'params');
  const contract = await contractService.getContract(id);

  sendSuccess(res, contract);
};

export const createContract = async (req: Request, res: Response): Promise<void> => {
  const body = validated<ContractWriteRequest>(req, 'body');
  const contract = await contractService.createContract(body);

  sendSuccess(res, contract, 201);
};

export const updateContract = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<ContractIdParams>(req, 'params');
  const body = validated<ContractWriteRequest>(req, 'body');
  const contract = await contractService.updateContract(id, body);

  sendSuccess(res, contract);
};

export const deleteContract = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<ContractIdParams>(req, 'params');
  const result = await contractService.deleteContract(id);

  sendSuccess(res, result);
};

export const changeContractStatus = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<ContractIdParams>(req, 'params');
  const body = validated<ContractStatusChangeRequest>(req, 'body');
  const contract = await contractService.changeContractStatus(id, body);

  sendSuccess(res, contract);
};

export const checkContractAvailability = async (req: Request, res: Response): Promise<void> => {
  const query = validated<ContractAvailabilityQuery>(req, 'query');
  const result = await contractService.checkContractAvailability(query);

  sendSuccess(res, result);
};
