import type { FileIdParams, ListFilesQuery, PresignUploadRequest } from '@rental-admin/shared';
import type { Request, Response } from 'express';

import { validated } from '../middleware/validate-request';
import * as fileService from '../services/file.service';
import { sendPaginated, sendSuccess } from '../utils/api-response';

export const listFiles = async (req: Request, res: Response): Promise<void> => {
  const query = validated<ListFilesQuery>(req, 'query');
  const { files, pagination } = await fileService.listFiles(query);

  sendPaginated(res, files, pagination);
};

export const presignUpload = async (req: Request, res: Response): Promise<void> => {
  const body = validated<PresignUploadRequest>(req, 'body');
  const result = await fileService.createPresignedUpload(body);

  sendSuccess(res, result, 201);
};

export const confirmUpload = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<FileIdParams>(req, 'params');
  const file = await fileService.confirmUpload(id);

  sendSuccess(res, file);
};

export const getDownloadUrl = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<FileIdParams>(req, 'params');
  const result = await fileService.createDownloadUrl(id);

  sendSuccess(res, result);
};

export const deleteFile = async (req: Request, res: Response): Promise<void> => {
  const { id } = validated<FileIdParams>(req, 'params');
  const result = await fileService.deleteFile(id);

  sendSuccess(res, result);
};
