export const formatSerbianDate = (isoDate: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);

  if (!match) {
    return isoDate;
  }

  const [, year, month, day] = match;

  return `${day}.${month}.${year}.`;
};

export const formatSerbianMoney = (value: number): string => {
  const [whole = '0', fraction = '00'] = value.toFixed(2).split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  return `${grouped},${fraction}`;
};

/** AETR form clock: `19:30h 17/06/2026`. */
export const formatAetrDateTime = (isoLocal: string): string => {
  const [date = '', time = ''] = isoLocal.split('T');
  const [year = '', month = '', day = ''] = date.split('-');

  return `${time}h ${day}/${month}/${year}`;
};

export const parseDateTimeLocal = (isoLocal: string): Date => new Date(`${isoLocal}:00.000Z`);

export const toDateTimeLocal = (value: Date): string => value.toISOString().slice(0, 16);

export const formatSlashDate = (isoDate: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate);

  if (!match) {
    return isoDate;
  }

  const [, year, month, day] = match;

  return `${day}/${month}/${year}`;
};

export const splitStreetAndNumber = (value: string): { street: string; number: string } => {
  const match = /^(.*?)[\s,]+(\d[\dA-Za-z/-]*)$/u.exec(value.trim());

  if (!match?.[1] || !match[2]) {
    return { street: value.trim(), number: '' };
  }

  return { street: match[1].trim(), number: match[2] };
};

export const driverFullName = (driver: { firstName: string; lastName: string }): string =>
  `${driver.firstName} ${driver.lastName}`.trim();
