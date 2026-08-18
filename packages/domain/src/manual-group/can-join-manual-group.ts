import type { UserStatus } from "../user/model.ts";

// Only a validated account may join a manual group, though its memberships can still be removed.
export function canJoinManualGroup(status: UserStatus): boolean {
  return status === "accepted";
}
