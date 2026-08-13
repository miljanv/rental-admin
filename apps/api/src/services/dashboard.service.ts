import { RECENT_FILES_LIMIT, type DashboardStats } from '@rental-admin/shared';

import { prisma } from '../config/prisma';
import { toFileObjectDto, type FileObjectRecord } from '../utils/file-mapper';

const startOfTodayUtc = (now: Date = new Date()): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

/**
 * Dashboard counters. Only confirmed uploads are counted, so a failed or
 * in-flight upload never inflates the numbers.
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const uploadedOnly = { status: 'UPLOADED' as const };

  const [totalFiles, sizeAggregate, uploadedToday, recentRecords] = await Promise.all([
    prisma.fileObject.count({ where: uploadedOnly }),
    prisma.fileObject.aggregate({ where: uploadedOnly, _sum: { size: true } }),
    prisma.fileObject.count({
      where: { ...uploadedOnly, uploadedAt: { gte: startOfTodayUtc() } },
    }),
    prisma.fileObject.findMany({
      where: uploadedOnly,
      orderBy: { uploadedAt: 'desc' },
      take: RECENT_FILES_LIMIT,
    }),
  ]);

  return {
    totalFiles,
    totalSize: sizeAggregate._sum.size ?? 0,
    uploadedToday,
    recentFiles: recentRecords.map((record: FileObjectRecord) => toFileObjectDto(record)),
  };
};
