'use client';

import { Building2 } from 'lucide-react';
import { useEffect } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useOrganizations } from '@/features/admin/hooks/use-organizations';
import { useAuth } from '@/providers/auth-provider';

/** Radix selects cannot hold an empty value, so "no organization" gets a sentinel. */
const NO_ORGANIZATION = '__none__';

/**
 * Header control. A superadmin picks the organization whose data they are
 * working in; everyone else just sees the name of their own.
 */
export function OrganizationSwitcher() {
  const { user, activeOrganizationId, selectOrganization } = useAuth();
  const isSuperadmin = user?.role === 'SUPERADMIN';
  const organizations = useOrganizations({ enabled: isSuperadmin });
  const organizationList = organizations.data;

  // A remembered organization that has since been deleted would make every
  // request fail, so it is dropped as soon as the list shows it is gone.
  useEffect(() => {
    if (!organizationList || !activeOrganizationId) {
      return;
    }

    if (!organizationList.some((organization) => organization.id === activeOrganizationId)) {
      selectOrganization(null);
    }
  }, [organizationList, activeOrganizationId, selectOrganization]);

  if (!user) {
    return null;
  }

  if (!isSuperadmin) {
    return user.organizationName ? (
      <span className="text-muted-foreground hidden items-center gap-2 text-sm sm:flex">
        <Building2 className="size-4" aria-hidden />
        {user.organizationName}
      </span>
    ) : null;
  }

  return (
    <Select
      value={activeOrganizationId ?? NO_ORGANIZATION}
      onValueChange={(value) => selectOrganization(value === NO_ORGANIZATION ? null : value)}
    >
      <SelectTrigger className="w-44 sm:w-56" aria-label="Firma u kojoj radite">
        <Building2 className="text-muted-foreground size-4 shrink-0" aria-hidden />
        <SelectValue placeholder="Izaberite firmu" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NO_ORGANIZATION}>Bez firme</SelectItem>
        {(organizationList ?? []).map((organization) => (
          <SelectItem key={organization.id} value={organization.id}>
            {organization.name}
            {organization.isActive ? '' : ' (neaktivna)'}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
