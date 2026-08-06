import type { User } from "./model.ts";

export function canPublishSamples(
  user: Pick<User, "status" | "superAdmin">,
): boolean {
  return user.superAdmin || user.status === "accepted";
}
