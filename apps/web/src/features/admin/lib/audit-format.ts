import { USER_ROLE_LABELS, type AuditEventDto } from '@rental-admin/shared';

import { formatMoney } from '@/lib/format';

const ENTITY_LABELS: Record<string, string> = {
  User: 'Korisnik',
  Organization: 'Firma',
  Vehicle: 'Vozilo',
  TripBillingDocument: 'Faktura',
  CompanyExpense: 'Trošak',
};

const LOGIN_FAILURE_REASONS: Record<string, string> = {
  INVALID_CREDENTIALS: 'pogrešno korisničko ime ili lozinka',
  USER_INACTIVE: 'nalog je deaktiviran',
  ORGANIZATION_SUSPENDED: 'firma je suspendovana',
};

export interface AuditSubject {
  type: string;
  name: string | null;
  /** Only organizations have a screen a superadmin can open without switching firms. */
  href: string | null;
}

const ROLE_LABELS: Record<string, string> = USER_ROLE_LABELS;

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

const limitText = (value: unknown): string =>
  typeof value === 'number' ? String(value) : 'bez limita';

export const describeAuditSubject = (event: AuditEventDto): AuditSubject => {
  const metadata = event.metadata ?? {};
  const name =
    text(metadata.username) ??
    text(metadata.name) ??
    text(metadata.licensePlate) ??
    text(metadata.documentNumber) ??
    (typeof metadata.amount === 'number' ? formatMoney(metadata.amount) : null);

  return {
    type: ENTITY_LABELS[event.entityType] ?? event.entityType,
    name,
    href:
      event.entityType === 'Organization' &&
      event.entityId &&
      event.action !== 'ORGANIZATION_DELETED'
        ? `/admin/organizations/${event.entityId}`
        : null,
  };
};

/** One line on what changed, for the actions where the name alone does not say it. */
export const describeAuditDetails = (event: AuditEventDto): string | null => {
  const metadata = event.metadata ?? {};

  switch (event.action) {
    case 'LOGIN_FAILED': {
      const reason = text(metadata.reason);

      return reason ? (LOGIN_FAILURE_REASONS[reason] ?? reason) : null;
    }
    case 'USER_ROLE_CHANGED': {
      const from = text(metadata.from);
      const to = text(metadata.to);

      return from && to ? `${ROLE_LABELS[from] ?? from} → ${ROLE_LABELS[to] ?? to}` : null;
    }
    case 'ORGANIZATION_LIMITS_CHANGED': {
      const vehicles = metadata.maxVehicles as { from?: unknown; to?: unknown } | undefined;
      const users = metadata.maxUsers as { from?: unknown; to?: unknown } | undefined;
      const parts: string[] = [];

      if (vehicles && vehicles.from !== vehicles.to) {
        parts.push(`vozila ${limitText(vehicles.from)} → ${limitText(vehicles.to)}`);
      }

      if (users && users.from !== users.to) {
        parts.push(`korisnici ${limitText(users.from)} → ${limitText(users.to)}`);
      }

      return parts.length > 0 ? parts.join(', ') : null;
    }
    default:
      return null;
  }
};
