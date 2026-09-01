import type { ExistenceStatus } from "./existence-status.ts";

import {
  type AvailabilityStatus,
  AVAILABILITY_STATUSES,
} from "./availability-status.ts";

export function allowedAvailabilityStatuses(
  existenceStatus: ExistenceStatus | null | undefined,
): readonly AvailabilityStatus[] {
  switch (existenceStatus) {
    case "consumed":
    case "destroyed":
    case "lost":
      return ["not_available"];
    case "unknown":
      return ["unknown"];
    default:
      return AVAILABILITY_STATUSES;
  }
}
