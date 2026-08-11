import type { UserSampleRole } from "./model.ts";

export function isSampleEditor(role: UserSampleRole | null): boolean {
  return role === "owner" || role === "editor";
}
