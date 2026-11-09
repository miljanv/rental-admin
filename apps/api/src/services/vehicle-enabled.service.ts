import { prisma } from '../config/prisma';
import { vehicleDisabled } from '../utils/app-error';

/**
 * Rejects new work on disabled vehicles. `alreadyLinkedIds` are vehicles the edited record already
 * uses, so an old record that points at a since-disabled vehicle can still be saved.
 */
export const assertVehiclesEnabled = async (
  vehicleIds: readonly string[],
  alreadyLinkedIds: readonly string[] = [],
): Promise<void> => {
  const linked = new Set(alreadyLinkedIds);
  const toCheck = [...new Set(vehicleIds)].filter((id) => !linked.has(id));

  if (toCheck.length === 0) {
    return;
  }

  const disabled = await prisma.vehicle.count({
    where: { id: { in: toCheck }, isEnabled: false },
  });

  if (disabled > 0) {
    throw vehicleDisabled();
  }
};
