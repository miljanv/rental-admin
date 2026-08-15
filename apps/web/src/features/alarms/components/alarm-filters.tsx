'use client';

import {
  ALARM_CATEGORIES,
  ALARM_CATEGORY_LABELS,
  ALARM_KIND_LABELS,
  ALARM_KINDS,
  ALARM_URGENCIES,
  ALARM_URGENCY_LABELS,
  type AlarmCategory,
  type AlarmKind,
  type AlarmUrgency,
} from '@rental-admin/shared';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ALL = 'all';

export interface AlarmFilterState {
  kind: typeof ALL | AlarmKind;
  category: typeof ALL | AlarmCategory;
  urgency: typeof ALL | AlarmUrgency;
  driverId: typeof ALL | string;
  vehicleId: typeof ALL | string;
}

interface AlarmFiltersProps {
  value: AlarmFilterState;
  onChange: (value: AlarmFilterState) => void;
  drivers: Array<{ id: string; label: string }>;
  vehicles: Array<{ id: string; label: string }>;
}

export function AlarmFilters({ value, onChange, drivers, vehicles }: AlarmFiltersProps) {
  const set = <K extends keyof AlarmFilterState>(key: K, next: AlarmFilterState[K]) =>
    onChange({ ...value, [key]: next });

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      <FilterSelect
        id="alarm-urgency"
        label="Hitnost"
        value={value.urgency}
        onChange={(next) => set('urgency', next as AlarmFilterState['urgency'])}
      >
        <SelectItem value={ALL}>Sve</SelectItem>
        {ALARM_URGENCIES.map((urgency) => (
          <SelectItem key={urgency} value={urgency}>
            {ALARM_URGENCY_LABELS[urgency]}
          </SelectItem>
        ))}
      </FilterSelect>

      <FilterSelect
        id="alarm-category"
        label="Oblast"
        value={value.category}
        onChange={(next) => set('category', next as AlarmFilterState['category'])}
      >
        <SelectItem value={ALL}>Vozači i vozila</SelectItem>
        {ALARM_CATEGORIES.map((category) => (
          <SelectItem key={category} value={category}>
            {ALARM_CATEGORY_LABELS[category]}
          </SelectItem>
        ))}
      </FilterSelect>

      <FilterSelect
        id="alarm-kind"
        label="Tip"
        value={value.kind}
        onChange={(next) => set('kind', next as AlarmFilterState['kind'])}
      >
        <SelectItem value={ALL}>Svi tipovi</SelectItem>
        {ALARM_KINDS.map((kind) => (
          <SelectItem key={kind} value={kind}>
            {ALARM_KIND_LABELS[kind]}
          </SelectItem>
        ))}
      </FilterSelect>

      <FilterSelect
        id="alarm-driver"
        label="Vozač"
        value={value.driverId}
        onChange={(next) => set('driverId', next)}
      >
        <SelectItem value={ALL}>Svi vozači</SelectItem>
        {drivers.map((driver) => (
          <SelectItem key={driver.id} value={driver.id}>
            {driver.label}
          </SelectItem>
        ))}
      </FilterSelect>

      <FilterSelect
        id="alarm-vehicle"
        label="Vozilo"
        value={value.vehicleId}
        onChange={(next) => set('vehicleId', next)}
      >
        <SelectItem value={ALL}>Sva vozila</SelectItem>
        {vehicles.map((vehicle) => (
          <SelectItem key={vehicle.id} value={vehicle.id}>
            {vehicle.label}
          </SelectItem>
        ))}
      </FilterSelect>
    </div>
  );
}

interface FilterSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}

function FilterSelect({ id, label, value, onChange, children }: FilterSelectProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  );
}
