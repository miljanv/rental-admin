import { prisma } from '../config/prisma';
import { badRequest } from '../utils/app-error';
import { logger } from '../utils/logger';
import * as fileService from './file.service';

/**
 * Shared by every "attach a scan to a record" write path (vehicle
 * inspections, tachograph calibrations, safety equipment, vehicle
 * documents). A null/undefined `fileId` is a no-op — the attachment is
 * always optional.
 */
export const assertUploadedFile = async (fileId: string | null | undefined): Promise<void> => {
  if (!fileId) {
    return;
  }

  const file = await prisma.fileObject.findUnique({ where: { id: fileId } });

  if (!file || file.status !== 'UPLOADED') {
    throw badRequest('Sken nije pronađen ili upload nije završen.');
  }
};

/** Best-effort cleanup when a file is replaced or its parent record is deleted. Never throws. */
export const deleteAttachedFile = async (fileId: string | null | undefined): Promise<void> => {
  if (!fileId) {
    return;
  }

  try {
    await fileService.deleteFile(fileId);
  } catch {
    logger.warn('Could not delete attached file', { fileId });
  }
};
