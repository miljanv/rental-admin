import type {
  ApiErrorBody,
  ApiErrorResponse,
  ApiPaginatedResponse,
  ApiSuccessResponse,
  PaginationMeta,
} from '@rental-admin/shared';
import type { Response } from 'express';

export const buildSuccessBody = <TData>(data: TData): ApiSuccessResponse<TData> => ({
  success: true,
  data,
});

export const buildErrorBody = (error: ApiErrorBody): ApiErrorResponse => ({
  success: false,
  error: error.details === undefined ? { code: error.code, message: error.message } : error,
});

export const buildPaginationMeta = (params: {
  page: number;
  limit: number;
  total: number;
}): PaginationMeta => ({
  page: params.page,
  limit: params.limit,
  total: params.total,
  totalPages: params.limit > 0 ? Math.ceil(params.total / params.limit) : 0,
});

export const sendSuccess = <TData>(res: Response, data: TData, statusCode = 200): void => {
  res.status(statusCode).json(buildSuccessBody(data));
};

export const sendPaginated = <TItem>(
  res: Response,
  items: TItem[],
  pagination: PaginationMeta,
): void => {
  const body: ApiPaginatedResponse<TItem> = {
    success: true,
    data: items,
    pagination,
  };

  res.status(200).json(body);
};
