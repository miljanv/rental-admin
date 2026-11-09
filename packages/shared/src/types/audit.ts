/** Mirrors the `AuditAction` Prisma enum; a test in the API keeps the two equal. */
export const AUDIT_ACTIONS = [
  'LOGIN_SUCCEEDED',
  'LOGIN_FAILED',
  'PASSWORD_CHANGED',
  'USER_CREATED',
  'USER_DELETED',
  'USER_ROLE_CHANGED',
  'USER_ACTIVATED',
  'USER_DEACTIVATED',
  'USER_PASSWORD_RESET',
  'USER_SESSIONS_REVOKED',
  'ORGANIZATION_CREATED',
  'ORGANIZATION_DELETED',
  'ORGANIZATION_LIMITS_CHANGED',
  'ORGANIZATION_SUSPENDED',
  'ORGANIZATION_ACTIVATED',
  'ORGANIZATION_EXPORTED',
  'VEHICLE_CREATED',
  'VEHICLE_DELETED',
  'VEHICLE_ENABLED',
  'VEHICLE_DISABLED',
  'INVOICE_CREATED',
  'EXPENSE_CREATED',
  'EXPENSE_DELETED',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  LOGIN_SUCCEEDED: 'Uspešna prijava',
  LOGIN_FAILED: 'Neuspešna prijava',
  PASSWORD_CHANGED: 'Promena lozinke',
  USER_CREATED: 'Kreiran korisnik',
  USER_DELETED: 'Obrisan korisnik',
  USER_ROLE_CHANGED: 'Promena uloge',
  USER_ACTIVATED: 'Aktiviran korisnik',
  USER_DEACTIVATED: 'Deaktiviran korisnik',
  USER_PASSWORD_RESET: 'Reset lozinke',
  USER_SESSIONS_REVOKED: 'Odjava sa svih uređaja',
  ORGANIZATION_CREATED: 'Kreirana firma',
  ORGANIZATION_DELETED: 'Obrisana firma',
  ORGANIZATION_LIMITS_CHANGED: 'Promena limita',
  ORGANIZATION_SUSPENDED: 'Suspendovana firma',
  ORGANIZATION_ACTIVATED: 'Aktivirana firma',
  ORGANIZATION_EXPORTED: 'Izvezeni podaci firme',
  VEHICLE_CREATED: 'Dodato vozilo',
  VEHICLE_DELETED: 'Obrisano vozilo',
  VEHICLE_ENABLED: 'Aktivirano vozilo',
  VEHICLE_DISABLED: 'Deaktivirano vozilo',
  INVOICE_CREATED: 'Izdata faktura',
  EXPENSE_CREATED: 'Unet trošak',
  EXPENSE_DELETED: 'Obrisan trošak',
};

export const AUDIT_ENTITY_TYPES = [
  'User',
  'Organization',
  'Vehicle',
  'TripBillingDocument',
  'CompanyExpense',
] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

export interface AuditEventDto {
  id: string;
  createdAt: string;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  /** Null for a failed sign-in with an unknown username, or once the user is deleted. */
  actor: { id: string; username: string } | null;
  organization: { id: string; name: string } | null;
  /** What changed, e.g. the username tried or old and new limits. Never secrets. */
  metadata: Record<string, unknown> | null;
  ip: string | null;
}

/** Every action the API writes to the finance log (`recordFinanceAudit`). */
export const FINANCE_AUDIT_ACTIONS = [
  'ALLOCATION_CREATED',
  'ALLOCATION_REVERSED',
  'ALLOCATION_PLAN_CONFIRMED',
  'COUNTERPARTY_LINKED',
  'PAYMENT_DELETED',
  'OPENING_DRAFT_CREATED',
  'OPENING_DRAFT_UPDATED',
  'OPENING_CONFIRMED',
  'OPENING_REVERSED',
] as const;

export type FinanceAuditAction = (typeof FINANCE_AUDIT_ACTIONS)[number];

export const FINANCE_AUDIT_ACTION_LABELS: Record<string, string> = {
  ALLOCATION_CREATED: 'Uplata povezana sa računom',
  ALLOCATION_REVERSED: 'Poništeno povezivanje uplate',
  ALLOCATION_PLAN_CONFIRMED: 'Potvrđen raspored uplate',
  COUNTERPARTY_LINKED: 'Uplata povezana sa strankom',
  PAYMENT_DELETED: 'Obrisana transakcija',
  OPENING_DRAFT_CREATED: 'Kreiran nacrt početnog stanja',
  OPENING_DRAFT_UPDATED: 'Izmenjen nacrt početnog stanja',
  OPENING_CONFIRMED: 'Potvrđeno početno stanje',
  OPENING_REVERSED: 'Stornirano početno stanje',
} satisfies Record<FinanceAuditAction, string>;

/** An entry of the finance log kept by transactions, opening balances and settlements. */
export interface AdminFinanceAuditEventDto {
  id: string;
  createdAt: string;
  action: string;
  entityId: string;
  reason: string | null;
  actor: { id: string; username: string } | null;
  organization: { id: string; name: string };
}
