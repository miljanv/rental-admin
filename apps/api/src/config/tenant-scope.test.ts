import { describe, expect, it } from 'vitest';

import {
  applyTenantPolicy,
  buildTenantScope,
  mergeTenantWhere,
  stampCreateData,
} from './tenant-scope';

const context = { organizationId: 'org-1', userId: 'user-1' };

describe('buildTenantScope', () => {
  it('filters an owned model on its own organization column', () => {
    expect(buildTenantScope('Vehicle', 'org-1')).toEqual({ organizationId: 'org-1' });
  });

  it('filters a child model through its parent', () => {
    expect(buildTenantScope('FuelLog', 'org-1')).toEqual({
      vehicle: { organizationId: 'org-1' },
    });
  });

  it('follows a multi-step relation path to the owner', () => {
    expect(buildTenantScope('Passenger', 'org-1')).toEqual({
      passengerList: { contract: { organizationId: 'org-1' } },
    });
  });

  it('refuses a model that has no tenant policy', () => {
    expect(() => buildTenantScope('SomethingNew', 'org-1')).toThrow(/no tenant policy/);
  });
});

describe('mergeTenantWhere', () => {
  const scope = { organizationId: 'org-1' };

  it('adds the scope when the caller had no filter', () => {
    expect(mergeTenantWhere(undefined, scope)).toEqual({ AND: [scope] });
  });

  it('keeps a unique selector at the top level', () => {
    expect(mergeTenantWhere({ id: 'veh-1' }, scope)).toEqual({ id: 'veh-1', AND: [scope] });
  });

  it('keeps the caller AND filter instead of overwriting it', () => {
    const own = { status: 'ACTIVE' };

    expect(mergeTenantWhere({ AND: own }, scope)).toEqual({ AND: [own, scope] });
    expect(mergeTenantWhere({ AND: [own] }, scope)).toEqual({ AND: [own, scope] });
  });

  it('does not let a caller filter on the same relation name hide the scope', () => {
    const where = { vehicle: { status: 'ACTIVE' } };

    expect(mergeTenantWhere(where, { vehicle: { organizationId: 'org-1' } })).toEqual({
      vehicle: { status: 'ACTIVE' },
      AND: [{ vehicle: { organizationId: 'org-1' } }],
    });
  });

  it('cannot be defeated by a caller OR', () => {
    const merged = mergeTenantWhere({ OR: [{ id: 'a' }, { id: 'b' }] }, scope);

    expect(merged).toEqual({ OR: [{ id: 'a' }, { id: 'b' }], AND: [scope] });
  });
});

describe('stampCreateData', () => {
  it('stamps the organization and the creator on a tracked model', () => {
    expect(stampCreateData('Vehicle', { make: 'MAN' }, 'org-1', 'user-1')).toEqual({
      make: 'MAN',
      organizationId: 'org-1',
      createdById: 'user-1',
    });
  });

  it('does not stamp a creator on a model that does not track one', () => {
    expect(stampCreateData('FileObject', { size: 1 }, 'org-1', 'user-1')).toEqual({
      size: 1,
      organizationId: 'org-1',
    });
  });

  it('skips the creator when there is no user', () => {
    expect(stampCreateData('Vehicle', {}, 'org-1', null)).toEqual({ organizationId: 'org-1' });
  });

  it('stamps every row of a bulk create', () => {
    expect(stampCreateData('Trip', [{ a: 1 }, { a: 2 }], 'org-1', 'user-1')).toEqual([
      { a: 1, organizationId: 'org-1', createdById: 'user-1' },
      { a: 2, organizationId: 'org-1', createdById: 'user-1' },
    ]);
  });

  it('accepts a row that already names the same organization', () => {
    expect(stampCreateData('Vehicle', { organizationId: 'org-1' }, 'org-1', null)).toEqual({
      organizationId: 'org-1',
    });
  });

  it('refuses a row that names a different organization', () => {
    expect(() => stampCreateData('Vehicle', { organizationId: 'org-2' }, 'org-1', null)).toThrow(
      /different organization/,
    );
  });
});

describe('applyTenantPolicy', () => {
  it('scopes a read of an owned model', () => {
    const args = applyTenantPolicy('Vehicle', 'findMany', { where: { status: 'ACTIVE' } }, context);

    expect(args.where).toEqual({
      status: 'ACTIVE',
      AND: [{ organizationId: 'org-1' }],
    });
  });

  it('scopes a read that has no where at all', () => {
    const args = applyTenantPolicy('Vehicle', 'count', undefined, context);

    expect(args.where).toEqual({ AND: [{ organizationId: 'org-1' }] });
  });

  it.each(['findUnique', 'findUniqueOrThrow', 'findFirst', 'aggregate', 'groupBy', 'delete'])(
    'scopes %s',
    (operation) => {
      const args = applyTenantPolicy('Trip', operation, { where: { id: 't-1' } }, context);

      expect(args.where).toEqual({ id: 't-1', AND: [{ organizationId: 'org-1' }] });
    },
  );

  it('scopes bulk writes so they cannot touch another organization', () => {
    for (const operation of ['updateMany', 'deleteMany']) {
      const args = applyTenantPolicy('Driver', operation, { where: {} }, context);

      expect(args.where).toEqual({ AND: [{ organizationId: 'org-1' }] });
    }
  });

  it('scopes a child model through its parent', () => {
    const args = applyTenantPolicy(
      'TripExpense',
      'findMany',
      { where: { tripId: 't-1' } },
      context,
    );

    expect(args.where).toEqual({
      tripId: 't-1',
      AND: [{ trip: { organizationId: 'org-1' } }],
    });
  });

  it('stamps a create of an owned model', () => {
    const args = applyTenantPolicy('Partner', 'create', { data: { city: 'Niš' } }, context);

    expect(args.data).toEqual({ city: 'Niš', organizationId: 'org-1', createdById: 'user-1' });
  });

  it('leaves the data of a child create alone', () => {
    const args = applyTenantPolicy('FuelLog', 'create', { data: { vehicleId: 'v-1' } }, context);

    expect(args.data).toEqual({ vehicleId: 'v-1' });
  });

  it('stamps the create branch of an upsert and scopes its where', () => {
    const args = applyTenantPolicy(
      'AlarmThreshold',
      'upsert',
      {
        where: { organizationId_kind: { organizationId: 'org-1', kind: 'K' } },
        create: {},
        update: {},
      },
      context,
    );

    expect(args.create).toEqual({ organizationId: 'org-1' });
    expect(args.where).toEqual({
      organizationId_kind: { organizationId: 'org-1', kind: 'K' },
      AND: [{ organizationId: 'org-1' }],
    });
  });

  it('refuses to move a row to another organization on update', () => {
    expect(() =>
      applyTenantPolicy(
        'Vehicle',
        'update',
        { where: { id: 'v-1' }, data: { organizationId: 'org-2' } },
        context,
      ),
    ).toThrow(/another organization/);
  });

  it('refuses an operation it does not know how to scope', () => {
    expect(() => applyTenantPolicy('Vehicle', 'findRaw', {}, context)).toThrow(/not allowed/);
  });

  it('does not mutate the caller arguments', () => {
    const args = { where: { id: 'v-1' } };

    applyTenantPolicy('Vehicle', 'findUnique', args, context);

    expect(args).toEqual({ where: { id: 'v-1' } });
  });
});
