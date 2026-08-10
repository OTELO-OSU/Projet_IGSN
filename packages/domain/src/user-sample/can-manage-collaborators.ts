import type { UserSampleRole } from "./model.ts";

export function canManageCollaborators(role: UserSampleRole | null): boolean {
  return role === "owner";
}
