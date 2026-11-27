'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { portalInputClass } from '@/features/driver-portal/components/portal-ui';
import { usePortalTrips } from '@/features/driver-portal/hooks/use-portal-trips';
import { usePortalVehicles } from '@/features/driver-portal/hooks/use-portal-workplace';
import { cn } from '@/lib/utils';

/** Vehicle of the driver's trip today, offered first in every vehicle picker. */
export const useSuggestedVehicleId = (token: string): string | null => {
  const trips = usePortalTrips(token);

  return trips.data?.today[0]?.vehicles[0]?.id ?? null;
};

interface PortalVehicleSelectProps {
  token: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  invalid?: boolean;
  /** Offer "no vehicle" (a tool that does not travel in one bus). */
  allowNone?: boolean;
}

const NONE = '__none__';

/** The firm's vehicles by plate, today's trip vehicle marked as the suggestion. */
export function PortalVehicleSelect({
  token,
  id,
  value,
  onChange,
  disabled,
  invalid,
  allowNone,
}: PortalVehicleSelectProps) {
  const vehicles = usePortalVehicles(token);
  const suggested = useSuggestedVehicleId(token);

  return (
    <div>
      <Select
        value={value || (allowNone ? NONE : '')}
        onValueChange={(next) => onChange(next === NONE ? '' : next)}
        disabled={disabled || vehicles.isPending}
      >
        <SelectTrigger
          id={id}
          aria-invalid={invalid}
          className={cn(portalInputClass, 'w-full font-semibold')}
        >
          <SelectValue placeholder={vehicles.isPending ? 'Učitavanje…' : 'Izaberite vozilo'} />
        </SelectTrigger>
        <SelectContent>
          {allowNone ? <SelectItem value={NONE}>Bez vozila</SelectItem> : null}
          {(vehicles.data ?? []).map((vehicle) => (
            <SelectItem key={vehicle.id} value={vehicle.id}>
              {vehicle.licensePlate} · {vehicle.make} {vehicle.model}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {suggested && value === suggested ? (
        <p className="text-muted-foreground mt-1.5 text-xs">Predloženo vozilo sa današnje vožnje</p>
      ) : null}
      {vehicles.isError ? (
        <p className="text-destructive mt-1.5 text-xs">Vozila nisu učitana.</p>
      ) : null}
    </div>
  );
}
