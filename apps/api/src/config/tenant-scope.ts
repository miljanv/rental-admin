import { Prisma } from '../generated/prisma/client';
import { organizationRequired } from '../utils/app-error';
import { getTenantContext, type TenantContext } from '../utils/tenant-context';

/**
 * Tenant isolation for every Prisma query that goes through the shared client.
 *
 * Every model falls in exactly one bucket (`schema-coverage.test.ts` fails when
 * a new model is added without picking one):
 *
 * - OWNED: carries its own `organizationId`, filtered directly.
 * - CHILD: has no column of its own; filtered through the relation path to the
 *   nearest owned parent (e.g. a fuel log through its vehicle).
 * - EXEMPT: User and Organization, which are the tenancy model itself.
 *
 * What this does NOT do: it cannot validate foreign keys the caller writes
 * (e.g. `vehicleId` taken from a request body), because the extra lookup could
 * not join an interactive transaction. Services must check those with
 * `assertOwnedByOrganization` before persisting them. Relation `connect` is not
 * used anywhere for the same reason; write scalar foreign keys instead.
 */

export const OWNED_MODELS = [
  'OpeningBalance',
  'FinanceAuditEvent',
  'FileObject',
  'Driver',
  'Vehicle',
  'CompanyExpense',
  'Supplier',
  'SupplierBankAccount',
  'Partner',
  'PartnerBankAccount',
  'Contract',
  'FinanceTransaction',
  'AlarmThreshold',
  'TripSeries',
  'Trip',
] as const;

/** Relation names from a child model up to the owned model that decides its tenant. */
export const CHILD_SCOPE_PATHS: Readonly<Record<string, readonly string[]>> = {
  DriverDocument: ['driver'],
  DriverAbsenceAttestation: ['driver'],
  VehicleInspection: ['vehicle'],
  TachographCalibration: ['vehicle'],
  VehicleSafetyEquipment: ['vehicle'],
  FuelLog: ['vehicle'],
  VehicleMaintenance: ['vehicle'],
  VehicleDocument: ['vehicle'],
  PassengerList: ['contract'],
  Passenger: ['passengerList', 'contract'],
  TravelPermit: ['contract'],
  ContractDocument: ['contract'],
  PaymentAllocation: ['transaction'],
  TripSeriesPause: ['series'],
  TripCashPayment: ['trip'],
  TripVehicle: ['trip'],
  TripDriver: ['trip'],
  TripExpense: ['trip'],
  TripBillingDocument: ['trip'],
};

export const EXEMPT_MODELS = ['User', 'Organization'] as const;

/** Owned models that remember which user created each row. */
export const CREATED_BY_MODELS: ReadonlySet<string> = new Set([
  'OpeningBalance',
  'Driver',
  'Vehicle',
  'CompanyExpense',
  'Supplier',
  'Partner',
  'Contract',
  'FinanceTransaction',
  'Trip',
]);

const OWNED_SET: ReadonlySet<string> = new Set(OWNED_MODELS);
const EXEMPT_SET: ReadonlySet<string> = new Set(EXEMPT_MODELS);

type JsonObject = Record<string, unknown>;

const isObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The `where` fragment that limits `model` to one organization. */
export const buildTenantScope = (model: string, organizationId: string): JsonObject => {
  if (OWNED_SET.has(model)) {
    return { organizationId };
  }

  const path = CHILD_SCOPE_PATHS[model];

  if (!path) {
    throw new Error(`Model ${model} has no tenant policy. Add it to tenant-scope.ts.`);
  }

  return path.reduceRight<JsonObject>((inner, relation) => ({ [relation]: inner }), {
    organizationId,
  });
};

/**
 * Adds the tenant filter next to whatever the caller already filters on. It is
 * AND-ed in (never spread over a key) so a caller's own relation filter is
 * preserved, and unique selectors like `{ id }` stay at the top level.
 */
export const mergeTenantWhere = (where: unknown, scope: JsonObject): JsonObject => {
  const current = isObject(where) ? where : {};
  const existing = current.AND === undefined ? [] : [current.AND].flat();

  return { ...current, AND: [...existing, scope] };
};

const assertSameOrganization = (value: unknown, organizationId: string, model: string): void => {
  if (value !== undefined && value !== organizationId) {
    throw new Error(`Refusing to write ${model} for a different organization.`);
  }
};

const stampOne = (
  model: string,
  row: unknown,
  organizationId: string,
  userId: string | null,
): unknown => {
  if (!isObject(row)) {
    return row;
  }

  assertSameOrganization(row.organizationId, organizationId, model);

  const stamped: JsonObject = { ...row, organizationId };

  if (CREATED_BY_MODELS.has(model) && userId && stamped.createdById === undefined) {
    stamped.createdById = userId;
  }

  return stamped;
};

/** Stamps `organizationId` (and `createdById`) onto create data, single or many. */
export const stampCreateData = (
  model: string,
  data: unknown,
  organizationId: string,
  userId: string | null,
): unknown =>
  Array.isArray(data)
    ? data.map((row) => stampOne(model, row, organizationId, userId))
    : stampOne(model, data, organizationId, userId);

const assertNoOwnerChange = (model: string, data: unknown): void => {
  if (isObject(data) && data.organizationId !== undefined) {
    throw new Error(`Refusing to move ${model} to another organization.`);
  }
};

const WHERE_OPERATIONS: ReadonlySet<string> = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'updateManyAndReturn',
  'delete',
  'deleteMany',
]);

const CREATE_OPERATIONS: ReadonlySet<string> = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
]);

/** Resolves the context a tenant model query runs under, or fails closed. */
const requireTenantContext = (): TenantContext & { organizationId: string } => {
  const context = getTenantContext();

  if (!context?.organizationId) {
    throw organizationRequired();
  }

  return { ...context, organizationId: context.organizationId };
};

/**
 * Applies the tenant policy to one operation's arguments. Exported (and kept
 * free of Prisma types) so the policy can be unit tested without a database.
 */
export const applyTenantPolicy = (
  model: string,
  operation: string,
  args: unknown,
  context: { organizationId: string; userId: string | null },
): JsonObject => {
  const next: JsonObject = isObject(args) ? { ...args } : {};
  const scope = buildTenantScope(model, context.organizationId);
  const owned = OWNED_SET.has(model);

  if (WHERE_OPERATIONS.has(operation)) {
    if ((operation === 'update' || operation === 'updateMany') && owned) {
      assertNoOwnerChange(model, next.data);
    }

    next.where = mergeTenantWhere(next.where, scope);

    return next;
  }

  if (operation === 'upsert') {
    if (owned) {
      assertNoOwnerChange(model, next.update);
      next.create = stampCreateData(model, next.create, context.organizationId, context.userId);
    }

    next.where = mergeTenantWhere(next.where, scope);

    return next;
  }

  if (CREATE_OPERATIONS.has(operation)) {
    // A child row has no organization column; its parent was already checked
    // by the service, and the parent's own tenant stamping covers the rest.
    if (owned) {
      next.data = stampCreateData(model, next.data, context.organizationId, context.userId);
    }

    return next;
  }

  throw new Error(`Operation ${operation} on ${model} is not allowed for tenant data.`);
};

/**
 * Prisma client extension that routes every operation through the policy
 * above. EXEMPT models pass straight through; anything unknown throws.
 */
export const tenantScopeExtension = Prisma.defineExtension({
  name: 'tenant-scope',
  query: {
    $allModels: {
      $allOperations: ({ model, operation, args, query }) => {
        if (EXEMPT_SET.has(model)) {
          return query(args);
        }

        const context = requireTenantContext();

        return query(applyTenantPolicy(model, operation, args, context) as typeof args);
      },
    },
  },
});
