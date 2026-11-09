import type { AuditEventDto } from '@rental-admin/shared';
import { describe, expect, it } from 'vitest';

import { describeAuditDetails, describeAuditSubject } from './audit-format';

const event = (overrides: Partial<AuditEventDto>): AuditEventDto => ({
  id: 'evt-1',
  createdAt: '2026-11-09T10:00:00.000Z',
  action: 'VEHICLE_CREATED',
  entityType: 'Vehicle',
  entityId: 'veh-1',
  actor: null,
  organization: null,
  metadata: null,
  ip: null,
  ...overrides,
});

describe('describeAuditSubject', () => {
  it('names the object from what was logged', () => {
    expect(describeAuditSubject(event({ metadata: { licensePlate: 'BG-001-AA' } }))).toEqual({
      type: 'Vozilo',
      name: 'BG-001-AA',
      href: null,
    });
  });

  it('links an organization unless it was deleted', () => {
    const organization = {
      entityType: 'Organization',
      entityId: 'org-1',
      metadata: { name: 'Bus' },
    };

    expect(
      describeAuditSubject(event({ ...organization, action: 'ORGANIZATION_SUSPENDED' })).href,
    ).toBe('/admin/organizations/org-1');
    expect(
      describeAuditSubject(event({ ...organization, action: 'ORGANIZATION_DELETED' })).href,
    ).toBeNull();
  });
});

describe('describeAuditDetails', () => {
  it('explains a failed sign-in', () => {
    expect(
      describeAuditDetails(
        event({ action: 'LOGIN_FAILED', metadata: { reason: 'ORGANIZATION_SUSPENDED' } }),
      ),
    ).toBe('firma je suspendovana');
  });

  it('lists only the limits that changed', () => {
    expect(
      describeAuditDetails(
        event({
          action: 'ORGANIZATION_LIMITS_CHANGED',
          metadata: { maxVehicles: { from: null, to: 10 }, maxUsers: { from: 3, to: 3 } },
        }),
      ),
    ).toBe('vozila bez limita → 10');
  });

  it('shows a role change', () => {
    expect(
      describeAuditDetails(
        event({ action: 'USER_ROLE_CHANGED', metadata: { from: 'USER', to: 'SUPERADMIN' } }),
      ),
    ).toBe('Korisnik → Superadmin');
  });
});
