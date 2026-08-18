import type { UserStatus } from "./model.ts";

// Pending is the initial state, so an account keeps it until it is moderated and can never be put back into it.
export function settableUserStatuses(current: UserStatus): UserStatus[] {
  return current === "pending"
    ? ["pending", "accepted", "rejected"]
    : ["accepted", "rejected"];
}
