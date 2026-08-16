import type {
  TripExpenseCategory,
  TripExpenseDto,
  TripExpensePaymentMethod,
} from '@rental-admin/shared';

import { toAttachedFileDto, type FileObjectRecord } from './file-mapper';

export interface TripExpenseRecord {
  id: string;
  tripId: string;
  category: TripExpenseCategory;
  amount: number;
  paymentMethod: TripExpensePaymentMethod;
  note: string | null;
  fileId: string | null;
  createdAt: Date;
  updatedAt: Date;
  file: FileObjectRecord | null;
}

export const toTripExpenseDto = (record: TripExpenseRecord): TripExpenseDto => ({
  id: record.id,
  tripId: record.tripId,
  category: record.category,
  amount: record.amount,
  paymentMethod: record.paymentMethod,
  note: record.note,
  file: toAttachedFileDto(record.file),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});
