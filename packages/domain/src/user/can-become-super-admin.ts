import type { UserStatus } from "./model.ts";

export function canBecomeSuperAdmin(status: UserStatus): boolean {
  return status === "accepted";
}
