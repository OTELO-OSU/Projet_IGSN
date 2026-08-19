import type { UserSampleRole } from "./model.ts";

export function isSampleOwner(role: UserSampleRole | null): boolean {
  return role === "owner";
}
