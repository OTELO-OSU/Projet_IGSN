import type { ManagedGroups } from "./managed-groups.ts";

export function isSpaceManager(groups: ManagedGroups): boolean {
  return Object.values(groups).some((managed) => managed.length > 0);
}
