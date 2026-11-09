/** How full a limit is, 0–100. Null when there is no limit to fill. */
export const usagePercent = (used: number, max: number | null): number | null => {
  if (max === null) {
    return null;
  }

  if (max === 0) {
    return used > 0 ? 100 : 0;
  }

  return Math.min(100, Math.round((used / max) * 100));
};

/** Whether one more record would go over the limit. */
export const isAtLimit = (used: number, max: number | null): boolean => max !== null && used >= max;
