import { daysUntilExpiry } from '@rental-admin/shared';

import { formatDate } from '@/lib/format';

export const localTodayIso = (): string => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${now.getFullYear()}-${month}-${day}`;
};

const DAYS_WORD = (count: number): string => {
  const absolute = Math.abs(count);
  return absolute === 1 ? '1 dan' : `${absolute} dana`;
};

export const formatExpiryLabel = (
  expiresAt: string,
  todayIso: string = localTodayIso(),
): string => {
  const days = daysUntilExpiry(expiresAt, todayIso);
  const dateLabel = formatDate(expiresAt);

  if (days < 0) {
    return `Istekao ${dateLabel} (pre ${DAYS_WORD(days)})`;
  }

  if (days === 0) {
    return `Ističe danas (${dateLabel})`;
  }

  return `Ističe ${dateLabel} (za ${DAYS_WORD(days)})`;
};
