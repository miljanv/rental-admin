import type {
  ListSuppliersQuery,
  SupplierIdParams,
  SupplierWriteRequest,
} from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as supplierService from '../services/supplier.service';
import { sendPaginated, sendSuccess } from '../utils/api-response';

export const listSuppliers = async (req: Request, res: Response): Promise<void> => {
  const query = validated<ListSuppliersQuery>(req, 'query');
  const { suppliers, pagination } = await supplierService.listSuppliers(query);

  sendPaginated(res, suppliers, pagination);
};

export const getSupplier = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<SupplierIdParams>(req, 'params');
  const supplier = await supplierService.getSupplier(id);

  sendSuccess(res, supplier);
};

export const createSupplier = async (req: Request, res: Response): Promise<void> => {
  const body = validated<SupplierWriteRequest>(req, 'body');
  const supplier = await supplierService.createSupplier(body);

  sendSuccess(res, supplier, 201);
};

export const updateSupplier = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<SupplierIdParams>(req, 'params');
  const body = validated<SupplierWriteRequest>(req, 'body');
  const supplier = await supplierService.updateSupplier(id, body);

  sendSuccess(res, supplier);
};

export const deleteSupplier = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<SupplierIdParams>(req, 'params');
  const result = await supplierService.deleteSupplier(id);

  sendSuccess(res, result);
};
