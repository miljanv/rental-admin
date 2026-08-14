import {
  SAFETY_EQUIPMENT_TYPE_LABELS,
  SAFETY_EQUIPMENT_TYPES,
  type SafetyEquipmentType,
  type VehicleSafetyEquipmentDto,
} from '@rental-admin/shared';
import { FireExtinguisher, ShieldPlus } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SafetyEquipmentExpiryBadge } from '@/features/vehicle-safety-equipment/components/safety-equipment-expiry-badge';
import { formatDate } from '@/lib/format';

const TYPE_ICON: Record<SafetyEquipmentType, typeof ShieldPlus> = {
  FIRST_AID_KIT: ShieldPlus,
  FIRE_EXTINGUISHER: FireExtinguisher,
};

interface SafetyEquipmentStatusOverviewProps {
  equipment: VehicleSafetyEquipmentDto[];
  todayIso: string;
}

/** Most recent record per type — the one whose expiry currently matters. */
const latestByType = (
  equipment: VehicleSafetyEquipmentDto[],
  type: SafetyEquipmentType,
): VehicleSafetyEquipmentDto | null => {
  const records = equipment.filter((item) => item.type === type);

  if (records.length === 0) {
    return null;
  }

  return records.reduce((latest, item) => (item.checkedAt > latest.checkedAt ? item : latest));
};

export function SafetyEquipmentStatusOverview({
  equipment,
  todayIso,
}: SafetyEquipmentStatusOverviewProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {SAFETY_EQUIPMENT_TYPES.map((type) => {
        const latest = latestByType(equipment, type);
        const Icon = TYPE_ICON[type];

        return (
          <Card key={type} className="shadow-none">
            <CardHeader className="flex-row items-center gap-3 space-y-0">
              <span className="bg-muted flex size-9 items-center justify-center rounded-full">
                <Icon className="text-muted-foreground size-4" aria-hidden />
              </span>
              <CardTitle className="text-base">{SAFETY_EQUIPMENT_TYPE_LABELS[type]}</CardTitle>
            </CardHeader>
            <CardContent>
              {latest ? (
                <div className="space-y-1.5">
                  <SafetyEquipmentExpiryBadge expiresAt={latest.expiresAt} todayIso={todayIso} />
                  <p className="text-muted-foreground text-xs">
                    Poslednja provera {formatDate(latest.checkedAt)}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Nije evidentirano.</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
