import type { ModerationScope } from "./moderation-scope.ts";

// A super admin never revokes their own role, so at least one always remains.
export function canSetSuperAdmin(
  caller: Pick<ModerationScope, "callerId" | "superAdmin">,
  targetId: string,
): boolean {
  return caller.superAdmin && caller.callerId !== targetId;
}
